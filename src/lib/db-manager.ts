import { Database } from 'bun:sqlite';
import { QueryBuilder, Comparison, QueryLevel, type TableSchemaShape, type JoinOptions, type AnyTableName } from './query-builder';
import type { Hooks } from './hooks';
import { validateSQLQuery } from './analyze-is-malicious';
import type { Schema } from './schema';
import type { TableNames as DefaultTableNames, TypeTables as DefaultTypeTables } from '../table-types';
import { TableRepository } from './table-repository';
import { Transaction } from './transaction';
import { Migrator } from './migrator';
import { SqlightQueryError } from './errors';

export interface QueryLog {
  query: string;
  durationMs: number;
  timestamp: Date;
  type?: string;
}

export type QueryLogger = boolean | ((log: QueryLog) => void);

export interface SqlightOptions {
  typesOutputFile?: string;
  logger?: QueryLogger;
  safeMode?: boolean;
}

export class DatabaseManager<
  TypeTablesSchema extends Record<keyof TypeTablesSchema, TableSchemaShape> = DefaultTypeTables,
  TableNamesSchema extends keyof TypeTablesSchema & string = keyof TypeTablesSchema & string
> {
  public builder: QueryBuilder<TypeTablesSchema, TableNamesSchema>;
  public db: Database;
  public options?: SqlightOptions;
  public migrate: Migrator;

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
    this.options = { safeMode: true, ...options };
    this.builder.db = this as any;
    this.migrate = new Migrator(this);
  }

  static getDb(db: string) {
    return new Database(db);
  }

  close() {
    this.db.close();
  }

  private logQuery(query: string, durationMs: number, type = 'RAW'): void {
    if (!this.options?.logger) return;

    const log: QueryLog = {
      query,
      durationMs,
      timestamp: new Date(),
      type,
    };

    if (typeof this.options.logger === 'function') {
      this.options.logger(log);
    } else if (this.options.logger === true) {
      console.log(`[Sqlight] (${durationMs.toFixed(2)}ms) ${query}`);
    }
  }

  raw<T = any>(query: string, params?: any): T[] {
    validateSQLQuery(query, { allowUnsafeWhere: !this.options?.safeMode });
    const startTime = performance.now();
    try {
      const stmt = this.db.query(query);
      const res = params ? (stmt.all(params) as T[]) : (stmt.all() as T[]);
      const durationMs = performance.now() - startTime;
      this.logQuery(query, durationMs, 'RAW');
      return res;
    } catch (err: any) {
      throw new SqlightQueryError(err?.message || String(err), query);
    }
  }

  /**
   * Returns a typed TableRepository (ORM Model) for the given table.
   */
  table<TSelect = any, TInsert = Record<string, any>, TUpdate = Partial<TInsert>>(
    table: string | TableNamesSchema | (string & {})
  ): TableRepository<TSelect, TInsert, TUpdate> {
    return new TableRepository<TSelect, TInsert, TUpdate>(table as string, this);
  }

  /**
   * Alias for table().
   */
  model<TSelect = any, TInsert = Record<string, any>, TUpdate = Partial<TInsert>>(
    table: string | TableNamesSchema | (string & {})
  ): TableRepository<TSelect, TInsert, TUpdate> {
    return this.table<TSelect, TInsert, TUpdate>(table);
  }

  /**
   * Execute operations within a database transaction.
   * Automatically commits on success and rolls back on error.
   */
  transaction<T>(
    callback: (trx: DatabaseManager<TypeTablesSchema, TableNamesSchema>) => Promise<T> | T
  ): Promise<T> | T {
    const trx = new Transaction(this);
    try {
      const result = callback(this);
      if (result instanceof Promise) {
        return result
          .then((val) => {
            trx.commit();
            return val;
          })
          .catch((err) => {
            trx.rollback();
            throw err;
          }) as Promise<T>;
      }
      trx.commit();
      return result;
    } catch (err) {
      trx.rollback();
      throw err;
    }
  }

  /**
   * Begin a manual transaction.
   */
  beginTransaction(): Transaction {
    return new Transaction(this);
  }

  public bypassSafeWhere = false;

  /**
   * Temporarily bypass safeMode checks (e.g., allowing UPDATE or DELETE without WHERE).
   */
  allowAll(): this {
    this.bypassSafeWhere = true;
    this.builder.allowAll();
    return this;
  }

  // QueryBuilder proxy methods

  select<T extends string = any>(
    ...fields: (string | '*' | (string | '*')[])[]
  ): this {
    this.builder.select(...fields);
    return this;
  }

  from<T extends string = any>(table: T | AnyTableName<TableNamesSchema>): this {
    this.builder.from(table);
    return this;
  }

  where(field: string | Record<string, any>, valueOrComparison?: any, value?: any): this {
    if (typeof field === 'string') {
      const beforeSelectCallbacks = this.hooks.beforeSelect
        .filter((action) => !!action[field])
        .map((action) => action[field]);

      beforeSelectCallbacks.forEach((callback) => {
        callback(this.builder.actualQuery);
      });
    }

    this.builder.where(field, valueOrComparison, value);
    return this;
  }

  orWhere(field: string, valueOrComparison?: any, value?: any): this {
    this.builder.orWhere(field, valueOrComparison, value);
    return this;
  }

  whereIn(field: string, values: any[]): this {
    this.builder.whereIn(field, values);
    return this;
  }

  whereNull(field: string): this {
    this.builder.whereNull(field);
    return this;
  }

  whereNotNull(field: string): this {
    this.builder.whereNotNull(field);
    return this;
  }

  groupBy(...fields: string[]): this {
    this.builder.groupBy(...fields);
    return this;
  }

  having(condition: string): this {
    this.builder.having(condition);
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

  offset(offset: number): this {
    this.builder.offset(offset);
    return this;
  }

  dropTable<T extends string = any>(table: T | AnyTableName<TableNamesSchema>): this {
    const query = this.builder.dropTable(table).run();
    validateSQLQuery(query, { allowUnsafeWhere: !this.options?.safeMode });
    const startTime = performance.now();
    this.db.exec(query);
    this.logQuery(query, performance.now() - startTime, 'SCHEMA');
    this.builder.queryBrute = undefined;
    return this;
  }

  createTable(
    table: string,
    fields: { [key: string]: any } | ((schema: Schema) => void),
    options: { exists?: boolean } = { exists: true }
  ): this {
    const query = this.builder.createTable(table, fields, options).run();
    validateSQLQuery(query, { allowUnsafeWhere: !this.options?.safeMode });
    const startTime = performance.now();
    this.db.exec(query);
    this.logQuery(query, performance.now() - startTime, 'SCHEMA');
    this.builder.queryBrute = undefined;
    return this;
  }

  insert<T extends string = any>(
    table: T | AnyTableName<TableNamesSchema>,
    data: any
  ): this {
    this.builder.insert(table, data);
    const callbacks = this.hooks.beforeInsert
      .filter((action) => !!action[table as string])
      .map((action) => action[table as string]);
    callbacks.forEach((callback) => {
      callback(this.builder.actualQuery);
    });
    return this;
  }

  update<T extends string = any>(table: T | AnyTableName<TableNamesSchema>, data: any): this {
    this.builder.update(table, data);
    const callbacks = this.hooks.beforeUpdate
      .filter((action) => !!action[table as string])
      .map((action) => action[table as string]);
    callbacks.forEach((callback) => {
      callback(this.builder.actualQuery);
    });
    return this;
  }

  delete(table: string): this {
    this.builder.delete(table);
    return this;
  }

  join(
    target: `${string}.${string}`,
    reference: `${string}.${string}`,
    options: JoinOptions = { comparison: '=', type: 'INNER' }
  ): this {
    this.builder.join(target, reference, options);
    return this;
  }

  /**
   * Executes the query and returns the first row or null.
   */
  first<T = any>(): T | null {
    this.limit(1);
    const results = this.run() as T[];
    return results && results.length > 0 ? results[0] : null;
  }

  /**
   * Alias for first().
   */
  get<T = any>(): T | null {
    return this.first<T>();
  }

  /**
   * Executes the query as a COUNT(*) and returns the count.
   */
  count(): number {
    this.builder.count();
    const result = this.run() as any[];
    return result?.[0]?.count ?? 0;
  }

  run<T = any>(): T {
    // 1. Check for one-to-many hydration via asKey
    if (this.builder.asKeyInfo) {
      const info = this.builder.asKeyInfo;
      this.builder.asKeyInfo = undefined;

      const parentCols = (
        this.db.query(`PRAGMA table_info(${info.parentTable})`).all() as any[]
      ).map((c) => c.name);
      const childCols = (
        this.db.query(`PRAGMA table_info(${info.childTable})`).all() as any[]
      ).map((c) => c.name);

      const pSelect = parentCols.map((c) => `${info.parentTable}.${c} AS __p_${c}`).join(', ');
      const cSelect = childCols.map((c) => `${info.childTable}.${c} AS __c_${c}`).join(', ');

      const joinType = info.type || 'INNER';
      const comparison = info.comparison || '=';

      let sql = `SELECT ${pSelect}, ${cSelect} FROM ${info.parentTable} ${joinType} JOIN ${info.childTable} ON ${info.parentTable}.${info.parentCol} ${comparison} ${info.childTable}.${info.childCol}`;

      const extraParts = this.builder.actualQuery
        .filter((p) => p.level >= QueryLevel.WHERE)
        .map((p) => p.query);

      if (extraParts.length > 0) {
        sql += ' ' + extraParts.join(' ');
      }

      this.builder.actualQuery = [];
      validateSQLQuery(sql, { allowUnsafeWhere: !this.options?.safeMode });

      const startTime = performance.now();
      const rawRows = this.db.query(sql).all() as any[];
      const durationMs = performance.now() - startTime;
      this.logQuery(sql, durationMs, 'SELECT');

      const parentMap = new Map<any, any>();
      for (const row of rawRows) {
        const pk = row[`__p_${info.parentCol}`];
        if (pk === null || pk === undefined) continue;

        if (!parentMap.has(pk)) {
          const parentObj: Record<string, any> = {};
          for (const c of parentCols) {
            parentObj[c] = row[`__p_${c}`];
          }
          parentObj[info.asKey] = [];
          parentMap.set(pk, parentObj);
        }

        const childPkVal = row[`__c_${info.childCol}`] ?? row[`__c_${childCols[0]}`];
        if (childPkVal !== null && childPkVal !== undefined) {
          const childObj: Record<string, any> = {};
          for (const c of childCols) {
            childObj[c] = row[`__c_${c}`];
          }
          parentMap.get(pk)[info.asKey].push(childObj);
        }
      }

      return Array.from(parentMap.values()) as unknown as T;
    }

    // 2. Standard query execution
    const allowUnsafe = this.bypassSafeWhere || !this.options?.safeMode;
    this.bypassSafeWhere = false;
    const query = this.builder.run();
    validateSQLQuery(query, { allowUnsafeWhere: allowUnsafe });

    const startTime = performance.now();
    try {
      const isSelect = /^\s*SELECT\b/i.test(query);
      if (isSelect) {
        const res = this.db.query(query).all();
        const durationMs = performance.now() - startTime;
        this.logQuery(query, durationMs, 'SELECT');
        return res as unknown as T;
      }

      const res = this.db.run(query);
      const durationMs = performance.now() - startTime;
      const type = /^\s*INSERT\b/i.test(query)
        ? 'INSERT'
        : /^\s*UPDATE\b/i.test(query)
        ? 'UPDATE'
        : /^\s*DELETE\b/i.test(query)
        ? 'DELETE'
        : 'EXEC';
      this.logQuery(query, durationMs, type);
      return res as unknown as T;
    } catch (err: any) {
      throw new SqlightQueryError(err?.message || String(err), query);
    }
  }
}
