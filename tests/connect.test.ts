import { describe, test, expect } from 'bun:test'
import { Sqlight } from '../src/lib/connect'

describe("Connection to SQLite DB", () => {
    test('Should be able to connect to a database', () => {
        const db = new Sqlight(':memory:');
        expect(db).toBeDefined();
        db.close();
    });
    test('Should be able to disconnect from a database', () => {
        const db = new Sqlight(':memory:');
        expect(() => db.close()).not.toThrow();
    });
    test('Should be able to run a query', () => {
        const db = new Sqlight(':memory:');
        db.raw("CREATE TABLE test_connect (id INTEGER PRIMARY KEY, name TEXT)");
        db.raw("INSERT INTO test_connect (name) VALUES ('Alice')");
        const result = db.raw("SELECT * FROM test_connect");
        expect(result).toEqual([{ id: 1, name: 'Alice' }]);
        db.close();
    });
})