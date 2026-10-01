import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Sqlight } from '../src/index';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('Migrator API', () => {
  let db: Sqlight;
  const testMigrationsDir = join(process.cwd(), 'tmp_test_migrations');

  beforeEach(() => {
    db = new Sqlight(':memory:');
    mkdirSync(testMigrationsDir, { recursive: true });
  });

  afterEach(() => {
    db.close();
    rmSync(testMigrationsDir, { recursive: true, force: true });
  });

  test('Should initialize migrations table and report empty status', async () => {
    const statuses = await db.migrate.status(testMigrationsDir);
    expect(statuses).toHaveLength(0);

    const applied = await db.migrate.getAppliedMigrations();
    expect(applied).toHaveLength(0);
  });

  test('Should execute pending migrations with up() and update status', async () => {
    // Create migration 1
    const file1 = join(testMigrationsDir, '001_create_posts.ts');
    writeFileSync(
      file1,
      `
      export function up(db) {
        db.createTable('posts', (t) => {
          t.id();
          t.string('title');
        });
      }
      export function down(db) {
        db.dropTable('posts');
      }
    `
    );

    // Create migration 2
    const file2 = join(testMigrationsDir, '002_create_comments.ts');
    writeFileSync(
      file2,
      `
      export function up(db) {
        db.createTable('comments', (t) => {
          t.id();
          t.string('body');
        });
      }
      export function down(db) {
        db.dropTable('comments');
      }
    `
    );

    const pendingBefore = await db.migrate.getPendingMigrations(testMigrationsDir);
    expect(pendingBefore).toHaveLength(2);

    const executed = await db.migrate.up(testMigrationsDir);
    expect(executed).toHaveLength(2);

    // Verify tables exist
    db.table('posts').create({ title: 'First Post' });
    expect(db.table('posts').count()).toBe(1);

    db.table('comments').create({ body: 'Nice post' });
    expect(db.table('comments').count()).toBe(1);

    const pendingAfter = await db.migrate.getPendingMigrations(testMigrationsDir);
    expect(pendingAfter).toHaveLength(0);

    const statuses = await db.migrate.status(testMigrationsDir);
    expect(statuses.every((s) => s.applied)).toBe(true);
  });

  test('Should rollback the last migration batch with rollback()', async () => {
    const file = join(testMigrationsDir, '001_create_tags.ts');
    writeFileSync(
      file,
      `
      export function up(db) {
        db.createTable('tags', (t) => {
          t.id();
          t.string('name');
        });
      }
      export function down(db) {
        db.dropTable('tags');
      }
    `
    );

    await db.migrate.up(testMigrationsDir);
    expect(db.table('tags').count()).toBe(0);

    const rolledBack = await db.migrate.rollback(testMigrationsDir);
    expect(rolledBack).toHaveLength(1);
    expect(rolledBack[0]).toBe('001_create_tags.ts');

    const statuses = await db.migrate.status(testMigrationsDir);
    expect(statuses[0].applied).toBe(false);
  });

  test('Should create a boilerplate migration file with create()', () => {
    const filePath = db.migrate.create('add_categories', testMigrationsDir);
    expect(filePath).toContain('add_categories.ts');
    const files = db.migrate.getMigrationFiles(testMigrationsDir);
    expect(files.some((f) => f.includes('add_categories'))).toBe(true);
  });
});
