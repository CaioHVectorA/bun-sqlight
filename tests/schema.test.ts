import { describe, test, expect } from 'bun:test'
import { QueryBuilder } from '../src/lib/query-builder'
const querybuilder = new QueryBuilder()
describe("Tables and schema", () => {
    test('Should be able to create a table', () => {
        const queryExpected = 'CREATE TABLE users (id INT, name VARCHAR(255))'
        const query = querybuilder.createTable('users', { id: 'INT', name: 'VARCHAR(255)' })
        expect(query.run()).toBe(queryExpected)
    })
    test('Should be able to drop a table', () => {
        const queryExpected = 'DROP TABLE users'
        const query = querybuilder.dropTable('users')
        expect(query.run()).toBe(queryExpected)
    })
})