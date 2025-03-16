// sqlight.d.ts
import Tables from './generated/index';
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
 * Type mapping for table structures and operations.
 * @template T - Table name type.
 */
interface TypeTables<T extends string = string> {
  [key: string]: {
    /**
     * Data structure for SELECT operations
     */
    select: Record<string, any>;
    /**
     * Data structure for INSERT operations
     */
    insert: Record<string, any>;
    /**
     * Data structure for UPDATE operations
     */
    update: Record<string, any>;
  };
}

/**
 * Union type of available table names.
 */
type TableNames = keyof Tables;

/**
 * Main database manager class providing query building and execution capabilities.
 */
declare class DatabaseManager {
  /**
   * @param builder - Query builder instance
   * @param db - SQLite database instance
   */
  constructor(builder: QueryBuilder, db: Database);

  /**
   * Hooks registry for database operations
   */
  private hooks: Hooks;

  /**
   * Execute raw SQL query
   * @param query - Raw SQL string
   * @returns Query results
   */
  raw<T>(query: string): T[];

  /**
   * SELECT query builder
   * @param fields - Fields to select ('*' for all)
   */
  select<T extends TableNames>(...fields: (keyof TypeTables[T]['select'] | '*')[]): this;

  /**
   * FROM clause builder
   * @param table - Table name to query from
   */
  from<T extends TableNames>(table: T): this;

  /**
   * WHERE condition builder
   * @param field - Column name
   * @param valueOrComparison - Comparison operator or direct value
   * @param value - Comparison value (if operator provided)
   */
  where(field: string, valueOrComparison: any, value?: any): this;

  /**
   * Execute built query
   * @returns Query results
   */
  run(): any[];
}

/**
 * SQLite database wrapper class
 */
declare class Database {
  /**
   * @param filename - Database file path (':memory:' for in-memory)
   */
  constructor(filename: string);
}

/**
 * Query builder class (internal implementation)
 */
declare class QueryBuilder {
  // Implementation details are handled internally
}

// Re-export common types

declare class Sqlight implements DatabaseManager {}
