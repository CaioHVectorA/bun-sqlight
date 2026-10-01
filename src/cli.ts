#!/usr/bin/env bun
import { resolve } from 'path';
import { Sqlight } from './lib/connect';
import { Migrator } from './lib/migrator';

function showHelp() {
  console.log(`
Bun Sqlight CLI

Usage:
  bun-sqlight <command> [options]

Commands:
  generate <schema-file> [output-file]   Executes schema file to generate TS declarations
  migrate [migrations-dir]               Runs all pending migrations
  migrate:rollback [migrations-dir]      Rolls back the last batch of migrations
  migrate:status [migrations-dir]        Shows status of all migrations
  migrate:create <name> [dir]            Creates a new timestamped migration file
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  // Database path from environment or default
  const dbPath = process.env.SQLIGHT_DB_PATH || 'sqlite.db';

  switch (command) {
    case 'generate': {
      const schemaFile = args[1];
      const outputFile = args[2];

      if (!schemaFile) {
        console.error('Error: Please specify a schema file. Usage: bun-sqlight generate <schema-file> [output-file]');
        process.exit(1);
      }

      if (outputFile) {
        process.env.SQLIGHT_GENERATE_PATH = resolve(outputFile);
      }

      const absoluteSchemaPath = resolve(schemaFile);
      console.log(`[Sqlight] Loading schema from: ${absoluteSchemaPath}`);

      try {
        await import(absoluteSchemaPath);
        console.log('[Sqlight] Types generated successfully!');
      } catch (err) {
        console.error('[Sqlight] Failed to generate types:', err);
        process.exit(1);
      }
      break;
    }

    case 'migrate': {
      const migrationsDir = args[1] || './migrations';
      console.log(`[Sqlight] Connecting to database: ${dbPath}`);
      const db = new Sqlight(dbPath);
      console.log(`[Sqlight] Running pending migrations from: ${migrationsDir}`);

      try {
        const executed = await db.migrate.up(migrationsDir);
        if (executed.length === 0) {
          console.log('[Sqlight] No pending migrations to execute.');
        } else {
          console.log(`[Sqlight] Successfully executed ${executed.length} migration(s):`);
          executed.forEach((file) => console.log(`  ✓ ${file}`));
        }
      } catch (err: any) {
        console.error('[Sqlight] Migration failed:', err?.message || err);
        process.exit(1);
      } finally {
        db.close();
      }
      break;
    }

    case 'migrate:rollback': {
      const migrationsDir = args[1] || './migrations';
      const db = new Sqlight(dbPath);
      console.log(`[Sqlight] Rolling back last migration batch...`);

      try {
        const rolledBack = await db.migrate.rollback(migrationsDir);
        if (rolledBack.length === 0) {
          console.log('[Sqlight] No migrations to roll back.');
        } else {
          console.log(`[Sqlight] Successfully rolled back ${rolledBack.length} migration(s):`);
          rolledBack.forEach((file) => console.log(`  ⤾ ${file}`));
        }
      } catch (err: any) {
        console.error('[Sqlight] Rollback failed:', err?.message || err);
        process.exit(1);
      } finally {
        db.close();
      }
      break;
    }

    case 'migrate:status': {
      const migrationsDir = args[1] || './migrations';
      const db = new Sqlight(dbPath);

      try {
        const statuses = await db.migrate.status(migrationsDir);
        console.log(`[Sqlight] Migration status (${migrationsDir}):`);
        if (statuses.length === 0) {
          console.log('  No migration files found.');
        } else {
          statuses.forEach((s) => {
            const badge = s.applied ? `[APPLIED (batch ${s.batch})]` : '[PENDING]';
            console.log(`  ${badge.padEnd(20)} ${s.name}`);
          });
        }
      } catch (err: any) {
        console.error('[Sqlight] Failed to get migration status:', err?.message || err);
        process.exit(1);
      } finally {
        db.close();
      }
      break;
    }

    case 'migrate:create': {
      const name = args[1];
      const dir = args[2] || './migrations';

      if (!name) {
        console.error('Error: Please provide a migration name. Usage: bun-sqlight migrate:create <name> [dir]');
        process.exit(1);
      }

      const migrator = new Migrator(new Sqlight(':memory:'));
      const filePath = migrator.create(name, dir);
      console.log(`[Sqlight] Created migration file: ${filePath}`);
      break;
    }

    default:
      console.error(`Unknown command: "${command}"\n`);
      showHelp();
      process.exit(1);
  }
}

main();
