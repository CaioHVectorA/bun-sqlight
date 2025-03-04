import { Database } from 'bun:sqlite';
import { sql } from 'bun';
import { DatabaseManager } from './db-manager';
import type { Hooks } from './hooks';
import { createSchemaCallback, Schema } from './schema';
import type { Tables } from './table';
import { invertObject } from '../utils/invert-obj';
import { normalizeInsertData } from './normalize-insert-data';
import type { ColumnBuilder } from './schema/primitives';
import { generateTableTypes } from './type-generator';
export enum Comparison {
  EQUAL = '=',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
}
type TypeTables = Omit<typeof import('../generated')['default'], 'prototype'>;
type TableNames = keyof TypeTables;
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
  ORDER_LIMIT = 4,
}
export type QueryPart = {
  query: string;
  level: QueryLevel;
};
interface SchemaOptions {
  exists?: boolean;
}
export interface IQueryBuilder {
  queryBrute?: string;
  tables: Tables;
  db?: DatabaseManager;
  actualQuery: QueryPart[];
  select<T extends TableNames>(...fields: (keyof TypeTables[T]['select'])[]): this;
  from(table: string): this;
  where(field: string, value: any): this;
  orWhere(field: string, value: any): this;
  orderBy(field: string, direction: 'ASC' | 'DESC'): this;
  limit(limit: number): this;
  dropTable(table: string): this;
  createTable(table: string, fields: { [key: string]: string }): this;
  insert(table: string, data: Record<string, any>): this;
  update(table: string, data: Record<string, any>): this;
  run(): string;
}

export class QueryBuilder implements IQueryBuilder {
  tables: Tables = {};
  queryBrute?: string;
  db?: DatabaseManager;
  actualQuery: QueryPart[] = [];
  select<T extends TableNames>(...fields: (keyof TypeTables[T]['select'] & '*')[]): this {
    this.actualQuery.push({
      query: `SELECT ${(Array.isArray(fields) ? fields.join(', ') : fields) || '*'}`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }
  from<T extends TableNames>(table: T): this {
    this.actualQuery.push({ query: `FROM ${table}`, level: QueryLevel.TABLE });
    return this;
  }
  // into(table: string): this {
  //   this.actualQuery.push({ query: `INTO ${table}`, level: QueryLevel.TABLE });
  //   return this;
  // }
  where(field: string, valueOrComparison: any, value?: any): this {
    let comparison = Comparison.EQUAL;
    let valueToUse = valueOrComparison;

    if (value !== undefined) {
      comparison = valueOrComparison as Comparison;
      valueToUse = value;
    }

    if (this.actualQuery.find((part) => part.query.includes('WHERE'))) {
      this.actualQuery.push({
        query: `${field} ${comparison} ${typeof valueToUse === 'string' ? `"${valueToUse}"` : valueToUse}`,
        level: QueryLevel.WHERE,
      });
      return this;
    }

    this.actualQuery.push({
      query: `WHERE ${field} ${comparison} ${typeof valueToUse === 'string' ? `"${valueToUse}"` : valueToUse}`,
      level: QueryLevel.WHERE,
    });
    return this;
  }
  orWhere(field: string, valueOrComparison: any, value?: any): this {
    let comparison = Comparison.EQUAL;
    let valueToUse = valueOrComparison;

    if (value !== undefined) {
      comparison = valueOrComparison as Comparison;
      valueToUse = value;
    }

    this.actualQuery.push({
      query: `OR ${field} ${comparison} ${typeof valueToUse === 'string' ? `"${valueToUse}"` : valueToUse}`,
      level: QueryLevel.WHERE,
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
  dropTable<T extends TableNames>(table: T): this {
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
    generateTableTypes(table, this.tables[table]);
    return this;
    // SELECT * FROM users
  }
  insert<T extends TableNames>(table: T, data: TypeTables[T]['insert']): this {
    const keys = Object.keys(data);
    const values = Object.values(data);
    this.actualQuery.push({
      query: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.map(normalizeInsertData(this.tables, table, keys)).join(', ')})`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }
  update<T extends TableNames>(table: T, data: TypeTables[T]['update']): this {
    this.actualQuery.push({
      query: `UPDATE ${table} SET ${Object.entries(data)
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
  offset(offset: number): this {
    this.actualQuery.push({
      query: `OFFSET ${offset}`,
      level: QueryLevel.ORDER_LIMIT,
    });
    return this;
  }
  run(): string {
    if (this.queryBrute) {
      const temp = this.queryBrute;
      this.queryBrute = undefined;
      return temp;
    }
    const sorted = this.actualQuery.sort((a, b) => a.level - b.level);
    // add AND clause logic
    const queryWithAnd = sorted.map((part, index) => {
      if (index === 0) return part.query;
      const nextPart = sorted[index + 1];
      if (part.level === QueryLevel.WHERE && sorted[index - 1].level === QueryLevel.WHERE && !part.query.startsWith('OR')) {
        return `AND ${part.query}`;
      }
      return part.query;
    });
    this.actualQuery = [];
    return queryWithAnd.join(' ');
  }

  // join()
  join(
    target: `${string}.${string}`,
    reference: `${string}.${string}`,
    options: {
      type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
      comparison?: Comparison | '!=' | '>' | '<' | '>=' | '<=' | '=';
      alias?: Record<string, string>;
    } = { comparison: '=', type: 'INNER' }
  ): this {
    const findAlias = (table: string, fallback: string) => {
      return (options.alias || {})[table] || fallback || '';
    };
    const findRef = (ref: string, fallback: string) => {
      return invertObject(options.alias || {})[ref] || fallback || '';
    };
    // SELECT * FROM users JOIN products ON users.id = products.user_id
    const comparison = options.comparison ?? '=';
    const type = options.type ?? 'INNER';
    console.log(this.actualQuery);
    let [table2, column2] = target.split('.');
    let [table1, column1] = reference.split('.');
    table2 = findRef(table2, table2);
    table1 = findRef(table1, table1);
    // if user use target as same table from the select, then we should swap the tables
    const select = this.actualQuery.find((part) => part.query.includes('FROM'));
    const aliasesValues = Object.values(options.alias || {}); // "[P, U]"
    const alias1 = aliasesValues[1] ? aliasesValues[1] : '';
    const alias2 = aliasesValues[0] ? aliasesValues[0] : '';

    if (select && select.query.includes(table2)) {
      this.actualQuery.push({
        query: `${type} JOIN ${table1}${` ${findAlias(table1, alias1)}`} ON ${findAlias(
          table2,
          table2
        )}.${column2} ${comparison} ${findAlias(table1, table1)}.${column1}`,
        level: QueryLevel.TABLE,
      });
      // add alias to the select initial table
      console.log('REACHED HERE!');
      const withFrom = this.actualQuery.findIndex((s) => s.query.includes('FROM') && s.query.includes(table2));
      if (!withFrom) throw new Error('Alias erroring');
      this.actualQuery[withFrom].query = this.actualQuery[withFrom].query + findAlias(table2, alias2);
      return this;
    }

    this.actualQuery.push({
      query: `${type} JOIN ${table2}${` ${findAlias(table2, alias2)}`} ON ${findAlias(table1, table1)}.${column1} ${comparison} ${findAlias(
        table2,
        table2
      )}.${column2}`,
      level: QueryLevel.TABLE,
    });
    console.log('REACHED HERE!');
    const withFrom = this.actualQuery.findIndex((s) => s.query.includes('FROM') && s.query.includes(findRef(table1, table1)));
    if (!withFrom) throw new Error('Alias erroring');
    console.log({ table1, alias1, table2, alias2 });
    this.actualQuery[withFrom].query = this.actualQuery[withFrom].query + ' ' + findAlias(table1, alias1);
    return this;
  }
}
// const qb = new QueryBuilder()
// const db = new DatabaseManager(qb, new Database('f.db')) as unknown as QueryBuilder
// db.createTable('users', table => {
//     table.uuid(),
//         table.string('name'),
//         table.integer('age'),
//         table.timestamps()
// })
// Array.from({ length: 10 }).forEach((_, index) => {
//     db.insert('users', { name: `John Doe ${index}`, age: 18 + index }).run()
// })
// const rows = (db.select('*').from('users').run()) as unknown as { name: string, age: number, id: string }[]
// for (const row of rows) {
//     db.where('id', row.id).update('users', { name: `Jane ${Math.floor(Math.random() * 100)}` }).run()
//     await Bun.sleep(2000)
//     console.log((db.select('*').from('users').where('id', row.id).run()) as unknown as { name: string, age: number, id: string }[])
// }
