import { describe, test, expect } from 'bun:test';
import { Sqlight, BunSqlight, TableRepository } from '../src';

// ─────────────────────────────────────────────────────────────────────────────
// Type-Level Testing Utilities (Compile-time Type Assertions)
// ─────────────────────────────────────────────────────────────────────────────
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
  ? true
  : false;
type NotEqual<X, Y> = Equal<X, Y> extends true ? false : true;

interface UserSelect {
  id: number;
  name: string;
  email: string;
  age: number | null;
  score: number;
}

interface UserInsert {
  name: string;
  email: string;
  age?: number | null;
  score?: number;
}

interface UserUpdate {
  name?: string;
  email?: string;
  age?: number | null;
  score?: number;
}

interface OrderSelect {
  id: number;
  user_id: number;
  total: number;
}

interface OrderInsert {
  user_id: number;
  total: number;
}

interface OrderUpdate {
  total?: number;
}

interface AppSchema {
  users: {
    select: UserSelect;
    insert: UserInsert;
    update: UserUpdate;
  };
  orders: {
    select: OrderSelect;
    insert: OrderInsert;
    update: OrderUpdate;
  };
}

describe('TypeScript Type Inference and Compile-Time Verification Suite', () => {
  test('Should infer exact repository types from schema without manual annotations', () => {
    const db = new Sqlight<AppSchema>(':memory:');
    const users = db.table('users');
    const orders = db.table('orders');

    // Verify exact TableRepository generic parameters
    type _checkUsers = Expect<Equal<typeof users, TableRepository<UserSelect, UserInsert, UserUpdate>>>;
    type _checkOrders = Expect<Equal<typeof orders, TableRepository<OrderSelect, OrderInsert, OrderUpdate>>>;

    // Verify it is NOT 'any'
    type _notAnyUsers = Expect<NotEqual<typeof users, TableRepository<any, any, any>>>;

    expect(users).toBeDefined();
    expect(orders).toBeDefined();
    db.close();
  });

  test('Should infer exact return types for CRUD methods', () => {
    const db = new Sqlight<AppSchema>(':memory:');
    db.createTable('users', (t) => {
      t.id();
      t.string('name');
      t.string('email');
      t.integer('age', { nullable: true });
      t.float('score', { default: 0 });
    });

    const users = db.table('users');

    // Return types
    const created = users.create({ name: 'Alice', email: 'a@a.com' });
    type _checkCreated = Expect<Equal<typeof created, UserSelect>>;
    expect(created.id).toBe(1);
    expect(created.name).toBe('Alice');

    const found = users.find(1);
    type _checkFound = Expect<Equal<typeof found, UserSelect | null>>;
    expect(found?.email).toBe('a@a.com');

    const list = users.findMany({ where: { name: 'Alice' } });
    type _checkList = Expect<Equal<typeof list, UserSelect[]>>;
    expect(list.length).toBe(1);

    const updated = users.update(1, { name: 'Alice 2' });
    type _checkUpdated = Expect<Equal<typeof updated, UserSelect | null>>;
    expect(updated?.name).toBe('Alice 2');

    const count = users.count({ name: 'Alice 2' });
    type _checkCount = Expect<Equal<typeof count, number>>;
    expect(count).toBe(1);

    const exists = users.exists({ email: 'a@a.com' });
    type _checkExists = Expect<Equal<typeof exists, boolean>>;
    expect(exists).toBe(true);

    const deleted = users.delete(1);
    type _checkDeleted = Expect<Equal<typeof deleted, boolean>>;
    expect(deleted).toBe(true);

    db.close();
  });

  test('Should compile negative type tests with @ts-expect-error', () => {
    const db = new Sqlight<AppSchema>(':memory:');
    const users = db.table('users');
    const orders = db.table('orders');

    function _negativeChecks() {
      // @ts-expect-error - Property 'email' is missing in type '{ name: string; }'
      users.create({ name: 'Incomplete' });

      // @ts-expect-error - Type 'number' is not assignable to type 'string'
      users.create({ name: 123, email: 'valid@email.com' });

      // @ts-expect-error - 'extra_property' does not exist in UserInsert
      users.create({ name: 'Extra', email: 'extra@email.com', extra_property: 42 });

      // @ts-expect-error - 'non_existent_column' does not exist in UserUpdate
      users.update(1, { non_existent_column: 'bad' });

      // @ts-expect-error - 'total' must be number, not string
      orders.create({ user_id: 1, total: 'expensive' });

      // @ts-expect-error - 'user_id' is missing
      orders.create({ total: 100 });
    }

    expect(_negativeChecks).toBeDefined();
    db.close();
  });

  test('Should infer exact types on db.from() QueryBuilder without writing generics', () => {
    const db = new Sqlight<AppSchema>(':memory:');
    db.createTable('users', (t) => {
      t.id();
      t.string('name');
      t.string('email');
    });

    db.table('users').create({ name: 'Bob', email: 'bob@example.com' });

    // NO generics passed to .from(), .where(), .first(), .run()
    const firstUser = db.from('users').first();
    type _checkFirst = Expect<Equal<typeof firstUser, UserSelect | null>>;
    expect(firstUser?.name).toBe('Bob');

    const allUsers = db.from('users').run();
    type _checkAll = Expect<Equal<typeof allUsers, UserSelect[]>>;
    expect(allUsers.length).toBe(1);

    const filtered = db.from('users').where('email', 'bob@example.com').first();
    type _checkFiltered = Expect<Equal<typeof filtered, UserSelect | null>>;
    expect(filtered?.email).toBe('bob@example.com');

    db.close();
  });

  test('Should support custom type overrides on arbitrary dynamic tables', () => {
    interface Article {
      id: number;
      title: string;
      views: number;
    }
    interface ArticleInput {
      title: string;
      views?: number;
    }

    const db = new Sqlight(':memory:');
    db.createTable('articles', (t) => {
      t.id();
      t.string('title');
      t.integer('views', { default: 0 });
    });

    const articles = db.table<Article, ArticleInput>('articles');
    type _checkArticles = Expect<Equal<typeof articles, TableRepository<Article, ArticleInput, Partial<ArticleInput>>>>;

    const inserted = articles.create({ title: 'TypeScript Deep Dive' });
    type _checkInserted = Expect<Equal<typeof inserted, Article>>;
    expect(inserted.title).toBe('TypeScript Deep Dive');

    const found = articles.find(1);
    type _checkFound = Expect<Equal<typeof found, Article | null>>;
    expect(found?.title).toBe('TypeScript Deep Dive');

    db.close();
  });
});
