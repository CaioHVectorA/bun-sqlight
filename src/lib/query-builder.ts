import { DatabaseManager } from './db-manager';
import { createSchemaCallback, Schema } from './schema';
import type { Tables } from './table';
import { invertObject } from '../utils/invert-obj';
import { normalizeInsertData } from './normalize-insert-data';
import type { ColumnBuilder } from './schema/primitives';
import { generateTableTypes, mapType } from './type-generator';
import type { SQLITE_TYPES } from '../utils/sqlite.types';
import type { TableNames, TypeTables } from '../table-types';
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
  ORDER_LIMIT = 4,
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

export interface IQueryBuilder<
  TypeTablesSchema extends Record<keyof TypeTablesSchema, TableSchemaShape> = TypeTables,
  TableNamesSchema extends keyof TypeTablesSchema & string = keyof TypeTablesSchema & string
> {
  queryBrute?: string;
  tables: Tables;
  db?: DatabaseManager<TypeTablesSchema, TableNamesSchema>;
  actualQuery: QueryPart[];
  select<T extends TableNamesSchema>(...fields: (keyof TypeTablesSchema[T]['select'] | '*')[]): this;
  from<T extends TableNamesSchema>(table: T): this;
  where(field: string, value: any): this;
  orWhere(field: string, value: any): this;
  orderBy(field: string, direction: 'ASC' | 'DESC'): this;
  limit(limit: number): this;
  dropTable<T extends TableNamesSchema>(table: T): this;
  createTable(
    table: string,
    fields: { [key: string]: any } | ((schema: Schema) => void),
    options?: SchemaOptions
  ): this;
  insert<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['insert']): this;
  update<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['update']): this;
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
  select<T extends TableNamesSchema>(...fields: (keyof TypeTablesSchema[T]['select'] | '*')[]): this {
    this.actualQuery.push({
      query: `SELECT ${(Array.isArray(fields) ? fields.join(', ') : fields) || '*'}`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }
  from<T extends TableNamesSchema>(table: T): this {
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
    console.log({ fields });
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
    console.log(this.tables);
    generateTableTypes(table, this.tables[table], this.db?.options);
    return this;
    // SELECT * FROM users
  }
  insert<T extends TableNamesSchema>(table: T, data: TypeTablesSchema[T]['insert']): this {
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

    const aliasVal2 = findAlias(table2, alias2);
    const aliasStr2 = aliasVal2 ? ` ${aliasVal2}` : '';
    const aliasVal1 = findAlias(table1, alias1);
    const aliasStr1 = aliasVal1 ? ` ${aliasVal1}` : '';

    if (select && select.query.includes(table2)) {
      this.actualQuery.push({
        query: `${type} JOIN ${table1}${aliasStr1} ON ${findAlias(
          table2,
          table2
        )}.${column2} ${comparison} ${findAlias(table1, table1)}.${column1}`,
        level: QueryLevel.TABLE,
      });
      // add alias to the select initial table
      console.log('REACHED HERE!');
      const withFrom = this.actualQuery.findIndex((s) => s.query.includes('FROM') && s.query.includes(table2));
      if (withFrom === -1) throw new Error('Alias erroring');
      if (aliasVal2) {
        this.actualQuery[withFrom].query = this.actualQuery[withFrom].query + ' ' + aliasVal2;
      }
      return this;
    }

    this.actualQuery.push({
      query: `${type} JOIN ${table2}${aliasStr2} ON ${findAlias(table1, table1)}.${column1} ${comparison} ${findAlias(
        table2,
        table2
      )}.${column2}`,
      level: QueryLevel.TABLE,
    });
    console.log('REACHED HERE!');
    const withFrom = this.actualQuery.findIndex((s) => s.query.includes('FROM') && s.query.includes(findRef(table1, table1)));
    if (withFrom === -1) throw new Error('Alias erroring');
    console.log({ table1, alias1, table2, alias2 });
    if (aliasVal1) {
      this.actualQuery[withFrom].query = this.actualQuery[withFrom].query + ' ' + aliasVal1;
    }
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
