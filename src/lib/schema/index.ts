import { QueryBuilder, QueryLevel, type IQueryBuilder } from '../query-builder';

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
  string(name: string, options: Options<string>): void;
  integer(name: string, options: Options<number>): void;
  boolean(name: string, options: Options<boolean>): void;
  float(name: string, options: Options<number>): void;
  uuid(name?: string): void; // unique automatic, PK automatic, as id name default
  timestamps(): void;
  foreign(name: string, reference: `${string}.${string}`): void; // table.column
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
    // this.queryBuilder.actualQuery.push({ query: `CREATE TABLE ${table}`, level: QueryLevel.TABLE })
  }
  id(name = 'id') {
    this.queryBuilder.actualQuery.unshift({ query: `${name} INTEGER PRIMARY KEY AUTOINCREMENT`, level: QueryLevel.TABLE });
    this.mainQuerybuilder.tables[this.table][name] = 'INTEGER';
  }
  string(name: string, options?: Options<string>) {
    const defaultText = options?.default ? `DEFAULT '${options.default}'` : '';
    const uniqueText = options?.unique ? 'UNIQUE' : '';
    const nullableText = options?.nullable ? 'NULL' : 'NOT NULL';
    this.queryBuilder.actualQuery.push({ query: `${name} TEXT ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE });
    this.mainQuerybuilder.tables[this.table][name] = 'TEXT';
  }
  integer(name: string, options?: Options<number>) {
    const defaultText = options?.default ? `DEFAULT ${options.default}` : '';
    const uniqueText = options?.unique ? 'UNIQUE' : '';
    const nullableText = options?.nullable ? 'NULL' : 'NOT NULL';
    this.queryBuilder.actualQuery.push({ query: `${name} INTEGER ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE });
    this.mainQuerybuilder.tables[this.table][name] = 'INTEGER';
  }
  boolean(name: string, options?: Options<boolean>) {
    const defaultText = options?.default ? `DEFAULT ${options.default}` : '';
    const uniqueText = options?.unique ? 'UNIQUE' : '';
    const nullableText = options?.nullable ? 'NULL' : 'NOT NULL';
    this.queryBuilder.actualQuery.push({ query: `${name} BOOLEAN ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE });
    this.mainQuerybuilder.tables[this.table][name] = 'BOOLEAN';
  }
  float(name: string, options?: Options<number>) {
    const defaultText = options?.default ? `DEFAULT ${options.default}` : '';
    const uniqueText = options?.unique ? 'UNIQUE' : '';
    const nullableText = options?.nullable ? 'NULL' : 'NOT NULL';
    this.queryBuilder.actualQuery.push({ query: `${name} REAL ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE });
    this.mainQuerybuilder.tables[this.table][name] = 'REAL';
  }
  date(name: string, options?: Options<string>) {
    const defaultText = options?.default ? `DEFAULT '${options.default}'` : '';
    const uniqueText = options?.unique ? 'UNIQUE' : '';
    const nullableText = options?.nullable ? 'NULL' : 'NOT NULL';
    this.queryBuilder.actualQuery.push({ query: `${name} DATE ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE });
    this.mainQuerybuilder.tables[this.table][name] = 'DATE';
  }
  datetime(name: string, options?: Options<string>) {
    const defaultText = options?.default ? `DEFAULT '${options.default}'` : '';
    const uniqueText = options?.unique ? 'UNIQUE' : '';
    const nullableText = options?.nullable ? 'NULL' : 'NOT NULL';
    this.queryBuilder.actualQuery.push({ query: `${name} DATETIME ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE });
    this.mainQuerybuilder.tables[this.table][name] = 'DATETIME';
  }
  uuid(name = 'id') {
    if (!this.queryBuilder.db) return;
    this.queryBuilder.db.hooks.beforeInsert.push({
      [this.table]: (q) => {
        // "INSERT INTO users (name, age) VALUES (\"John Doe\", 18)" => "INSERT INTO users (id, name, age) VALUES (uuid(), \"John Doe\", 18)"
        const insertIndex = q.findIndex((part) => part.query.startsWith('INSERT INTO'));
        const insertQuery = q[insertIndex].query;
        const insertQueryParts = insertQuery.split(' ');
        const table = insertQueryParts[2];
        const fields = [];
        const firstField = insertQueryParts.findIndex((parts) => parts.includes('('));
        const lastField = insertQueryParts.findIndex((parts) => parts.includes(')'));
        for (let i = firstField; i < lastField + 1; i++) {
          fields.push(insertQueryParts[i].replace(',', '').replace(')', '').replace('(', ''));
        }
        const values = q[insertIndex].query
          .split('VALUES')[1]
          .split('(')[1]
          .split(')')[0]
          .split(',')
          .map((value) => value.trim());
        fields.push(name);
        values.push(`"${crypto.randomUUID()}"`);
        q[insertIndex].query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${values.join(', ')})`;
      },
    });
    this.queryBuilder.actualQuery.unshift({ query: `${name} UUID PRIMARY KEY`, level: QueryLevel.TABLE });
    this.mainQuerybuilder.tables[this.table][name] = 'UUID';
  }
  timestamps(): void {
    this.queryBuilder.actualQuery.push({ query: `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, level: QueryLevel.TABLE });
    this.queryBuilder.actualQuery.push({ query: `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, level: QueryLevel.TABLE });
    if (!this.queryBuilder.db) return;
    // with using hooks.afterUpdate hook, we should update updated_at field with current timestamp
    this.queryBuilder.db.hooks.beforeUpdate.push({
      [this.table]: (q) => {
        // Find the index of the UPDATE query
        const updateIndex = q.findIndex((part) => part.query.startsWith('UPDATE'));
        const updateQuery = q[updateIndex].query;

        // Find the index of the WHERE query
        const whereIndex = q.findIndex((part) => part.query.startsWith('WHERE'));
        const whereQuery = q[whereIndex].query;

        // Extract the SET clause from the UPDATE query
        const setClause = updateQuery.split('SET')[1].trim();
        // Add updated_at field to the SET clause
        const updatedSetClause = `${setClause}, updated_at = CURRENT_TIMESTAMP`;
        // console.log({ setClause, updatedSetClause })
        const newUpdateQuery = `UPDATE ${this.table} SET ${updatedSetClause} ${whereQuery}`.replaceAll(`"`, `'`);
        // console.log({ newUpdateQuery })
        // Reconstruct the UPDATE query with the updated SET clause
        q[updateIndex].query = newUpdateQuery;
        q[whereIndex].query = '';
      },
    });
    this.mainQuerybuilder.tables[this.table]['created_at'] = 'TIMESTAMP';
    this.mainQuerybuilder.tables[this.table]['updated_at'] = 'TIMESTAMP';
  }
  foreign(
    name: string,
    reference: `${string}.${string}`,
    options?: Options<string> & {
      onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
      onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
    }
  ) {
    const [table, column] = reference.split('.');
    const schema = this.mainQuerybuilder.tables[table];
    // console.log({ table, column, tables: this.mainQuerybuilder.tables })
    if (!schema) throw new Error('Table not found');
    const type = schema[column];
    // console.log({ type })
    const onDelete = options?.onDelete ? ` ON DELETE ${options.onDelete}` : '';
    const onUpdate = options?.onUpdate ? ` ON UPDATE ${options.onUpdate}` : '';
    this.queryBuilder.actualQuery.push({
      query: `${name} ${type}, FOREIGN KEY (${name}) REFERENCES ${table}(${column})${onDelete}${onUpdate}`,
      level: QueryLevel.WHERE,
    });
  }
}

export function createSchemaCallback(table: string, callback: (schema: Schema) => void, queryBuilder: IQueryBuilder) {
  const qb = new QueryBuilder();
  qb.db = queryBuilder.db;
  const schema = new Schema(table, qb, queryBuilder);
  callback(schema);
  const commands = schema.queryBuilder.actualQuery;
  let query = `CREATE TABLE ${table} (${commands
    .sort(orderCommands)
    .map((command) => command.query)
    .join(', ')})`;
  // remove more of one space on query to one space
  query = query.replace(/\s{2,}/g, ' ');
  queryBuilder.queryBrute = query;
  // transpile commands to create table syntax
}
