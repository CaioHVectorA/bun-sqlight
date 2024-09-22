enum QueryLevel {
    CLAUSE = 1,
    TABLE = 2,
    WHERE = 3,
    ORDER_LIMIT = 4
}
type QueryPart = {
    query: string,
    level: QueryLevel
}
// query:
// SELECT * FROM users WHERE id = 1

// Should give the same result as:
// from("users").select('*').where('id', 1)
// where('id', 1).select("*").from("users")
// select("*").where('id', 1).from("users")
export interface IQueryBuilder {
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
        this.actualQuery.push({ query: `WHERE ${field} = ${typeof value === 'string' ? `"${value}"` : value}`, level: QueryLevel.WHERE })
        return this
    }
    orWhere(field: string, value: any): this {
        this.actualQuery.push({ query: `OR ${field} = ${typeof value === 'string' ? `"${value}"` : value}`, level: QueryLevel.WHERE })
        return this
    }
    orderBy(field: string, direction: 'ASC' | 'DESC'): this {
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
    createTable(table: string, fields: { [key: string]: string }): this {
        this.actualQuery.push({ query: `CREATE TABLE ${table} (${Object.entries(fields).map(([key, value]) => `${key} ${value}`).join(', ')})`, level: QueryLevel.TABLE })
        return this
    }
    insert(table: string, data: { [key: string]: any }): this {
        this.actualQuery.push({ query: `INSERT INTO ${table} (${Object.keys(data).join(', ')}) VALUES (${Object.values(data).map(value => typeof value === 'string' ? `"${value}"` : value).join(', ')})`, level: QueryLevel.CLAUSE })
        return this
    }
    update(table: string, data: { [key: string]: any }): this {
        this.actualQuery.push({ query: `UPDATE ${table} SET ${Object.entries(data).map(([key, value]) => `${key} = ${typeof value === 'string' ? `"${value}"` : value}`).join(', ')}`, level: QueryLevel.CLAUSE })
        return this
    }
    run(): string {
        const query = ``
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

const querybuilder = new QueryBuilder()
