import { DatabaseManager } from '../lib/db-manager';
import { QueryBuilder } from './query-builder';
import { Database as db } from './database';
export class Database {
  constructor(filename: string = ':memory:') {
    const dbManager = new DatabaseManager(new QueryBuilder(), new db(filename));
    return dbManager;
  }
}
