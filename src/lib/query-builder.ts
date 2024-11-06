import { Database } from 'bun:sqlite'
import { DatabaseManager } from './db-manager'
import type { Hooks } from "./hooks"
import { createSchemaCallback, Schema } from "./schema"
import type { Tables } from './table'

export enum QueryLevel {
    CLAUSE = 1,
    TABLE = 2,
    WHERE = 3,
    ORDER_LIMIT = 4
}
export type QueryPart = {
    query: string,
    level: QueryLevel
}
interface SchemaOptions {
    exists?: boolean
}
export interface IQueryBuilder {
    queryBrute?: string
    tables: Tables
    db?: DatabaseManager
    actualQuery: QueryPart[]
    select(fields: string | string[]): this
    from(table: string): this
    where(field: string, value: any): this
    orWhere(field: string, value: any): this
    orderBy(field: string, direction: 'ASC' | 'DESC'): this
    limit(limit: number): this
    dropTable(table: string): this
    createTable(table: string, fields: { [key: string]: string }): this
    insert(table: string, data: { [key: string]: any }): this
    update(table: string, data: { [key: string]: any }): this
    run(): string
}

export class QueryBuilder implements IQueryBuilder {
    tables: Tables = {}
    queryBrute?: string
    db?: DatabaseManager
    actualQuery: QueryPart[] = []
    select(fields: string | string[]): this {
        this.actualQuery.push({ query: `SELECT ${Array.isArray(fields) ? fields.join(', ') : fields}`, level: QueryLevel.CLAUSE })
        return this
    }
    from(table: string): this {
        this.actualQuery.push({ query: `FROM ${table}`, level: QueryLevel.TABLE })
        return this
    }
    where(field: string, value: any): this {
        if (this.actualQuery.find(part => part.query.includes('WHERE'))) {
            this.actualQuery.push({ query: `${field} = ${typeof value === 'string' ? `"${value}"` : value}`, level: QueryLevel.WHERE })
            return this
        }
        this.actualQuery.push({ query: `WHERE ${field} = ${typeof value === 'string' ? `"${value}"` : value}`, level: QueryLevel.WHERE })
        return this
    }
    orWhere(field: string, value: any): this {
        this.actualQuery.push({ query: `OR ${field} = ${typeof value === 'string' ? `"${value}"` : value}`, level: QueryLevel.WHERE })
        return this
    }
    orderBy(field: string, direction: 'ASC' | 'DESC'): this {
        if (this.actualQuery.find(part => part.query.includes('ORDER BY'))) {
            this.actualQuery.push({ query: `, ${field} ${direction}`, level: QueryLevel.ORDER_LIMIT })
            return this
        }
        this.actualQuery.push({ query: `ORDER BY ${field} ${direction}`, level: QueryLevel.ORDER_LIMIT })
        return this
    }
    limit(limit: number): this {
        this.actualQuery.push({ query: `LIMIT ${limit}`, level: QueryLevel.ORDER_LIMIT })
        return this
    }
    dropTable(table: string): this {
        this.actualQuery.push({ query: `DROP TABLE ${table}`, level: QueryLevel.TABLE })
        return this
    }
    createTable(table: string, fields: ({ [key: string]: string } | ((schema: Schema) => void)), options: SchemaOptions = { exists: true }): this {
        if (typeof fields === 'function') {
            createSchemaCallback(table, fields, this)
            return this
        }
        this.actualQuery.push({ query: `CREATE TABLE ${table} (${Object.entries(fields).map(([key, value]) => `${key} ${value}`).join(', ')})`, level: QueryLevel.TABLE })
        return this
        // SELECT * FROM users
    }
    insert(table: string, data: { [key: string]: any }): this {
        this.actualQuery.push({ query: `INSERT INTO ${table} (${Object.keys(data).join(', ')}) VALUES (${Object.values(data).map(value => typeof value === 'string' ? `"${value}"` : value).join(', ')})`, level: QueryLevel.CLAUSE })
        return this
    }
    update(table: string, data: { [key: string]: any }): this {
        this.actualQuery.push({ query: `UPDATE ${table} SET ${Object.entries(data).map(([key, value]) => `${key} = ${typeof value === 'string' ? `"${value}"` : value}`).join(', ')}`, level: QueryLevel.CLAUSE })
        return this
    }
    delete(table: string): this {
        this.actualQuery.push({ query: `DELETE FROM ${table}`, level: QueryLevel.CLAUSE })
        return this
    }
    offset(offset: number): this {
        this.actualQuery.push({ query: `OFFSET ${offset}`, level: QueryLevel.ORDER_LIMIT })
        return this
    }
    run(): string {
        if (this.queryBrute) {
            const temp = this.queryBrute
            this.queryBrute = undefined
            return temp
        }
        const sorted = this.actualQuery.sort((a, b) => a.level - b.level)
        // add AND clause logic
        const queryWithAnd = sorted.map((part, index) => {
            if (index === 0) return part.query
            const nextPart = sorted[index + 1]
            if (part.level === QueryLevel.WHERE && (sorted[index - 1].level === QueryLevel.WHERE && !part.query.startsWith('OR'))) {
                return `AND ${part.query}`
            }
            return part.query
        })
        this.actualQuery = []
        return queryWithAnd.join(' ')
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