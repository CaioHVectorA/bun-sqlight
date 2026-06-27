// sqlight.d.ts
// Complete type declarations for the bun-sqlight library.

declare module 'bun-sqlight' {
  export { Sqlight } from './lib/connect';
}

/**
 * Comparison operators for WHERE and JOIN conditions.
 */
type Comparison = '=' | '!=' | '>' | '<' | '>=' | '<=';

/**
 * Column options available when defining schema columns.
 */
interface ColumnOptions<T = any> {
  /** Default value for the column */
  default?: T;
  /** Whether to add a UNIQUE constraint */
  unique?: boolean;
  /** Whether the column allows NULL values (defaults to NOT NULL) */
  nullable?: boolean;
}

/**
 * Foreign key constraint options.
 */
interface ForeignKeyOptions extends ColumnOptions<string> {
  /** Action on parent row deletion */
  onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  /** Action on parent row update */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
}

/**
 * Schema callback interface for defining table columns.
 * Used inside the `createTable` callback.
 */
interface SchemaBuilder {
  /** Define an autoincrementing integer primary key column */
  id(name?: string): void;
  /** Define a UUID primary key column with auto-generation hook */
  uuid(name?: string): void;
  /** Define a TEXT column */
  string(name: string, options?: ColumnOptions<string>): void;
  /** Define an INTEGER column */
  integer(name: string, options?: ColumnOptions<number>): void;
  /** Define a BOOLEAN column (stored as 0/1) */
  boolean(name: string, options?: ColumnOptions<boolean>): void;
  /** Define a REAL (float) column */
  float(name: string, options?: ColumnOptions<number>): void;
  /** Define a DATE column (YYYY-MM-DD) */
  date(name: string, options?: ColumnOptions<string>): void;
  /** Define a DATETIME column (YYYY-MM-DD HH:MM:SS) */
  datetime(name: string, options?: ColumnOptions<string>): void;
  /** Add created_at and updated_at TIMESTAMP columns with auto-update hooks */
  timestamps(): void;
  /** Define a foreign key column referencing another table */
  foreign(
    name: string,
    reference: `${string}.${string}`,
    options?: ForeignKeyOptions
  ): void;
}

/**
 * Join options for configuring table join behavior.
 */
interface JoinOptions {
  /** Type of SQL JOIN */
  type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  /** Comparison operator for the ON clause */
  comparison?: Comparison;
  /** Table alias mapping, e.g. { users: 'U', products: 'P' } */
  alias?: Record<string, string>;
}

/**
 * Main database class for bun-sqlight.
 * Provides a chainable query builder and schema management API.
 *
 * @example
 * ```ts
 * import { Sqlight } from 'bun-sqlight';
 * const db = new Sqlight('myDb.db');
 * ```
 */
export interface TableSchemaShape {
  select: Record<string, any>;
  insert: Record<string, any>;
  update: Record<string, any>;
}

export interface SqlightOptions {
  typesOutputFile?: string;
}

export declare class Sqlight<
  TypeTablesSchema extends Record<keyof TypeTablesSchema, TableSchemaShape> = any,
  TableNamesSchema extends keyof TypeTablesSchema & string = keyof TypeTablesSchema & string
> {
  /**
   * Create a new SQLite database connection.
   * @param filename - Path to the database file. Defaults to ':memory:' for an in-memory database.
   * @param options - Options for configuring the database client.
   */
  constructor(filename?: string, options?: SqlightOptions);

  /**
   * Close the database connection.
   */
  close(): void;

  /**
   * Execute a raw SQL query string.
   * The query is validated against SQL injection patterns before execution.
   * @param query - Raw SQL string to execute.
   * @returns Array of result rows.
   */
  raw<T = Record<string, any>>(query: string): T[];

  // ─── Schema Management ───────────────────────────────────────────────

  /**
   * Create a new table using a schema callback.
   * @param table - Name of the table to create.
   * @param fields - Callback that receives a SchemaBuilder to define columns.
   */
  createTable(table: string, fields: (schema: SchemaBuilder) => void): this;

  /**
   * Create a new table using an object of column definitions.
   * @param table - Name of the table to create.
   * @param fields - Object mapping column names to SQL type strings.
   */
  createTable(table: string, fields: Record<string, string>): this;

  /**
   * Drop a table from the database.
   * @param table - Name of the table to drop.
   */
  dropTable<T extends TableNamesSchema>(table: T): this;

  // ─── SELECT ──────────────────────────────────────────────────────────

  /**
   * Begin a SELECT query.
   * @param fields - Column names to select, or '*' for all.
   */
  select<T extends TableNamesSchema>(...fields: (keyof TypeTablesSchema[T]['select'] | '*')[]): this;

  /**
   * Specify the table to query FROM.
   * @param table - Table name.
   */
  from<T extends TableNamesSchema>(table: T): this;

  // ─── WHERE ───────────────────────────────────────────────────────────

  /**
   * Add a WHERE condition (AND).
   * @param field - Column name.
   * @param value - Value to compare with (uses '=' operator).
   */
  where(field: string, value: any): this;

  /**
   * Add a WHERE condition with a comparison operator (AND).
   * @param field - Column name.
   * @param comparison - Comparison operator ('=', '!=', '>', '<', '>=', '<=').
   * @param value - Value to compare with.
   */
  where(field: string, comparison: Comparison, value: any): this;

  /**
   * Add an OR WHERE condition.
   * @param field - Column name.
   * @param value - Value to compare with (uses '=' operator).
   */
  orWhere(field: string, value: any): this;

  /**
   * Add an OR WHERE condition with a comparison operator.
   * @param field - Column name.
   * @param comparison - Comparison operator.
   * @param value - Value to compare with.
   */
  orWhere(field: string, comparison: Comparison, value: any): this;

  // ─── ORDER, LIMIT, OFFSET ───────────────────────────────────────────

  /**
   * Add an ORDER BY clause.
   * @param field - Column name to sort by.
   * @param direction - Sort direction: 'ASC' or 'DESC'.
   */
  orderBy(field: string, direction: 'ASC' | 'DESC'): this;

  /**
   * Limit the number of returned rows.
   * @param limit - Maximum number of rows.
   */
  limit(limit: number): this;

  /**
   * Skip a number of rows (used with limit for pagination).
   * @param offset - Number of rows to skip.
   */
  offset(offset: number): this;

  // ─── INSERT / UPDATE / DELETE ───────────────────────────────────────

  /**
   * Insert a new row into a table.
   * @param table - Table name.
   * @param data - Object mapping column names to values.
   */
  insert<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['insert']): this;

  /**
   * Update rows in a table. Must be followed by `.where()`.
   * @param table - Table name.
   * @param data - Object mapping column names to new values.
   */
  update<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['update']): this;

  /**
   * Delete rows from a table. Must be followed by `.where()`.
   * @param table - Table name.
   */
  delete(table: string): this;

  // ─── JOIN ───────────────────────────────────────────────────────────

  /**
   * Join another table.
   * @param target - Target column in format 'table.column'.
   * @param reference - Reference column in format 'table.column'.
   * @param options - Optional join configuration (type, comparison, alias).
   */
  join(
    target: `${string}.${string}`,
    reference: `${string}.${string}`,
    options?: JoinOptions
  ): this;

  // ─── Execution ──────────────────────────────────────────────────────

  /**
   * Execute the built query against the database.
   * @returns Array of result rows.
   */
  run(): any[];
}
