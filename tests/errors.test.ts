import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  Sqlight,
  SqlightValidationError,
  SqlightSecurityError,
  SqlightQueryError,
  QueryBuilder,
} from '../src/index';

describe('Error Handling and Safety Validations', () => {
  let db: Sqlight;

  beforeEach(() => {
    db = new Sqlight(':memory:');
    db.createTable('users', (t) => {
      t.id();
      t.string('name');
    });
  });

  afterEach(() => {
    db.close();
  });

  test('Should throw SqlightValidationError when SELECT is executed without FROM', () => {
    const qb = new QueryBuilder();
    qb.select('id', 'name');
    expect(() => qb.run()).toThrow(SqlightValidationError);
  });

  test('Should throw SqlightSecurityError when UPDATE/DELETE is run without WHERE in safeMode', () => {
    const qb = new QueryBuilder();
    qb.delete('users');
    expect(() => qb.run()).toThrow(SqlightSecurityError);

    const qb2 = new QueryBuilder();
    qb2.update('users', { name: 'New' } as any);
    expect(() => qb2.run()).toThrow(SqlightSecurityError);
  });

  test('Should allow UPDATE/DELETE without WHERE when allowAll() is explicitly chained', () => {
    const qb = new QueryBuilder();
    qb.delete('users').allowAll();
    expect(qb.run()).toBe('DELETE FROM users');
  });

  test('Should allow UPDATE/DELETE on DatabaseManager when allowAll() is used', () => {
    db.table('users').create({ name: 'Alice' });
    db.table('users').create({ name: 'Bob' });
    expect(db.table('users').count()).toBe(2);

    expect(() => db.allowAll().delete('users').run()).not.toThrow();
    expect(db.table('users').count()).toBe(0);
  });

  test('Should throw SqlightQueryError on invalid SQL in raw()', () => {
    expect(() => db.raw('INVALID SYNTAX TABLE')).toThrow(SqlightQueryError);
  });

  test('Should support object condition in where() and whereIn/whereNull', () => {
    db.table('users').create({ name: 'Charlie' });
    db.table('users').create({ name: 'David' });

    const charlie = db.select('*').from('users').where({ name: 'Charlie' }).first() as any;
    expect(charlie?.name).toBe('Charlie');

    const inList = db.select('*').from('users').whereIn('name', ['Charlie', 'David']).run();
    expect(inList).toHaveLength(2);
  });
});
