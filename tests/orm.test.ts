import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Sqlight, BunSqlight } from '../src/index';

describe('ORM / TableRepository API', () => {
  let db: Sqlight;

  beforeEach(() => {
    db = new Sqlight(':memory:');
    db.createTable('users', (t) => {
      t.id();
      t.string('name');
      t.integer('age');
      t.timestamps();
    });
  });

  afterEach(() => {
    db.close();
  });

  test('Should support BunSqlight alias', () => {
    expect(BunSqlight).toBe(Sqlight);
    const instance = new BunSqlight(':memory:');
    expect(instance).toBeDefined();
    instance.close();
  });

  test('Should create and find a record by id', () => {
    const users = db.table('users');
    const created = users.create({ name: 'Alice', age: 30 });

    expect(created).toBeDefined();
    expect(created.name).toBe('Alice');
    expect(created.age).toBe(30);
    expect(created.id).toBe(1);

    const found = users.find(1);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Alice');
    expect(found?.age).toBe(30);

    const notFound = users.find(999);
    expect(notFound).toBeNull();
  });

  test('Should support findById and findFirst', () => {
    const users = db.table('users');
    users.create({ name: 'Bob', age: 25 });
    users.create({ name: 'Charlie', age: 35 });

    const bob = users.findById(1);
    expect(bob?.name).toBe('Bob');

    const first = users.findFirst({ age: 35 });
    expect(first?.name).toBe('Charlie');
  });

  test('Should findMany with where, orderBy, limit, offset', () => {
    const users = db.table('users');
    users.create({ name: 'User 1', age: 20 });
    users.create({ name: 'User 2', age: 30 });
    users.create({ name: 'User 3', age: 40 });
    users.create({ name: 'User 4', age: 50 });

    const all = users.findMany();
    expect(all).toHaveLength(4);

    const filtered = users.findMany({ where: { age: 30 } });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('User 2');

    const sorted = users.findMany({ orderBy: ['age', 'DESC'], limit: 2 });
    expect(sorted).toHaveLength(2);
    expect(sorted[0].name).toBe('User 4');
    expect(sorted[1].name).toBe('User 3');

    const paged = users.findMany({ orderBy: ['id', 'ASC'], limit: 2, offset: 2 });
    expect(paged).toHaveLength(2);
    expect(paged[0].name).toBe('User 3');
    expect(paged[1].name).toBe('User 4');
  });

  test('Should createMany records in batch', () => {
    const users = db.model('users');
    const batch = users.createMany([
      { name: 'John', age: 28 },
      { name: 'Jane', age: 26 },
    ]);

    expect(batch).toHaveLength(2);
    expect(users.count()).toBe(2);
  });

  test('Should update a record by id and by where', () => {
    const users = db.table('users');
    users.create({ name: 'Old Name', age: 20 });

    const updated = users.update(1, { name: 'New Name' });
    expect(updated?.name).toBe('New Name');

    const changes = users.updateWhere({ name: 'New Name' }, { age: 21 });
    expect(changes).toBe(1);

    const reloaded = users.find(1);
    expect(reloaded?.age).toBe(21);
  });

  test('Should delete a record by id and by where', () => {
    const users = db.table('users');
    users.create({ name: 'Temp', age: 18 });
    users.create({ name: 'Keep', age: 22 });

    const deleted = users.delete(1);
    expect(deleted).toBe(true);
    expect(users.find(1)).toBeNull();
    expect(users.count()).toBe(1);

    const deletedCount = users.deleteWhere({ name: 'Keep' });
    expect(deletedCount).toBe(1);
    expect(users.count()).toBe(0);
  });

  test('Should count and check exists', () => {
    const users = db.table('users');
    expect(users.count()).toBe(0);
    expect(users.exists({ name: 'Alice' })).toBe(false);

    users.create({ name: 'Alice', age: 30 });
    expect(users.count()).toBe(1);
    expect(users.exists({ name: 'Alice' })).toBe(true);
    expect(users.exists({ name: 'Bob' })).toBe(false);
  });

  test('Should drop down to QueryBuilder via table.query()', () => {
    const users = db.table('users');
    users.create({ name: 'Lucas', age: 29 });

    const result = users.query().select('name').where('age', 29);
    expect(result.run()).toBe('SELECT name FROM users WHERE age = 29');
  });

  test('Should support db.first() / db.get() helper', () => {
    db.table('users').create({ name: 'First User', age: 10 });
    db.table('users').create({ name: 'Second User', age: 20 });

    const first = db.select('*').from('users').orderBy('id', 'ASC').first() as any;
    expect(first).toBeDefined();
    expect(first.name).toBe('First User');
  });

  test('Should support db.count() helper', () => {
    db.table('users').create({ name: 'A', age: 1 });
    db.table('users').create({ name: 'B', age: 2 });

    const total = db.from('users').count();
    expect(total).toBe(2);
  });
});
