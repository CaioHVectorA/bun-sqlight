import { DatabaseManager } from '../lib/db-manager';
import { QueryBuilder } from './query-builder';
import { SqlightBaseDatabase as db } from './database';
export class Sqlight extends DatabaseManager {
  constructor(filename: string = ':memory:') {
    super(new QueryBuilder(), new db(filename));
    // const dbManager = new DatabaseManager(new QueryBuilder(), new db(filename));
    // return dbManager;
  }
}
