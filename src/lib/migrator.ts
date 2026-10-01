import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import type { DatabaseManager } from './db-manager';
import { SqlightMigrationError } from './errors';

export interface MigrationRecord {
  id: number;
  name: string;
  batch: number;
  applied_at: string;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  batch?: number;
  applied_at?: string;
}

export interface MigrationFile {
  up: (db: DatabaseManager<any, any>) => void | Promise<void>;
  down?: (db: DatabaseManager<any, any>) => void | Promise<void>;
}

export class Migrator {
  private tableName = '_sqlight_migrations';

  constructor(private dbManager: DatabaseManager<any, any>) {}

  /**
   * Initializes the migrations table if it doesn't already exist.
   */
  async init(): Promise<void> {
    try {
      this.dbManager.db.exec(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          batch INTEGER NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err: any) {
      throw new SqlightMigrationError(`Failed to initialize migrations table: ${err?.message || err}`);
    }
  }

  /**
   * Returns all applied migration records ordered by ID ascending.
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.init();
    try {
      return this.dbManager.db
        .query(`SELECT id, name, batch, applied_at FROM ${this.tableName} ORDER BY id ASC`)
        .all() as MigrationRecord[];
    } catch {
      return [];
    }
  }

  /**
   * Discovers all migration files in the target directory.
   */
  getMigrationFiles(dir = './migrations'): string[] {
    const targetDir = resolve(dir);
    if (!existsSync(targetDir)) {
      return [];
    }

    return readdirSync(targetDir)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();
  }

  /**
   * Returns a list of migration files that have not yet been applied.
   */
  async getPendingMigrations(dir = './migrations'): Promise<string[]> {
    const applied = await this.getAppliedMigrations();
    const appliedNames = new Set(applied.map((m) => m.name));
    const allFiles = this.getMigrationFiles(dir);

    return allFiles.filter((file) => !appliedNames.has(file));
  }

  /**
   * Executes all pending migrations.
   * Returns an array of the names of the applied migrations.
   */
  async up(dir = './migrations'): Promise<string[]> {
    await this.init();
    const pending = await this.getPendingMigrations(dir);
    if (pending.length === 0) {
      return [];
    }

    const applied = await this.getAppliedMigrations();
    const currentMaxBatch = applied.reduce((max, m) => Math.max(max, m.batch), 0);
    const newBatch = currentMaxBatch + 1;

    const targetDir = resolve(dir);
    const executed: string[] = [];

    for (const file of pending) {
      const filePath = join(targetDir, file);
      try {
        const mod = await import(filePath);
        const upFn = mod.up || (typeof mod.default === 'function' ? mod.default : mod.default?.up);

        if (!upFn) {
          throw new Error(`Migration file "${file}" does not export an "up" function`);
        }

        await upFn(this.dbManager);

        this.dbManager.db
          .query(`INSERT INTO ${this.tableName} (name, batch) VALUES ($name, $batch)`)
          .run({ $name: file, $batch: newBatch });

        executed.push(file);
      } catch (err: any) {
        throw new SqlightMigrationError(
          `Migration failed executing "${file}": ${err?.message || err}`
        );
      }
    }

    return executed;
  }

  /**
   * Rolls back the most recently applied batch of migrations.
   * Returns an array of rolled-back migration names.
   */
  async rollback(dir = './migrations'): Promise<string[]> {
    await this.init();
    const applied = await this.getAppliedMigrations();
    if (applied.length === 0) {
      return [];
    }

    const maxBatch = applied.reduce((max, m) => Math.max(max, m.batch), 0);
    const batchToRollback = applied.filter((m) => m.batch === maxBatch).reverse();

    const targetDir = resolve(dir);
    const rolledBack: string[] = [];

    for (const record of batchToRollback) {
      const filePath = join(targetDir, record.name);
      try {
        if (existsSync(filePath)) {
          const mod = await import(filePath);
          const downFn = mod.down || mod.default?.down;
          if (downFn) {
            await downFn(this.dbManager);
          }
        }

        this.dbManager.db
          .query(`DELETE FROM ${this.tableName} WHERE id = $id`)
          .run({ $id: record.id });

        rolledBack.push(record.name);
      } catch (err: any) {
        throw new SqlightMigrationError(
          `Rollback failed for "${record.name}": ${err?.message || err}`
        );
      }
    }

    return rolledBack;
  }

  /**
   * Returns the complete status of all discovered migrations.
   */
  async status(dir = './migrations'): Promise<MigrationStatus[]> {
    await this.init();
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map((m) => [m.name, m]));
    const allFiles = this.getMigrationFiles(dir);

    return allFiles.map((file) => {
      const record = appliedMap.get(file);
      return {
        name: file,
        applied: !!record,
        batch: record?.batch,
        applied_at: record?.applied_at,
      };
    });
  }

  /**
   * Creates a new migration file boilerplate with timestamp.
   */
  create(name: string, dir = './migrations'): string {
    const targetDir = resolve(dir);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    const fileName = `${timestamp}_${sanitizedName}.ts`;
    const filePath = join(targetDir, fileName);

    const template = `import type { DatabaseManager } from 'bun-sqlight';

export async function up(db: DatabaseManager<any, any>) {
  // Define migration changes:
  // db.createTable('example', (t) => {
  //   t.id();
  //   t.string('name');
  //   t.timestamps();
  // });
}

export async function down(db: DatabaseManager<any, any>) {
  // Revert migration changes:
  // db.dropTable('example');
}
`;

    writeFileSync(filePath, template, 'utf-8');
    return filePath;
  }
}
