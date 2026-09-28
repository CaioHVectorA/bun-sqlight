import { DatabaseManager } from '../lib/db-manager';
import { QueryBuilder } from './query-builder';
import { SqlightBaseDatabase as db } from './database';

export class Sqlight extends DatabaseManager {
  constructor(filename: string = ':memory:') {
    super(new QueryBuilder(), new db(filename));
  }
}

export { Sqlight as BunSqlight, Sqlight as Database, DatabaseManager };
