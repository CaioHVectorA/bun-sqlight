import { rmSync } from 'fs';
import { Database } from '../../lib/connect';
import type { QueryBuilder } from '../../lib/query-builder';
const DB_NAME = 'playground.db';
const DIR = __dirname.replaceAll('utils', '') + `db/${DB_NAME}`;
export function setupDb() {
  rmSync(DIR, { recursive: true, force: true });
  const db = new Database(DIR) as QueryBuilder;
  return db;
}
