// sqlight.d.ts
/**
 * SQLight Library Type Declarations
 *
 * This file contains type definitions and JSDoc descriptions for the SQLight library.
 */

/**
 * Represents a comparison operator for query conditions.
 */
type Comparison = '=' | '!=' | '>' | '<' | '>=' | '<=';

/**
 * Lifecycle hooks for database operations.
 * @template T - Table name type extending string literals.
 */
interface Hooks<T extends string = string> {
  /**
   * Callbacks executed after an insert operation.
   */
  afterInsert: Array<(data: any) => void>;
  /**
   * Callbacks executed after an update operation.
   */
  afterUpdate: Array<(data: any) => void>;
  /**
   * Callbacks executed before an insert operation.
   */
  beforeInsert: Array<(data: any) => void>;
  /**
   * Callbacks executed before an update operation.
   */
  beforeUpdate: Array<(data: any) => void>;
  /**
   * Callbacks executed before a select operation.
   */
  beforeSelect: Array<(query: string) => void>;
  /**
   * Callbacks executed after a select operation.
   */
  afterSelect: Array<(results: any[]) => void>;
}

/**
 * Metadata structure for database columns.
 */
interface ColumnMetadata {
  /**
   * SQLite data type for the column.
   */
  type: SQLITE_TYPES;
  /**
   * Whether the column is nullable.
   */
  nullable?: boolean;
  /**
   * Default value for the column.
   */
  defaultValue?: any;
  /**
   * Whether the column is a primary key.
   */
  primaryKey?: boolean;
}

/**
 * Type mapping for generated table structures.
 */
export type TypeTables = Omit<typeof import('./generated/index').default, 'prototype'>;

/**
 * Union type of available table names.
 */
export type TableNames = keyof TypeTables extends never ? string : keyof TypeTables;

/**
 * Main database manager class providing query building and execution capabilities.
 */
export declare class DatabaseManager {
  /**
   * @param builder - Query builder instance
   * @param db - SQLite database instance
   */
  constructor(builder?: QueryBuilder, db?: any);

  /**
   * Hooks registry for database operations
   */
  hooks: Hooks;

  /**
   * Execute raw SQL query
   * @param query - Raw SQL string
   * @returns Query results
   */
  raw<T = any>(query: string): T[];

  /**
   * SELECT query builder
   * @param fields - Fields to select ('*' for all)
   */
  select<T extends TableNames = string>(...fields: (keyof TypeTables[T]['select'] | '*')[]): this;

  /**
   * FROM clause builder
   * @param table - Table name to query from
   */
  from<T extends TableNames = string>(table: T): this;

  /**
   * WHERE condition builder
   * @param field - Column name
   * @param valueOrComparison - Comparison operator or direct value
   * @param value - Comparison value (if operator provided)
   */
  where(field: string, valueOrComparison: any, value?: any): this;

  /**
   * OR WHERE condition builder
   */
  orWhere(field: string, valueOrComparison: any, value?: any): this;

  /**
   * ORDER BY builder
   */
  orderBy(field: string, direction: 'ASC' | 'DESC'): this;

  /**
   * LIMIT builder
   */
  limit(limit: number): this;

  /**
   * OFFSET builder
   */
  offset(offset: number): this;

  /**
   * CREATE TABLE builder
   */
  createTable(table: string, fields: any, options?: { exists?: boolean }): this;

  /**
   * DROP TABLE builder
   */
  dropTable(table: string): this;

  /**
   * INSERT query builder
   */
  insert<T extends TableNames = string>(table: T, data: any): this;

  /**
   * UPDATE query builder
   */
  update<T extends TableNames = string>(table: T, data: any): this;

  /**
   * DELETE query builder
   */
  delete(table: string): this;

  /**
   * Close database
   */
  close(): void;

  /**
   * Execute built query
   * @returns Query results
   */
  run<T = any>(): T[];
}

/**
 * Query builder class (internal implementation)
 */
export declare class QueryBuilder {
  select(...fields: any[]): this;
  from(table: string): this;
  where(field: string, valueOrComparison: any, value?: any): this;
  orWhere(field: string, valueOrComparison: any, value?: any): this;
  orderBy(field: string, direction: 'ASC' | 'DESC'): this;
  limit(limit: number): this;
  offset(offset: number): this;
  insert(table: string, data: Record<string, any>): this;
  update(table: string, data: Record<string, any>): this;
  delete(table: string): this;
  run(): string;
}

export declare class Sqlight extends DatabaseManager {
  constructor(filename?: string);
}

export declare class BunSqlight extends Sqlight {}
export declare class Database extends Sqlight {}

export default Sqlight;
