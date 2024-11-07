import { describe, test, expect } from 'bun:test'
import { QueryBuilder } from '../src/lib/query-builder'
import { DatabaseManager } from '../src/lib/db-manager'
import { Database } from 'bun:sqlite'
const querybuilder = new QueryBuilder()
const db = new DatabaseManager(querybuilder, new Database(':memory:'))
describe("Tables and schema", () => {
    test('Should be able to create a table', () => {
        const queryExpected = 'CREATE TABLE users (id INT, name VARCHAR(255))'
        const query = querybuilder.createTable('users', { id: 'INT', name: 'VARCHAR(255)' })
        const queryRun = query.run()
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
    test('Should be able to create a table with foreign key', () => {
        const queryExpected = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, user_id INTEGER, FOREIGN KEY (user_id) REFERENCES users(id))'
        const queryWithoutConstraints = querybuilder.createTable('users', (table) => {
            table.id()
            table.string('name')
            table.foreign('user_id', 'users.id')
        })
        expect(queryWithoutConstraints.run()).toBe(queryExpected)
        const queryWithCascadeExpected = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, user_id INTEGER, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)'
        const queryWithCascade = querybuilder.createTable('users', (table) => {
            table.id()
            table.string('name')
            table.foreign('user_id', 'users.id', { onDelete: 'CASCADE' })
        })
        expect(queryWithCascade.run()).toBe(queryWithCascadeExpected)
    })
    test('Should be able to create a table with timestamps', () => {
        const queryExpected = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
        const query = querybuilder.createTable('users', (table) => {
            table.id()
            table.string('name')
            table.timestamps()
        })
        expect(query.run()).toBe(queryExpected)
    })
    test('Should be able to create a table with uuid', () => {
        const queryExpected = 'CREATE TABLE users (id UUID PRIMARY KEY, name TEXT NOT NULL)'
        const query = querybuilder.createTable('users', (table) => {
            table.uuid('id')
            table.string('name')
        })
        expect(query.run()).toBe(queryExpected)
    })
    test.todo('Should do relationships with tables')
    // With db managment
    // Example: Products and Users
    test.todo('Should be able to create and a row can be inserted')
    test.todo('Should be able to create a table with timestamps and updated_at should be updated automatically')
    test.todo('Should be able to create with UUID and id should be generated automatically and unique')
    test.todo('Should be able to create a table with autoincrement id and id should be generated automatically and unique')
    test.todo('Should be able to create a table with a foreign key and can do a select with join')
    test.todo('Should be able to create a table with a foreign key and cascade on delete and delete all related rows')
    test.todo('Should be able to create a table with a foreign key and cascade on update and update all related rows')
    // 
})