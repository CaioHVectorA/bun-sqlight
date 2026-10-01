import { DatabaseManager, type SqlightOptions } from '../lib/db-manager';
import { QueryBuilder, type TableSchemaShape } from './query-builder';
import { SqlightBaseDatabase as db } from './database';
import type { TableNames as DefaultTableNames, TypeTables as DefaultTypeTables } from '../table-types';

export class Sqlight<
  TypeTablesSchema extends Record<keyof TypeTablesSchema, TableSchemaShape> = DefaultTypeTables,
  TableNamesSchema extends keyof TypeTablesSchema & string = keyof TypeTablesSchema & string
> extends DatabaseManager<TypeTablesSchema, TableNamesSchema> {
  constructor(filename: string = ':memory:', options?: SqlightOptions) {
    super(new QueryBuilder<TypeTablesSchema, TableNamesSchema>(), new db(filename), options);
  }
}

export { Sqlight as BunSqlight };
