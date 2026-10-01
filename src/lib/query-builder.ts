import { DatabaseManager } from './db-manager';
import { createSchemaCallback, Schema } from './schema';
import type { Tables } from './table';
import { invertObject } from '../utils/invert-obj';
import { normalizeInsertData } from './normalize-insert-data';
import type { ColumnBuilder } from './schema/primitives';
import { generateTableTypes, mapType } from './type-generator';
import type { SQLITE_TYPES } from '../utils/sqlite.types';
import type { TableNames, TypeTables } from '../table-types';
import { SqlightSecurityError, SqlightValidationError } from './errors';

export enum Comparison {
  EQUAL = '=',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
}

export type ColumnMetadata = {
  sqlType: string;
  tsType: string;
  nullable: boolean;
  hasDefault: boolean;
  isPrimary?: boolean;
};

export enum QueryLevel {
  CLAUSE = 1,
  TABLE = 2,
  WHERE = 3,
  GROUP_BY = 4,
  HAVING = 5,
  ORDER_LIMIT = 6,
}

export type QueryPart = {
  query: string;
  level: QueryLevel;
};

interface SchemaOptions {
  exists?: boolean;
}

export interface TableSchemaShape {
  select: Record<string, any>;
  insert: Record<string, any>;
  update: Record<string, any>;
}

export interface JoinOptions {
  type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  comparison?: Comparison | '!=' | '>' | '<' | '>=' | '<=' | '=';
  alias?: Record<string, string>;
  asKey?: string;
}

export interface AsKeyInfo {
  parentTable: string;
  childTable: string;
  parentCol: string;
  childCol: string;
  asKey: string;
  type?: string;
  comparison?: string;
}

export interface IQueryBuilder<
  TypeTablesSchema extends Record<keyof TypeTablesSchema, TableSchemaShape> = TypeTables,
  TableNamesSchema extends keyof TypeTablesSchema & string = keyof TypeTablesSchema & string
> {
  queryBrute?: string;
  tables: Tables;
  db?: DatabaseManager<TypeTablesSchema, TableNamesSchema>;
  actualQuery: QueryPart[];
  asKeyInfo?: AsKeyInfo;
  select<T extends TableNamesSchema>(
    ...fields: (keyof TypeTablesSchema[T]['select'] | '*' | (keyof TypeTablesSchema[T]['select'] | '*')[])[]
  ): this;
  from<T extends TableNamesSchema>(table: T): this;
  where(field: string | Record<string, any>, valueOrComparison?: any, value?: any): this;
  orWhere(field: string, valueOrComparison?: any, value?: any): this;
  whereIn(field: string, values: any[]): this;
  whereNull(field: string): this;
  whereNotNull(field: string): this;
  groupBy(...fields: string[]): this;
  having(condition: string): this;
  count(field?: string): this;
  orderBy(field: string, direction: 'ASC' | 'DESC'): this;
  limit(limit: number): this;
  offset(offset: number): this;
  allowAll(): this;
  dropTable<T extends TableNamesSchema>(table: T): this;
  createTable(
    table: string,
    fields: { [key: string]: any } | ((schema: Schema) => void),
    options?: SchemaOptions
  ): this;
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
  run(): string;
}

export class QueryBuilder<
  TypeTablesSchema extends Record<keyof TypeTablesSchema, TableSchemaShape> = TypeTables,
  TableNamesSchema extends keyof TypeTablesSchema & string = keyof TypeTablesSchema & string
> implements IQueryBuilder<TypeTablesSchema, TableNamesSchema> {
  tables: Tables = {};
  queryBrute?: string;
  db?: DatabaseManager<TypeTablesSchema, TableNamesSchema>;
  actualQuery: QueryPart[] = [];
  asKeyInfo?: AsKeyInfo;
  bypassSafeWhere = false;

  select<T extends TableNamesSchema>(
    ...fields: (keyof TypeTablesSchema[T]['select'] | '*' | (keyof TypeTablesSchema[T]['select'] | '*')[])[]
  ): this {
    const flatFields: string[] = [];
    for (const item of fields) {
      if (Array.isArray(item)) {
        flatFields.push(...item.map(String));
      } else if (item !== undefined) {
        flatFields.push(String(item));
      }
    }

    const fieldStr = flatFields.length > 0 ? flatFields.join(', ') : '*';
    this.actualQuery.push({
      query: `SELECT ${fieldStr}`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }

  from<T extends TableNamesSchema>(table: T): this {
    this.actualQuery.push({ query: `FROM ${table}`, level: QueryLevel.TABLE });
    return this;
  }

  where(field: string | Record<string, any>, valueOrComparison?: any, value?: any): this {
    // Support object condition: where({ id: 1, name: 'Alice' })
    if (typeof field === 'object' && field !== null) {
      for (const [k, v] of Object.entries(field)) {
        this.where(k, v);
      }
      return this;
    }

    let comparison = Comparison.EQUAL;
    let valueToUse = valueOrComparison;

    if (value !== undefined) {
      comparison = valueOrComparison as Comparison;
      valueToUse = value;
    }

    const valFormatted =
      typeof valueToUse === 'string'
        ? `"${valueToUse}"`
        : valueToUse === null
        ? 'NULL'
        : valueToUse;

    if (this.actualQuery.find((part) => part.query.includes('WHERE'))) {
      this.actualQuery.push({
        query: `${field} ${comparison} ${valFormatted}`,
        level: QueryLevel.WHERE,
      });
      return this;
    }

    this.actualQuery.push({
      query: `WHERE ${field} ${comparison} ${valFormatted}`,
      level: QueryLevel.WHERE,
    });
    return this;
  }

  orWhere(field: string, valueOrComparison?: any, value?: any): this {
    let comparison = Comparison.EQUAL;
    let valueToUse = valueOrComparison;

    if (value !== undefined) {
      comparison = valueOrComparison as Comparison;
      valueToUse = value;
    }

    const valFormatted =
      typeof valueToUse === 'string' ? `"${valueToUse}"` : valueToUse === null ? 'NULL' : valueToUse;

    this.actualQuery.push({
      query: `OR ${field} ${comparison} ${valFormatted}`,
      level: QueryLevel.WHERE,
    });
    return this;
  }

  whereIn(field: string, values: any[]): this {
    const formattedVals = values
      .map((v) => (typeof v === 'string' ? `"${v}"` : v))
      .join(', ');
    const clause = `${field} IN (${formattedVals})`;

    if (this.actualQuery.find((part) => part.query.includes('WHERE'))) {
      this.actualQuery.push({ query: clause, level: QueryLevel.WHERE });
    } else {
      this.actualQuery.push({ query: `WHERE ${clause}`, level: QueryLevel.WHERE });
    }
    return this;
  }

  whereNull(field: string): this {
    const clause = `${field} IS NULL`;
    if (this.actualQuery.find((part) => part.query.includes('WHERE'))) {
      this.actualQuery.push({ query: clause, level: QueryLevel.WHERE });
    } else {
      this.actualQuery.push({ query: `WHERE ${clause}`, level: QueryLevel.WHERE });
    }
    return this;
  }

  whereNotNull(field: string): this {
    const clause = `${field} IS NOT NULL`;
    if (this.actualQuery.find((part) => part.query.includes('WHERE'))) {
      this.actualQuery.push({ query: clause, level: QueryLevel.WHERE });
    } else {
      this.actualQuery.push({ query: `WHERE ${clause}`, level: QueryLevel.WHERE });
    }
    return this;
  }

  groupBy(...fields: string[]): this {
    this.actualQuery.push({
      query: `GROUP BY ${fields.join(', ')}`,
      level: QueryLevel.GROUP_BY,
    });
    return this;
  }

  having(condition: string): this {
    this.actualQuery.push({
      query: `HAVING ${condition}`,
      level: QueryLevel.HAVING,
    });
    return this;
  }

  count(field = '*'): this {
    this.actualQuery.push({
      query: `SELECT COUNT(${field}) AS count`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC'): this {
    if (this.actualQuery.find((part) => part.query.includes('ORDER BY'))) {
      this.actualQuery.push({
        query: `, ${field} ${direction}`,
        level: QueryLevel.ORDER_LIMIT,
      });
      return this;
    }
    this.actualQuery.push({
      query: `ORDER BY ${field} ${direction}`,
      level: QueryLevel.ORDER_LIMIT,
    });
    return this;
  }

  limit(limit: number): this {
    this.actualQuery.push({
      query: `LIMIT ${limit}`,
      level: QueryLevel.ORDER_LIMIT,
    });
    return this;
  }

  offset(offset: number): this {
    this.actualQuery.push({
      query: `OFFSET ${offset}`,
      level: QueryLevel.ORDER_LIMIT,
    });
    return this;
  }

  allowAll(): this {
    this.bypassSafeWhere = true;
    return this;
  }

  dropTable<T extends TableNamesSchema>(table: T): this {
    this.actualQuery.push({
      query: `DROP TABLE ${table}`,
      level: QueryLevel.TABLE,
    });
    return this;
  }

  createTable(
    table: string,
    fields: { [key: string]: string | ColumnBuilder } | ((schema: Schema) => void),
    options: SchemaOptions = { exists: true }
  ): this {
    if (typeof fields === 'function') {
      createSchemaCallback(table, fields, this);
      return this;
    }
    const resolveColumnBuilder = (column: string | ColumnBuilder) => {
      if (typeof column === 'string') return column;
      return column.toString();
    };
    this.actualQuery.push({
      query: `CREATE TABLE ${table} (${Object.entries(fields)
        .map(([key, value]) => `${key} ${resolveColumnBuilder(value)}`)
        .join(', ')})`,
      level: QueryLevel.TABLE,
    });
    this.tables[table] = Object.entries(fields).reduce((acc, [key, value]) => {
      const sqlType = value.toString().split(' ')[0] as SQLITE_TYPES;
      acc[key] = {
        sqlType,
        tsType: mapType(sqlType),
        nullable: false,
        hasDefault: false,
      };
      return acc;
    }, {} as Record<string, ColumnMetadata>);
    generateTableTypes(table, this.tables[table], this.db?.options);
    return this;
  }

  insert<T extends TableNamesSchema>(
    table: T,
    data: TypeTablesSchema[T]['insert'] | TypeTablesSchema[T]['insert'][]
  ): this {
    if (Array.isArray(data)) {
      if (data.length === 0) return this;
      const keys = Object.keys(data[0]);
      const valueSets = data.map((item) => {
        const values = Object.values(item as any);
        return `(${values.map(normalizeInsertData(this.tables, table, keys)).join(', ')})`;
      });
      this.actualQuery.push({
        query: `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${valueSets.join(', ')}`,
        level: QueryLevel.CLAUSE,
      });
      return this;
    }

    const keys = Object.keys(data);
    const values = Object.values(data as any);
    this.actualQuery.push({
      query: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.map(normalizeInsertData(this.tables, table, keys)).join(', ')})`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }

  update<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['update']): this {
    this.actualQuery.push({
      query: `UPDATE ${table} SET ${Object.entries(data as any)
        .map(([key, value]) => `${key} = ${typeof value === 'string' ? `"${value}"` : value}`)
        .join(', ')}`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }

  delete(table: string): this {
    this.actualQuery.push({
      query: `DELETE FROM ${table}`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }

  join(
    target: `${string}.${string}`,
    reference: `${string}.${string}`,
    options: JoinOptions = { comparison: '=', type: 'INNER' }
  ): this {
    const findAlias = (table: string, fallback: string) => {
      return (options.alias || {})[table] || fallback || '';
    };
    const findRef = (ref: string, fallback: string) => {
      return invertObject(options.alias || {})[ref] || fallback || '';
    };

    const comparison = options.comparison ?? '=';
    const type = options.type ?? 'INNER';

    let [table2, column2] = target.split('.');
    let [table1, column1] = reference.split('.');
    table2 = findRef(table2, table2);
    table1 = findRef(table1, table1);

    const select = this.actualQuery.find((part) => part.query.includes('FROM'));
    const aliasesValues = Object.values(options.alias || {});
    const alias1 = aliasesValues[1] ? aliasesValues[1] : '';
    const alias2 = aliasesValues[0] ? aliasesValues[0] : '';

    const aliasVal2 = findAlias(table2, alias2);
    const aliasStr2 = aliasVal2 ? ` ${aliasVal2}` : '';
    const aliasVal1 = findAlias(table1, alias1);
    const aliasStr1 = aliasVal1 ? ` ${aliasVal1}` : '';

    let parentTable = table1;
    let childTable = table2;
    let parentCol = column1;
    let childCol = column2;

    if (select && select.query.includes(table2)) {
      parentTable = table2;
      childTable = table1;
      parentCol = column2;
      childCol = column1;

      this.actualQuery.push({
        query: `${type} JOIN ${table1}${aliasStr1} ON ${findAlias(
          table2,
          table2
        )}.${column2} ${comparison} ${findAlias(table1, table1)}.${column1}`,
        level: QueryLevel.TABLE,
      });

      const withFrom = this.actualQuery.findIndex(
        (s) => s.query.includes('FROM') && s.query.includes(table2)
      );
      if (withFrom !== -1 && aliasVal2) {
        this.actualQuery[withFrom].query = this.actualQuery[withFrom].query + ' ' + aliasVal2;
      }
    } else {
      this.actualQuery.push({
        query: `${type} JOIN ${table2}${aliasStr2} ON ${findAlias(
          table1,
          table1
        )}.${column1} ${comparison} ${findAlias(table2, table2)}.${column2}`,
        level: QueryLevel.TABLE,
      });

      const withFrom = this.actualQuery.findIndex(
        (s) => s.query.includes('FROM') && s.query.includes(findRef(table1, table1))
      );
      if (withFrom !== -1 && aliasVal1) {
        this.actualQuery[withFrom].query = this.actualQuery[withFrom].query + ' ' + aliasVal1;
      }
    }

    if (options.asKey) {
      this.asKeyInfo = {
        parentTable,
        childTable,
        parentCol,
        childCol,
        asKey: options.asKey,
        type,
        comparison: String(comparison),
      };
    }

    return this;
  }

  run(): string {
    if (this.queryBrute) {
      const temp = this.queryBrute;
      this.queryBrute = undefined;
      return temp;
    }

    // Safety validations
    const hasSelect = this.actualQuery.some((p) => p.query.startsWith('SELECT'));
    const hasFrom = this.actualQuery.some((p) => p.query.startsWith('FROM'));
    if (hasSelect && !hasFrom) {
      throw new SqlightValidationError('SELECT statement requires a FROM clause');
    }

    const isUpdateOrDelete = this.actualQuery.some(
      (p) => p.query.startsWith('UPDATE') || p.query.startsWith('DELETE')
    );
    const hasWhere = this.actualQuery.some((p) => p.query.includes('WHERE'));
    if (isUpdateOrDelete && !hasWhere && !this.bypassSafeWhere) {
      throw new SqlightSecurityError(
        'UPDATE or DELETE statement requires a WHERE clause in safeMode (use .allowAll() to override)',
        'MISSING_WHERE'
      );
    }

    const sorted = [...this.actualQuery].sort((a, b) => a.level - b.level);

    // add AND clause logic
    const queryWithAnd = sorted.map((part, index) => {
      if (index === 0) return part.query;
      if (
        part.level === QueryLevel.WHERE &&
        sorted[index - 1].level === QueryLevel.WHERE &&
        !part.query.startsWith('OR') &&
        !part.query.startsWith('WHERE')
      ) {
        return `AND ${part.query}`;
      }
      return part.query;
    });

    this.actualQuery = [];
    this.bypassSafeWhere = false;
    return queryWithAnd.join(' ');
  }
}
