import { describe, test, expect } from 'bun:test';
import { Comparison, QueryBuilder } from '../src/lib/query-builder';
const querybuilder = new QueryBuilder();
describe('Query builder', () => {
  test('Should be able to create a query', () => {
    const queryExpected = 'SELECT * FROM users';
    const query = querybuilder.select('*').from('users');
    expect(query.run()).toBe(queryExpected);
    const otherQuery = querybuilder.from('users').select('*');
    expect(otherQuery.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with where clause', () => {
    const queryExpected = 'SELECT * FROM users WHERE id = 1';
    const query = querybuilder.select('*').from('users').where('id', 1);
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with multiple where clauses', () => {
    const queryExpected = 'SELECT * FROM users WHERE id = 1 AND name = "John"';
    const query = querybuilder.select('*').from('users').where('id', 1).where('name', 'John');
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with multiple where clauses and or', () => {
    const queryExpected = 'SELECT * FROM users WHERE id = 1 OR name = "John"';
    const query = querybuilder.select('*').from('users').where('id', 1).orWhere('name', 'John');
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with multiple where clauses and or and and', () => {
    const queryExpected = 'SELECT * FROM users WHERE name = "Jason" OR name = "John" AND age = 25';
    const query = querybuilder.select('*').from('users').where('name', 'Jason').orWhere('name', 'John').where('age', 25);
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with different where clauses', () => {
    // >
    const greaterThanExpected = 'SELECT * FROM users WHERE age > 30';
    const greaterThan = querybuilder.select('*').from('users').where('age', '>', 30);
    expect(greaterThan.run()).toBe(greaterThanExpected);

    // <
    const lessThanExpected = 'SELECT * FROM users WHERE age < 30';
    const lessThan = querybuilder.select('*').from('users').where('age', '<', 30);
    expect(lessThan.run()).toBe(lessThanExpected);

    // >=
    const greaterOrEqualExpected = 'SELECT * FROM users WHERE age >= 30';
    const greaterOrEqual = querybuilder.select('*').from('users').where('age', '>=', 30);
    expect(greaterOrEqual.run()).toBe(greaterOrEqualExpected);

    // <=
    const lessOrEqualExpected = 'SELECT * FROM users WHERE age <= 30';
    const lessOrEqual = querybuilder.select('*').from('users').where('age', '<=', 30);
    expect(lessOrEqual.run()).toBe(lessOrEqualExpected);

    // !=
    const notEqualExpected = 'SELECT * FROM users WHERE name != "John"';
    const notEqual = querybuilder.select('*').from('users').where('name', '!=', 'John');
    expect(notEqual.run()).toBe(notEqualExpected);

    // =
    const equalExpected = 'SELECT * FROM users WHERE name = "John"';
    const equal = querybuilder.select('*').from('users').where('name', '=', 'John');
    expect(equal.run()).toBe(equalExpected);
  });

  test('Should be able to create a query with sorting', () => {
    const queryExpected = 'SELECT * FROM users ORDER BY name ASC';
    const query = querybuilder.select('*').from('users').orderBy('name', 'ASC');
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with sorting and limit', () => {
    const queryExpected = 'SELECT * FROM users ORDER BY name ASC LIMIT 10';
    const query = querybuilder.select('*').from('users').orderBy('name', 'ASC').limit(10);
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with sorting and limit and offset', () => {
    const queryExpected = 'SELECT * FROM users ORDER BY name ASC LIMIT 10 OFFSET 5';
    const query = querybuilder.select('*').from('users').orderBy('name', 'ASC').limit(10).offset(5);
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with multiple sorting', () => {
    const queryExpected = 'SELECT * FROM users ORDER BY name ASC , age DESC';
    const query = querybuilder.select('*').from('users').orderBy('name', 'ASC').orderBy('age', 'DESC');
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with where and sorting', () => {
    const queryExpected = 'SELECT * FROM users WHERE id = 1 ORDER BY name ASC';
    const query = querybuilder.select('*').from('users').where('id', 1).orderBy('name', 'ASC');
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with where and sorting and limit', () => {
    const queryExpected = 'SELECT * FROM users WHERE id = 1 ORDER BY name ASC LIMIT 10';
    const query = querybuilder.select('*').from('users').where('id', 1).orderBy('name', 'ASC').limit(10);
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to make an insert query with data', () => {
    const queryExpected = 'INSERT INTO users (name, age) VALUES ("John", 25)';
    const query = querybuilder.insert('users', { name: 'John', age: 25 });
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to make an update query with data and query', () => {
    const queryExpected = 'UPDATE users SET name = "John", age = 25 WHERE id = 1';
    const query = querybuilder.update('users', { name: 'John', age: 25 }).where('id', 1);
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to delete from a table', () => {
    const queryExpected = 'DELETE FROM users WHERE id = 1';
    const query = querybuilder.delete('users').where('id', 1);
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a query with multiple where clauses and or and and and sorting and limit and offset', () => {
    const queryExpected = 'SELECT * FROM users WHERE id = 1 OR name = "John" AND age = 25 ORDER BY name ASC LIMIT 10 OFFSET 5';
    const query = querybuilder
      .select('*')
      .from('users')
      .where('id', 1)
      .orWhere('name', 'John')
      .where('age', 25)
      .orderBy('name', 'ASC')
      .limit(10)
      .offset(5);
    expect(query.run()).toBe(queryExpected);
  });
});
