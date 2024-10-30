import { describe, test, expect } from 'bun:test'
import { QueryBuilder } from '../src/lib/query-builder'
const querybuilder = new QueryBuilder()
describe("Tables and schema", () => {
    test('Should be able to create a table', () => {
        const queryExpected = 'CREATE TABLE users (id INT, name VARCHAR(255))'
        const query = querybuilder.createTable('users', { id: 'INT', name: 'VARCHAR(255)' })
        const queryRun = query.run()
        console.log(queryRun)
        expect(queryRun).toBe(queryExpected)
    })
    test('Should be able to drop a table', () => {
        const queryExpected = 'DROP TABLE users'
        const query = querybuilder.dropTable('users')
        expect(query.run()).toBe(queryExpected)
    })
    // with callbacks with shchema object
    test('Should be able to create a table with schema fallback', () => {
        const queryExpected = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)'
        const query = querybuilder.createTable('users', (table) => {
            table.id()
            table.string('name')
        })
        expect(query.run()).toBe(queryExpected)
    })
    test('Should be able to create a table with default values and nullable', () => {
        const queryExpected = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT DEFAULT \'John Doe\' NOT NULL)'
        const query = querybuilder.createTable('users', (table) => {
            table.id()
            table.string('name', { default: 'John Doe' })
        })
        console.log(query.run())
        expect(query.run()).toBe(queryExpected)
        const nullableQuery = querybuilder.createTable('users', (table) => {
            table.id()
            table.string('name', { nullable: true })
        })
        expect(nullableQuery.run()).toBe('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NULL)')
    })
    test('Should be able to create a table with unique values', () => {
        const queryExpected = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)'
        const query = querybuilder.createTable('users', (table) => {
            table.id()
            table.string('name', { unique: true })
        })
        expect(query.run()).toBe(queryExpected)
    })
    test.todo('Should be able to create a table with foreign key')
    test.todo('Should be able to create a table with timestamps')
    test.todo('Should be able to create a table with uuid')
    test.todo('Should be able to create a table with timestamps and updated_at should be updated automatically')
})