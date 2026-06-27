import { Database } from 'bun:sqlite';
import { QueryBuilder } from './query-builder';
import { MetricTimer } from '../utils/metric-timer';
import type { Hooks } from './hooks';
import { validateSQLQuery } from './analyze-is-malicious';
import { Comparison, type TableSchemaShape } from './query-builder';
import type { Tables } from './table';
import type { Schema } from './schema';
import type { TableNames as DefaultTableNames, TypeTables as DefaultTypeTables } from '../table-types';

export interface SqlightOptions {
  typesOutputFile?: string;
}

export class DatabaseManager<
  TypeTablesSchema extends Record<keyof TypeTablesSchema, TableSchemaShape> = DefaultTypeTables,
  TableNamesSchema extends keyof TypeTablesSchema & string = keyof TypeTablesSchema & string
> {
  public builder: QueryBuilder<TypeTablesSchema, TableNamesSchema>;
  public db: Database;
  public options?: SqlightOptions;
  hooks: Hooks = {
    afterInsert: [],
    afterUpdate: [],
    beforeInsert: [],
    beforeUpdate: [],
    beforeSelect: [],
    afterSelect: [],
  };

  constructor(
    builder: QueryBuilder<TypeTablesSchema, TableNamesSchema>,
    db: Database,
    options?: SqlightOptions
  ) {
    this.builder = builder;
    this.db = db;
    this.options = options;
    this.builder.db = this as any;
  }

  static getDb(db: string) {
    return new Database(db);
  }

  close() {
    this.db.close();
  }

  raw<T = any>(query: string): T[] {
    validateSQLQuery(query);
    return this.db.query(query).all() as T[];
  }

  // Explicitly defined QueryBuilder methods

  select<T extends TableNamesSchema>(...fields: (keyof TypeTablesSchema[T]['select'] | '*')[]): this {
    this.builder.select(...fields);
    return this;
  }

  from<T extends TableNamesSchema>(table: T): this {
    this.builder.from(table);
    return this;
  }

  where(field: string, valueOrComparison: any, value?: any): this {
    // Handle hook processing for select
    const beforeSelectCallbacks = this.hooks.beforeSelect.filter((action) => !!action[field]).map((action) => action[field]);

    beforeSelectCallbacks.forEach((callback) => {
      callback(this.builder.actualQuery);
    });

    this.builder.where(field, valueOrComparison, value);
    return this;
  }

  orWhere(field: string, valueOrComparison: any, value?: any): this {
    this.builder.orWhere(field, valueOrComparison, value);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC'): this {
    this.builder.orderBy(field, direction);
    return this;
  }

  limit(limit: number): this {
    this.builder.limit(limit);
    return this;
  }

  dropTable<T extends TableNamesSchema>(table: T): this {
    const query = this.builder.dropTable(table).run();
    console.log(`Running query: \n ${query}`);
    validateSQLQuery(query);
    this.db.exec(query);
    this.builder.queryBrute = undefined;
    return this;
  }

  createTable(
    table: string,
    fields: { [key: string]: any } | ((schema: Schema) => void),
    options: { exists?: boolean } = { exists: true }
  ): this {
    const query = this.builder.createTable(table, fields, options).run();
    console.log(`Running query: \n ${query}`);
    validateSQLQuery(query);
    this.db.exec(query);
    this.builder.queryBrute = undefined;
    return this;
  }

  insert<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['insert']): this {
    // Process before insert hooks
    this.builder.insert(table, data);
    const callbacks = this.hooks.beforeInsert.filter((action) => !!action[table]).map((action) => action[table]);
    callbacks.forEach((callback) => {
      callback(this.builder.actualQuery);
    });

    // const query = this.builder.run();
    // console.log(`Running query: \n ${query}`);
    // validateSQLQuery(query);
    // this.db.query(query).all();
    return this;
  }

  update<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['update']): this {
    // Process before update hooks
    this.builder.update(table, data);
    const callbacks = this.hooks.beforeUpdate.filter((action) => !!action[table]).map((action) => action[table]);
    callbacks.forEach((callback) => {
      callback(this.builder.actualQuery);
    });

    // const query = this.builder.run();
    // console.log(`Running query: \n ${query}`);
    // validateSQLQuery(query);
    // this.db.query(query).all();
    return this;
  }

  delete(table: string): this {
    this.builder.delete(table);
    // const query = this.builder.run();
    // console.log(`Running query: \n ${query}`);
    // validateSQLQuery(query);
    // this.db.query(query).all();
    return this;
  }

  offset(offset: number): this {
    this.builder.offset(offset);
    return this;
  }

  join(
    target: `${string}.${string}`,
    reference: `${string}.${string}`,
    options: {
      type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
      comparison?: Comparison | '!=' | '>' | '<' | '>=' | '<=' | '=';
      alias?: Record<string, string>;
    } = { comparison: '=', type: 'INNER' }
  ): this {
    this.builder.join(target, reference, options);
    return this;
  }

  run() {
    console.log({ query: this.builder.actualQuery });
    const query = this.builder.run();
    console.log(`Running query: \n ${query}`);
    validateSQLQuery(query);
    return this.db.query(query).all();
  }
}
