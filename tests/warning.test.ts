import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from '../src/lib/connect';
import type { DatabaseManager } from '../src/lib/db-manager';
import type { QueryBuilder } from '../src/lib/query-builder';

describe('Warning about dangerous queries', () => {
  let db: DatabaseManager;

  beforeEach(() => {
    db = new Database(':memory:') as DatabaseManager;
    //@ts-ignore
    db.createTable('users', (t) => {
      t.id(), t.string('name'), t.integer('age');
    });
  });
  afterEach(() => {
    db.close();
  });

  // Tests for dangerous SQL statements
  test('should warn if the query has a DELETE statement without a WHERE clause', () => {
    expect(() => db.raw('DELETE FROM users')).toThrow();
  });

  test('should warn if the query has an UPDATE statement without a WHERE clause', () => {
    expect(() => db.raw('UPDATE users SET name="admin"')).toThrow();
  });

  test('should warn if the query has a DROP DATABASE statement', () => {
    expect(() => db.raw('DROP DATABASE test_db')).toThrow();
  });

  test('should warn if the query has a TRUNCATE TABLE statement', () => {
    expect(() => db.raw('TRUNCATE TABLE users')).toThrow();
  });

  // Tests for SQL injection patterns
  test('should warn if the query has a SQL injection: OR 1=1', () => {
    expect(() => db.raw('SELECT * FROM users WHERE UserId = 105 OR 1=1;')).toThrow();
  });

  // Additional dangerous query patterns from the testThrowing examples

  test('dangerous query with semicolon and DROP TABLE should throw error', () => {
    expect(() => db.raw('SELECT * FROM users; DROP TABLE users;')).toThrow();
  });

  test('dangerous query with -- comment and DROP TABLE should throw error', () => {
    expect(() => db.raw('SELECT * FROM users; -- DROP TABLE users;')).toThrow();
  });

  test('dangerous query with # comment and DROP TABLE should throw error', () => {
    expect(() => db.raw('SELECT * FROM users; # DROP TABLE users;')).toThrow();
  });

  test('dangerous query with /* comment and DROP TABLE should throw error', () => {
    expect(() => db.raw('SELECT * FROM users; /* DROP TABLE users;')).toThrow();
  });

  test('dangerous query with inline SQL injection using -- comment', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" -- AND password = "password";')).toThrow();
  });

  test('dangerous query with inline SQL injection using /* comment', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" /* AND password = "password";')).toThrow();
  });

  test('dangerous query with injection using OR "1"="1"', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" OR "1"="1";')).toThrow();
  });

  test('dangerous query with injection using OR 1=1 and -- comment', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" OR 1=1 -- ;')).toThrow();
  });

  test('dangerous query with injection using OR 1=1 and /* comment', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" OR 1=1 /* ;')).toThrow();
  });

  test('dangerous query with injection using OR 1=1 and # comment', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" OR 1=1 # ;')).toThrow();
  });

  test('dangerous query with injection using AND password equals empty and OR "1"="1"', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" AND password = "" OR "1"="1";')).toThrow();
  });

  test('dangerous query with injection using AND password equals empty and OR 1=1 with -- comment', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" AND password = "" OR 1=1 -- ;')).toThrow();
  });

  test('dangerous query with injection using AND password equals empty and OR 1=1 with /* comment', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" AND password = "" OR 1=1 /* ;')).toThrow();
  });

  test('dangerous query with injection using AND password equals empty and OR 1=1 with # comment', () => {
    expect(() => db.raw('SELECT * FROM users WHERE name = "admin" AND password = "" OR 1=1 # ;')).toThrow();
  });
});
