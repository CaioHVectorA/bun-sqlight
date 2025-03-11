import { Database } from 'bun:sqlite';
import { QueryBuilder } from './query-builder';
import { MetricTimer } from '../utils/metric-timer';
import type { Hooks } from './hooks';
import { validateSQLQuery } from './analyze-is-malicious';
import { Comparison } from './query-builder';
import type { Tables } from './table';
import type { TypeTables } from './query-builder';
import type { TableNames } from './query-builder';
import type { Schema } from './schema';

export class DatabaseManager {
  private builder: QueryBuilder;
  private db: Database;
  hooks: Hooks = {
    afterInsert: [],
    afterUpdate: [],
    beforeInsert: [],
    beforeUpdate: [],
    beforeSelect: [],
    afterSelect: [],
  };

  constructor(builder: QueryBuilder, db: Database) {
    this.builder = builder;
    this.db = db;
    this.builder.db = this;
  }

  static getDb(db: string) {
    return new Database(db);
  }

  close() {
    this.db.close();
  }

  raw(query: string) {
    validateSQLQuery(query);
    return this.db.query(query).all();
  }

  // Explicitly defined QueryBuilder methods

  select<T extends TableNames>(...fields: (keyof TypeTables[T]['select'] | '*')[]): this {
    this.builder.select(...fields);
    return this;
  }

  from<T extends TableNames>(table: T): this {
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

  dropTable<T extends TableNames>(table: T): this {
    const query = this.builder.dropTable(table).run();
    console.log(`Running query: \n ${query}`);
    validateSQLQuery(query);
    this.db.exec(query);
    this.builder.queryBrute = undefined;
    return this;
  }

  createTable(
    table: string,
    fields: { [key: string]: string } | ((schema: Schema) => void),
    options: { exists?: boolean } = { exists: true }
  ): this {
    const query = this.builder.createTable(table, fields, options).run();
    console.log(`Running query: \n ${query}`);
    validateSQLQuery(query);
    this.db.exec(query);
    this.builder.queryBrute = undefined;
    return this;
  }

  insert<T extends TableNames>(table: T, data: TypeTables[T]['insert']): this {
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

  update<T extends TableNames>(table: T, data: TypeTables[T]['update']): this {
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
