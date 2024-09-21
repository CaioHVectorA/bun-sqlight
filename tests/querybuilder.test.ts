import { describe, test, expect } from 'bun:test'
const querybuilder: any = {}
describe("Query builder", () => {
    test('Should be able to create a query', () => {
        const queryExpected = 'SELECT * FROM users'
        const query = querybuilder.select('*').from('users')
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with where clause', () => {
        const queryExpected = 'SELECT * FROM users WHERE id = 1'
        const query = querybuilder.select('*').from('users').where('id', 1)
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with multiple where clauses', () => {
        const queryExpected = 'SELECT * FROM users WHERE id = 1 AND name = "John"'
        const query = querybuilder.select('*').from('users').where('id', 1).where('name', 'John')
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with multiple where clauses and or', () => {
        const queryExpected = 'SELECT * FROM users WHERE id = 1 OR name = "John"'
        const query = querybuilder.select('*').from('users').where('id', 1).orWhere('name', 'John')
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with multiple where clauses and or and and', () => {
        const queryExpected = 'SELECT * FROM users WHERE id = 1 OR name = "John" AND age = 25'
        const query = querybuilder.select('*').from('users').where('id', 1).orWhere('name', 'John').where('age', 25)
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with sorting', () => {
        const queryExpected = 'SELECT * FROM users ORDER BY name ASC'
        const query = querybuilder.select('*').from('users').orderBy('name', 'ASC')
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with sorting and limit', () => {
        const queryExpected = 'SELECT * FROM users ORDER BY name ASC LIMIT 10'
        const query = querybuilder.select('*').from('users').orderBy('name', 'ASC').limit(10)
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with sorting and limit and offset', () => {
        const queryExpected = 'SELECT * FROM users ORDER BY name ASC LIMIT 10 OFFSET 5'
        const query = querybuilder.select('*').from('users').orderBy('name', 'ASC').limit(10).offset(5)
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with multiple sorting', () => {
        const queryExpected = 'SELECT * FROM users ORDER BY name ASC, age DESC'
        const query = querybuilder.select('*').from('users').orderBy('name', 'ASC').orderBy('age', 'DESC')
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with where and sorting', () => {
        const queryExpected = 'SELECT * FROM users WHERE id = 1 ORDER BY name ASC'
        const query = querybuilder.select('*').from('users').where('id', 1).orderBy('name', 'ASC')
        expect(query).toBe(queryExpected)
    })
    test('Should be able to create a query with where and sorting and limit', () => {
        const queryExpected = 'SELECT * FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10'
        const query = querybuilder.select('*').from('users').where('id', 1).orderBy('name', 'ASC').limit(10)
        expect(query).toBe(queryExpected)
    })
    test('Should be able to make an insert query with data', () => {
        const queryExpected = 'INSERT INTO users (name, age) VALUES ("John", 25)'
        const query = querybuilder.insert('users', { name: 'John', age: 25 })
        expect(query).toBe(queryExpected)
    })
    test('Should be able to make an update query with data and query', () => {
        const queryExpected = 'UPDATE users SET name = "John", age = 25 WHERE id = 1'
        const query = querybuilder.update('users', { name: 'John', age: 25 }).where('id', 1)
        expect(query).toBe(queryExpected)
    })
})