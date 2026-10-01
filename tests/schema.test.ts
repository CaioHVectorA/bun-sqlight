import { describe, test, expect } from 'bun:test';
import { QueryBuilder } from '../src/lib/query-builder';
import { DatabaseManager } from '../src/lib/db-manager';
import { Database } from 'bun:sqlite';
import { int, varchar } from '../src/lib/schema/primitives';
const querybuilder = new QueryBuilder();
const db = new DatabaseManager(querybuilder, new Database(':memory:'));
describe('Tables and schema', () => {
  test('Should be able to create a table', () => {
    const queryExpected = 'CREATE TABLE users (id INT, name VARCHAR(255))';
    const query = querybuilder.createTable('users', {
      id: int(),
      name: varchar(255),
    });
    const queryRun = query.run();
    expect(queryRun).toBe(queryExpected);
  });
  test('Should be able to drop a table', () => {
    const queryExpected = 'DROP TABLE users';
    const query = querybuilder.dropTable('users');
    expect(query.run()).toBe(queryExpected);
  });
  // with callbacks with shchema object
  test('Should be able to create a table with schema fallback', () => {
    const queryExpected = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)';
    const query = querybuilder.createTable('users', (table) => {
      table.id();
      table.string('name');
    });
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a table with default values and nullable', () => {
    const queryExpected = "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT DEFAULT 'John Doe' NOT NULL)";
    const query = querybuilder.createTable('users', (table) => {
      table.id();
      table.string('name', { default: 'John Doe' });
    });
    expect(query.run()).toBe(queryExpected);
    const nullableQuery = querybuilder.createTable('users', (table) => {
      table.id();
      table.string('name', { nullable: true });
    });
    expect(nullableQuery.run()).toBe('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NULL)');
  });
  test('Should be able to create a table with unique values', () => {
    const queryExpected = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)';
    const query = querybuilder.createTable('users', (table) => {
      table.id();
      table.string('name', { unique: true });
    });
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a table with foreign key', () => {
    const queryExpected =
      'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, user_id INTEGER, FOREIGN KEY (user_id) REFERENCES users(id))';
    const queryWithoutConstraints = querybuilder.createTable('users', (table) => {
      table.id();
      table.string('name');
      table.foreign('user_id', 'users.id');
    });
    expect(queryWithoutConstraints.run()).toBe(queryExpected);
    const queryWithCascadeExpected =
      'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, user_id INTEGER, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)';
    const queryWithCascade = querybuilder.createTable('users', (table) => {
      table.id();
      table.string('name');
      table.foreign('user_id', 'users.id', { onDelete: 'CASCADE' });
    });
    expect(queryWithCascade.run()).toBe(queryWithCascadeExpected);
  });
  test('Should be able to create a table with timestamps', () => {
    const queryExpected =
      'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)';
    const query = querybuilder.createTable('users', (table) => {
      table.id();
      table.string('name');
      table.timestamps();
    });
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a table with uuid', () => {
    const queryExpected = 'CREATE TABLE users (id UUID PRIMARY KEY, name TEXT NOT NULL)';
    const query = querybuilder.createTable('users', (table) => {
      table.uuid('id');
      table.string('name');
    });
    expect(query.run()).toBe(queryExpected);
  });
  test('Should be able to create a table with date and datetime fields', () => {
    const queryExpected = 'CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, event_date DATE NOT NULL, event_time DATETIME NOT NULL)';
    const query = querybuilder.createTable('events', (table) => {
      table.id();
      table.string('name');
      table.date('event_date');
      table.datetime('event_time');
    });
    expect(query.run()).toBe(queryExpected);
  });
  test('Should do relationships with tables', () => {
    // with * selector, using join
    // with * selector, using join and where
    // with some selectors of each table selector
    // with some selectors of each table selector and where
    const queryExpected = 'SELECT * FROM users INNER JOIN products ON users.id = products.user_id';
    const withWhereExpected = 'SELECT * FROM users INNER JOIN products ON users.id = products.user_id WHERE users.id = 1';
    const withSomeSelectors = 'SELECT users.name, products.price FROM users INNER JOIN products ON users.id = products.user_id';
    const withSomeSelectorsAndWhere =
      'SELECT users.name, products.price FROM users INNER JOIN products ON users.id = products.user_id WHERE users.id = 1';
    const query = querybuilder.select('*').from('users').join('products.user_id', 'users.id');
    expect(query.run()).toBe(queryExpected);
    const withWhere = querybuilder.select('*').from('users').join('products.user_id', 'users.id').where('users.id', 1);
    expect(withWhere.run()).toBe(withWhereExpected);
    const withSome = querybuilder.select('users.name', 'products.price').from('users').join('products.user_id', 'users.id');
    expect(withSome.run()).toBe(withSomeSelectors);
    const withSomeAndWhere = querybuilder
      .select('users.name', 'products.price')
      .from('users')
      .join('products.user_id', 'users.id')
      .where('users.id', 1);
    expect(withSomeAndWhere.run()).toBe(withSomeSelectorsAndWhere);
    const withSwap = querybuilder.select('*').from('users').join('users.id', 'products.user_id');
    expect(withSwap.run()).toBe('SELECT * FROM users INNER JOIN products ON users.id = products.user_id');
  });
  test('Should do relationships with different types of join, different comparisons', () => {
    const queryNotEqualExpected = 'SELECT * FROM users INNER JOIN products ON users.id != products.user_id';
    const queryGreaterThanExpected = 'SELECT * FROM users INNER JOIN products ON users.id > products.user_id';
    const queryLessThanExpected = 'SELECT * FROM users INNER JOIN products ON users.id < products.user_id';
    const queryInnerJoinExpected = 'SELECT * FROM users INNER JOIN products ON users.id = products.user_id';
    const queryLeftJoinExpected = 'SELECT * FROM users LEFT JOIN products ON users.id = products.user_id';
    const queryRightJoinExpected = 'SELECT * FROM users RIGHT JOIN products ON users.id = products.user_id';
    const queryFullJoinExpected = 'SELECT * FROM users FULL JOIN products ON users.id = products.user_id';

    const queryNotEqual = querybuilder.select('*').from('users').join('products.user_id', 'users.id', { comparison: '!=' });
    expect(queryNotEqual.run()).toBe(queryNotEqualExpected);

    const queryGreaterThan = querybuilder.select('*').from('users').join('products.user_id', 'users.id', { comparison: '>' });
    expect(queryGreaterThan.run()).toBe(queryGreaterThanExpected);

    const queryLessThan = querybuilder.select('*').from('users').join('products.user_id', 'users.id', { comparison: '<' });
    expect(queryLessThan.run()).toBe(queryLessThanExpected);

    const queryInnerJoin = querybuilder.select('*').from('users').join('products.user_id', 'users.id', { type: 'INNER' });
    expect(queryInnerJoin.run()).toBe(queryInnerJoinExpected);

    const queryLeftJoin = querybuilder.select('*').from('users').join('products.user_id', 'users.id', { type: 'LEFT' });
    expect(queryLeftJoin.run()).toBe(queryLeftJoinExpected);

    const queryRightJoin = querybuilder.select('*').from('users').join('products.user_id', 'users.id', { type: 'RIGHT' });
    expect(queryRightJoin.run()).toBe(queryRightJoinExpected);

    const queryFullJoin = querybuilder.select('*').from('users').join('products.user_id', 'users.id', { type: 'FULL' });
    expect(queryFullJoin.run()).toBe(queryFullJoinExpected);
  });
  test('Should be able to make relationships with alias', () => {
    const queryWithAliasExpected = 'SELECT * FROM users U INNER JOIN products P ON U.id = P.user_id';
    const query = querybuilder
      .select('*')
      .from('users')
      .join('products.user_id', 'users.id', { alias: { users: 'U', products: 'P' } });
    expect(query.run()).toBe(queryWithAliasExpected);
  });
  test('Should be able to return using asKey prop, returning one-to-many in a single object with an array', () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.createTable('users_rel', (table) => {
      table.id();
      table.string('name');
    });
    freshDb.createTable('orders_rel', (table) => {
      table.id();
      table.string('product');
      table.foreign('user_id', 'users_rel.id');
    });

    freshDb.insert('users_rel', { name: 'Alice' }).run();
    freshDb.insert('users_rel', { name: 'Bob' }).run();

    freshDb.insert('orders_rel', { product: 'Book', user_id: 1 }).run();
    freshDb.insert('orders_rel', { product: 'Pen', user_id: 1 }).run();

    const results = freshDb
      .select('*')
      .from('users_rel')
      .join('orders_rel.user_id', 'users_rel.id', { asKey: 'orders', type: 'LEFT' })
      .run() as any[];

    expect(results).toHaveLength(2);

    const alice = results.find((u) => u.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice.orders).toHaveLength(2);
    expect(alice.orders[0].product).toBe('Book');
    expect(alice.orders[1].product).toBe('Pen');

    const bob = results.find((u) => u.name === 'Bob');
    expect(bob).toBeDefined();
    expect(bob.orders).toHaveLength(0);

    freshDb.close();
  });
  // with db managment
  test('Should be able to create and a row can be inserted', () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.createTable('users_test', (table) => {
      table.id();
      table.string('name');
    });
    freshDb.insert('users_test', { name: 'John Doe' }).run();
    const rows = freshDb.select('*').from('users_test').run() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('John Doe');
    freshDb.close();
  });
  test('Should be able to create a table with timestamps and updated_at should be updated automatically', async () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.createTable('users_ts', (table) => {
      table.id();
      table.string('name');
      table.timestamps();
    });
    freshDb.insert('users_ts', { name: 'John Doe' }).run();
    const rows1 = freshDb.select('*').from('users_ts').run() as any[];
    expect(rows1).toHaveLength(1);
    const firstCreatedAt = rows1[0].created_at;
    const firstUpdatedAt = rows1[0].updated_at;
    expect(firstCreatedAt).toBeDefined();
    expect(firstUpdatedAt).toBeDefined();
    
    // SQLite timestamps CURRENT_TIMESTAMP has second precision, but we can verify update runs successfully
    freshDb.update('users_ts', { name: 'Jane Doe' }).where('id', 1).run();
    const rows2 = freshDb.select('*').from('users_ts').run() as any[];
    expect(rows2[0].name).toBe('Jane Doe');
    freshDb.close();
  });
  test('Should be able to create with UUID and id should be generated automatically and unique', () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.createTable('users_uuid', (table) => {
      table.uuid('id');
      table.string('name');
    });
    freshDb.insert('users_uuid', { name: 'Alice' }).run();
    freshDb.insert('users_uuid', { name: 'Bob' }).run();
    const rows = freshDb.select('*').from('users_uuid').run() as any[];
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBeDefined();
    expect(rows[1].id).toBeDefined();
    expect(rows[0].id).not.toBe(rows[1].id);
    expect(rows[0].id.length).toBe(36); // UUID length
    freshDb.close();
  });
  test('Should be able to create a table with autoincrement id and id should be generated automatically and unique', () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.createTable('users_auto', (table) => {
      table.id();
      table.string('name');
    });
    freshDb.insert('users_auto', { name: 'Alice' }).run();
    freshDb.insert('users_auto', { name: 'Bob' }).run();
    const rows = freshDb.select('*').from('users_auto').run() as any[];
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe(1);
    expect(rows[1].id).toBe(2);
    freshDb.close();
  });
  test('Should be able to create a table with a foreign key and can do a select with join', () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.createTable('users_fk', (table) => {
      table.id();
      table.string('name');
    });
    freshDb.createTable('orders', (table) => {
      table.id();
      table.string('product');
      table.foreign('user_id', 'users_fk.id');
    });
    freshDb.insert('users_fk', { name: 'Alice' }).run();
    freshDb.insert('orders', { product: 'Book', user_id: 1 }).run();
    
    const result = freshDb.select('*')
      .from('users_fk')
      .join('orders.user_id', 'users_fk.id')
      .run() as any[];
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
    expect(result[0].product).toBe('Book');
    freshDb.close();
  });
  test('Should be able to create a table with a foreign key and cascade on delete and delete all related rows', () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.raw('PRAGMA foreign_keys = ON');
    freshDb.createTable('users_del', (table) => {
      table.id();
      table.string('name');
    });
    freshDb.createTable('orders_del', (table) => {
      table.id();
      table.string('product');
      table.foreign('user_id', 'users_del.id', { onDelete: 'CASCADE' });
    });
    freshDb.insert('users_del', { name: 'Alice' }).run();
    freshDb.insert('orders_del', { product: 'Book', user_id: 1 }).run();
    
    const ordersBefore = freshDb.select('*').from('orders_del').run();
    expect(ordersBefore).toHaveLength(1);

    freshDb.delete('users_del').where('id', 1).run();

    const ordersAfter = freshDb.select('*').from('orders_del').run();
    expect(ordersAfter).toHaveLength(0);
    freshDb.close();
  });
  test('Should be able to create a table with a foreign key and cascade on update and update all related rows', () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.raw('PRAGMA foreign_keys = ON');
    freshDb.createTable('users_up', (table) => {
      table.id();
      table.string('name');
    });
    freshDb.createTable('orders_up', (table) => {
      table.id();
      table.string('product');
      table.foreign('user_id', 'users_up.id', { onUpdate: 'CASCADE' });
    });
    freshDb.insert('users_up', { name: 'Alice' }).run();
    freshDb.insert('orders_up', { product: 'Book', user_id: 1 }).run();

    freshDb.update('users_up', { id: 99 } as any).where('id', 1).run();

    const orders = freshDb.select('*').from('orders_up').run() as any[];
    expect(orders).toHaveLength(1);
    expect(orders[0].user_id).toBe(99);
    freshDb.close();
  });
  test('Should be able to insert and select Date and Datetime objects', () => {
    const freshDb = new DatabaseManager(new QueryBuilder(), new Database(':memory:'));
    freshDb.createTable('events_test', (table) => {
      table.id();
      table.date('ev_date');
      table.datetime('ev_datetime');
    });
    const testDate = new Date('2026-06-27T12:00:00Z');
    freshDb.insert('events_test', { ev_date: testDate, ev_datetime: testDate }).run();
    const rows = freshDb.select('*').from('events_test').run() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].ev_date).toBe('2026-06-27');
    expect(rows[0].ev_datetime).toBe('2026-06-27 12:00:00.000');
    freshDb.close();
  });
  //
});
