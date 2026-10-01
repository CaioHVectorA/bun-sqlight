// sqlight.d.ts
// Complete type declarations for the bun-sqlight library.

declare module 'bun-sqlight' {
  export { Sqlight, BunSqlight } from './lib/connect';
  export { DatabaseManager, SqlightOptions, QueryLog, QueryLogger } from './lib/db-manager';
  export { QueryBuilder, Comparison, QueryLevel, JoinOptions, AsKeyInfo, TableSchemaShape } from './lib/query-builder';
  export { Schema, createSchemaCallback } from './lib/schema';
  export * from './lib/schema/primitives';
  export { TableRepository, FindManyOptions } from './lib/table-repository';
  export { Transaction, ITransaction } from './lib/transaction';
  export { Migrator, MigrationRecord, MigrationStatus, MigrationFile } from './lib/migrator';
  export { validateSQLQuery, SQLValidationOptions } from './lib/analyze-is-malicious';
  export {
    SqlightError,
    SqlightQueryError,
    SqlightSecurityError,
    SqlightValidationError,
    SqlightMigrationError,
  } from './lib/errors';
}

/**
 * Comparison operators for WHERE and JOIN conditions.
 */
export type Comparison = '=' | '!=' | '>' | '<' | '>=' | '<=';

/**
 * Column options available when defining schema columns.
 */
export interface ColumnOptions<T = any> {
  default?: T;
  unique?: boolean;
  nullable?: boolean;
}

/**
 * Foreign key constraint options.
 */
export interface ForeignKeyOptions extends ColumnOptions<string> {
  onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
}

/**
 * Schema callback interface for defining table columns.
 */
export interface SchemaBuilder {
  id(name?: string): void;
  uuid(name?: string): void;
  string(name: string, options?: ColumnOptions<string>): void;
  integer(name: string, options?: ColumnOptions<number>): void;
  boolean(name: string, options?: ColumnOptions<boolean>): void;
  float(name: string, options?: ColumnOptions<number>): void;
  date(name: string, options?: ColumnOptions<string>): void;
  datetime(name: string, options?: ColumnOptions<string>): void;
  timestamps(): void;
  foreign(
    name: string,
    reference: `${string}.${string}`,
    options?: ForeignKeyOptions
  ): void;
}

/**
 * Join options for configuring table join behavior.
 */
export interface JoinOptions {
  type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  comparison?: Comparison | '!=' | '>' | '<' | '>=' | '<=' | '=';
  alias?: Record<string, string>;
  /** Optional key to hydrate joined rows as a nested array (one-to-many ORM hydration) */
  asKey?: string;
}

export interface TableSchemaShape {
  select: Record<string, any>;
  insert: Record<string, any>;
  update: Record<string, any>;
}

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

export interface FindManyOptions {
  where?: Record<string, any>;
  orderBy?: [string, 'ASC' | 'DESC'];
  limit?: number;
  offset?: number;
}

/**
 * TableRepository provides an ORM-style active record abstraction over a specific table.
 */
export declare class TableRepository<
  TSelect = any,
  TInsert = Record<string, any>,
  TUpdate = Partial<TInsert>
> {
  public readonly tableName: string;
  constructor(tableName: string, dbManager: any);
  query(): any;
  find(id: number | string): TSelect | null;
  findById(id: number | string): TSelect | null;
  findOne(where: Record<string, any>): TSelect | null;
  findFirst(where?: Record<string, any>): TSelect | null;
  findMany(options?: FindManyOptions): TSelect[];
  create(data: TInsert): TSelect;
  createMany(dataList: TInsert[]): TSelect[];
  update(id: number | string, data: Partial<TUpdate>): TSelect | null;
  updateWhere(where: Record<string, any>, data: Partial<TUpdate>): number;
  delete(id: number | string): boolean;
  deleteWhere(where: Record<string, any>): number;
  count(where?: Record<string, any>): number;
  exists(where: Record<string, any>): boolean;
}

/**
 * Transaction interface.
 */
export declare class Transaction {
  commit(): void;
  rollback(): void;
  isActive(): boolean;
}

/**
 * Migrator class for running and rolling back database migrations.
 */
export declare class Migrator {
  init(): Promise<void>;
  up(dir?: string): Promise<string[]>;
  rollback(dir?: string): Promise<string[]>;
  status(dir?: string): Promise<{ name: string; applied: boolean; batch?: number; applied_at?: string }[]>;
  create(name: string, dir?: string): string;
}

export declare class Sqlight<
  TypeTablesSchema extends Record<keyof TypeTablesSchema, TableSchemaShape> = any,
  TableNamesSchema extends keyof TypeTablesSchema & string = keyof TypeTablesSchema & string
> {
  public migrate: Migrator;

  constructor(filename?: string, options?: SqlightOptions);

  close(): void;
  raw<T = Record<string, any>>(query: string, params?: any): T[];

  table<TSelect = any, TInsert = Record<string, any>, TUpdate = Partial<TInsert>>(
    table: string
  ): TableRepository<TSelect, TInsert, TUpdate>;

  model<TSelect = any, TInsert = Record<string, any>, TUpdate = Partial<TInsert>>(
    table: string
  ): TableRepository<TSelect, TInsert, TUpdate>;

  transaction<T>(
    callback: (trx: Sqlight<TypeTablesSchema, TableNamesSchema>) => Promise<T> | T
  ): Promise<T> | T;

  beginTransaction(): Transaction;
  allowAll(): this;

  createTable(table: string, fields: (schema: SchemaBuilder) => void): this;
  createTable(table: string, fields: Record<string, any>): this;
  dropTable<T extends TableNamesSchema>(table: T): this;

  select<T extends TableNamesSchema>(
    ...fields: (keyof TypeTablesSchema[T]['select'] | '*' | (keyof TypeTablesSchema[T]['select'] | '*')[])[]
  ): this;
  from<T extends TableNamesSchema>(table: T): this;
  where(field: string | Record<string, any>, value?: any): this;
  where(field: string, comparison: Comparison, value: any): this;
  orWhere(field: string, value: any): this;
  orWhere(field: string, comparison: Comparison, value: any): this;
  whereIn(field: string, values: any[]): this;
  whereNull(field: string): this;
  whereNotNull(field: string): this;
  groupBy(...fields: string[]): this;
  having(condition: string): this;

  orderBy(field: string, direction: 'ASC' | 'DESC'): this;
  limit(limit: number): this;
  offset(offset: number): this;

  insert<T extends TableNamesSchema>(
    table: T,
    data: TypeTablesSchema[T]['insert'] | TypeTablesSchema[T]['insert'][]
  ): this;
  update<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['update']): this;
  delete(table: string): this;

  join(
    target: `${string}.${string}`,
    reference: `${string}.${string}`,
    options?: JoinOptions
  ): this;

  first<T = any>(): T | null;
  get<T = any>(): T | null;
  count(): number;
  run(): any[];
}

export declare const BunSqlight: typeof Sqlight;
