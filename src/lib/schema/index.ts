import type { SQLITE_TYPES } from '../../utils/sqlite.types';
import { QueryBuilder, QueryLevel, type ColumnMetadata, type IQueryBuilder } from '../query-builder';
import { generateTableTypes, mapType } from '../type-generator';

type Options<T> = Partial<{
  default: T;
  unique: boolean;
  nullable: boolean;
}>;

interface TableSchemaHandles {
  queryBuilder: IQueryBuilder;
  table: string;
  mainQuerybuilder: IQueryBuilder;
  id(name?: string): void;
  string(name: string, options?: Options<string>): void;
  integer(name: string, options?: Options<number>): void;
  boolean(name: string, options?: Options<boolean>): void;
  float(name: string, options?: Options<number>): void;
  date(name: string, options?: Options<string>): void;
  datetime(name: string, options?: Options<string>): void;
  uuid(name?: string): void;
  timestamps(): void;
  foreign(
    name: string,
    reference: `${string}.${string}`,
    options?: Options<string> & {
      onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
      onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
    }
  ): void;
}

function orderCommands(a: { query: string; level: QueryLevel }, b: { query: string; level: QueryLevel }) {
  return a.level - b.level;
}

export class Schema implements TableSchemaHandles {
  queryBuilder: IQueryBuilder;
  table: string;
  mainQuerybuilder: IQueryBuilder;
  constructor(table: string, queryBuilder: IQueryBuilder, mainQuerybuilder: IQueryBuilder) {
    this.queryBuilder = queryBuilder;
    this.table = table;
    this.mainQuerybuilder = mainQuerybuilder;
    this.mainQuerybuilder.tables[table] = {};
    this.queryBuilder.tables[table] = {};
  }

  // Método auxiliar para reduzir a repetição na criação de colunas
  private addColumn(name: string, type: SQLITE_TYPES, options?: Options<any>): void {
    const defaultText =
      options?.default !== undefined
        ? `DEFAULT ${['TEXT', 'DATE', 'DATETIME'].includes(type) ? `'${options.default}'` : options.default}`
        : '';
    const uniqueText = options?.unique ? 'UNIQUE' : '';
    const nullableText = options?.nullable ? 'NULL' : 'NOT NULL';
    const query = `${name} ${type} ${defaultText} ${uniqueText} ${nullableText}`.replace(/\s+/g, ' ').trim();
    this.queryBuilder.actualQuery.push({ query, level: QueryLevel.TABLE });
    const tsType = mapType(type);
    const columnMeta: ColumnMetadata = {
      sqlType: type,
      tsType,
      nullable: options?.nullable || false,
      hasDefault: options?.default !== undefined,
    };
    this.mainQuerybuilder.tables[this.table][name] = columnMeta;
    this.queryBuilder.tables[this.table][name] = columnMeta;
  }

  id(name = 'id'): void {
    const query = `${name} INTEGER PRIMARY KEY AUTOINCREMENT`;
    this.queryBuilder.actualQuery.unshift({ query, level: QueryLevel.TABLE });
    const columnMeta: ColumnMetadata = {
      sqlType: 'INTEGER',
      tsType: 'number',
      isPrimary: true,
      hasDefault: true,
      nullable: false,
    };
    this.queryBuilder.tables[this.table][name] = columnMeta;
    this.mainQuerybuilder.tables[this.table][name] = columnMeta;
  }

  string(name: string, options?: Options<string>): void {
    this.addColumn(name, 'TEXT', options);
  }

  integer(name: string, options?: Options<number>): void {
    this.addColumn(name, 'INTEGER', options);
  }

  boolean(name: string, options?: Options<boolean>): void {
    this.addColumn(name, 'BOOLEAN', options);
  }

  float(name: string, options?: Options<number>): void {
    this.addColumn(name, 'REAL', options);
  }

  date(name: string, options?: Options<string>): void {
    this.addColumn(name, 'DATE', options);
  }

  datetime(name: string, options?: Options<string>): void {
    this.addColumn(name, 'DATETIME', options);
  }

  uuid(name = 'id'): void {
    if (!this.queryBuilder.db) return;
    this.queryBuilder.db.hooks.beforeInsert.push({
      [this.table]: (queries) => {
        const insertIndex = queries.findIndex((q) => q.query.startsWith('INSERT INTO'));
        if (insertIndex === -1) return;
        const insertQuery = queries[insertIndex].query;
        const tableName = insertQuery.split(' ')[2];
        const fieldsMatch = insertQuery.match(/\(([^)]+)\)/);
        const valuesMatch = insertQuery.match(/VALUES\s*\(([^)]+)\)/i);
        if (!fieldsMatch || !valuesMatch) return;
        const fields = fieldsMatch[1].split(',').map((f) => f.trim());
        const values = valuesMatch[1].split(',').map((v) => v.trim());
        fields.push(name);
        values.push(`"${crypto.randomUUID()}"`);
        queries[insertIndex].query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${values.join(', ')})`;
      },
    });
    const query = `${name} UUID PRIMARY KEY`;
    this.queryBuilder.actualQuery.unshift({ query, level: QueryLevel.TABLE });
    const columnMeta: ColumnMetadata = {
      sqlType: 'UUID',
      tsType: 'string',
      isPrimary: true,
      hasDefault: true,
      nullable: false,
    };
    this.mainQuerybuilder.tables[this.table][name] = columnMeta;
    this.queryBuilder.tables[this.table][name] = columnMeta;
  }

  timestamps(): void {
    this.addColumn('created_at', 'TIMESTAMP', { default: 'CURRENT_TIMESTAMP', nullable: false });
    this.addColumn('updated_at', 'TIMESTAMP', { default: 'CURRENT_TIMESTAMP', nullable: false });
    if (!this.queryBuilder.db) return;
    this.queryBuilder.db.hooks.beforeUpdate.push({
      [this.table]: (queries) => {
        const updateIndex = queries.findIndex((q) => q.query.startsWith('UPDATE'));
        const whereIndex = queries.findIndex((q) => q.query.startsWith('WHERE'));
        if (updateIndex === -1 || whereIndex === -1) return;
        const setClause = queries[updateIndex].query.split('SET')[1].trim();
        const updatedSetClause = `${setClause}, updated_at = CURRENT_TIMESTAMP`;
        queries[updateIndex].query = `UPDATE ${this.table} SET ${updatedSetClause} ${queries[whereIndex].query}`.replace(/"/g, `'`);
        queries[whereIndex].query = '';
      },
    });
  }

  foreign(
    name: string,
    reference: `${string}.${string}`,
    options?: Options<string> & {
      onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
      onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
    }
  ): void {
    const [refTable, refColumn] = reference.split('.');
    const schema = this.mainQuerybuilder.tables[refTable];
    if (!schema) throw new Error('Table not found');
    const type = schema[refColumn];
    const onDelete = options?.onDelete ? ` ON DELETE ${options.onDelete}` : '';
    const onUpdate = options?.onUpdate ? ` ON UPDATE ${options.onUpdate}` : '';
    const query = `${name} ${type}, FOREIGN KEY (${name}) REFERENCES ${refTable}(${refColumn})${onDelete}${onUpdate}`;
    this.queryBuilder.actualQuery.push({ query, level: QueryLevel.WHERE });
  }
}

export function createSchemaCallback(table: string, callback: (schema: Schema) => void, queryBuilder: IQueryBuilder) {
  const qb = new QueryBuilder();
  qb.db = queryBuilder.db;
  const schema = new Schema(table, qb, queryBuilder);
  callback(schema);
  generateTableTypes(table, queryBuilder.tables[table]);
  const commands = schema.queryBuilder.actualQuery.sort(orderCommands).map((c) => c.query);
  let query = `CREATE TABLE ${table} (${commands.join(', ')})`;
  query = query.replace(/\s{2,}/g, ' ');
  queryBuilder.queryBrute = query;
}
