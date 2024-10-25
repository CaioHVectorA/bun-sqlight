import { QueryBuilder, QueryLevel, type IQueryBuilder } from "./query-builder"

type Options<T> = {
    default: T,
    unique: boolean,
    nullable: boolean
}
interface TableSchemaHandles {
    queryBuilder: IQueryBuilder
    table: string
    id(name?: string): void
    string(name: string, options: Options<string>): void
    integer(name: string, options: Options<number>): void
    boolean(name: string, options: Options<boolean>): void
    float(name: string, options: Options<number>): void
    uuid(name?: string): void // unique automatic, PK automatic, as id name default 
    timestamps(): void
    foreign(name: string, reference: `${string}.${string}`): void // table.column
}

export class Schema implements TableSchemaHandles {
    queryBuilder: IQueryBuilder
    table: string
    constructor(table: string, queryBuilder: IQueryBuilder) {
        this.queryBuilder = queryBuilder
        this.table = table
        // this.queryBuilder.actualQuery.push({ query: `CREATE TABLE ${table}`, level: QueryLevel.TABLE })
    }
    id(name = 'id') {
        this.queryBuilder.actualQuery.push({ query: `${name} INTEGER PRIMARY KEY AUTOINCREMENT`, level: QueryLevel.TABLE })
    }
    string(name: string, options?: Options<string>) {
        const defaultText = options?.default ? `DEFAULT '${options.default}'` : ''
        const uniqueText = options?.unique ? 'UNIQUE' : ''
        const nullableText = options?.nullable ? 'NULL' : 'NOT NULL'
        this.queryBuilder.actualQuery.push({ query: `${name} TEXT ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE })
    }
    integer(name: string, options?: Options<number>) {
        const defaultText = options?.default ? `DEFAULT ${options.default}` : ''
        const uniqueText = options?.unique ? 'UNIQUE' : ''
        const nullableText = options?.nullable ? 'NULL' : 'NOT NULL'
        this.queryBuilder.actualQuery.push({ query: `${name} INTEGER ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE })
    }
    boolean(name: string, options?: Options<boolean>) {
        const defaultText = options?.default ? `DEFAULT ${options.default}` : ''
        const uniqueText = options?.unique ? 'UNIQUE' : ''
        const nullableText = options?.nullable ? 'NULL' : 'NOT NULL'
        this.queryBuilder.actualQuery.push({ query: `${name} BOOLEAN ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE })
    }
    float(name: string, options?: Options<number>) {
        const defaultText = options?.default ? `DEFAULT ${options.default}` : ''
        const uniqueText = options?.unique ? 'UNIQUE' : ''
        const nullableText = options?.nullable ? 'NULL' : 'NOT NULL'
        this.queryBuilder.actualQuery.push({ query: `${name} REAL ${defaultText} ${uniqueText} ${nullableText}`, level: QueryLevel.TABLE })
    }
    uuid(name = 'id') {
        if (!this.queryBuilder.db) return
        this.queryBuilder.db.hooks.beforeInsert.push({ [this.table]: (q) => {
            // "INSERT INTO users (name, age) VALUES (\"John Doe\", 18)" => "INSERT INTO users (id, name, age) VALUES (uuid(), \"John Doe\", 18)"
            const insertIndex = q.findIndex(part => part.query.startsWith('INSERT INTO'))
            const insertQuery = q[insertIndex].query
            const insertQueryParts = insertQuery.split(' ')
            const table = insertQueryParts[2]
            const fields = []
            const firstField = insertQueryParts.findIndex(parts => parts.includes('('))
            const lastField = insertQueryParts.findIndex(parts => parts.includes(')'))
            for (let i = firstField; i < lastField + 1; i++) {
                fields.push(insertQueryParts[i].replace(',', '').replace(')', '').replace('(', ''))
            }
            const values = q[insertIndex].query.split('VALUES')[1].split('(')[1].split(')')[0].split(',').map(value => value.trim())
            fields.push(name)
            values.push(`"${crypto.randomUUID()}"`)        
            q[insertIndex].query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${values.join(', ')})`
            console.log({q})
        } })
        this.queryBuilder.actualQuery.push({ query: `${name} UUID PRIMARY KEY`, level: QueryLevel.TABLE })
    }
    timestamps(): void {
        this.queryBuilder.actualQuery.push({ query: `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, level: QueryLevel.TABLE })
        this.queryBuilder.actualQuery.push({ query: `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, level: QueryLevel.TABLE })
    }
    foreign(name: string, reference: `${string}.${string}`) {
        this.queryBuilder.actualQuery.push({ query: `${name} INTEGER REFERENCES ${reference}`, level: QueryLevel.TABLE })
    }
}

export function createSchemaCallback(table: string, callback: (schema: Schema) => void, queryBuilder: IQueryBuilder) {
    const qb = new QueryBuilder()
    qb.db = queryBuilder.db
    const schema = new Schema(table, qb)
    callback(schema)
    const commands =  schema.queryBuilder.actualQuery
    let query = `CREATE TABLE ${table} (${commands.map(command => command.query).join(', ')})`
    // remove more of one space on query to one space
    query = query.replace(/\s{2,}/g, ' ')
    queryBuilder.queryBrute = query
    // transpile commands to create table syntax
}

// createSchemaCallback('users', table => {
//     table.id()
//     table.string('name', { default: 'John Doe', unique: true, nullable: false })
//     table.integer('age', { default: 18, unique: false, nullable: false })
//     table.boolean('active', { default: false, unique: false, nullable: false })
//     table.timestamps()
//     table.uuid()
// }, new QueryBuilder())

// createSchemaCallback('users', table => {
//     table.id()
//     table.
// })
// expectate input:
// db.createTable('users', table => {
//     table.uuid('id'),
//     table.string('name')
//     table.integer('age')
//     table.boolean('active')
//     table.timestamps() // created_at, updated_at
//     table.unique('id')
//     // or
//     table.primary('id')
//     table.foreign('id').references('other_table.id')
// })
// expectate output:
// CREATE TABLE users (
//     id UUID,