# Bun Sqlight

Bun Sqlight is a lightweight, zero-dependency, and type-safe SQLite abstraction layer for Bun's native SQLite engine. It is designed as a **sweet spot between an ORM and a Query Builder** — giving you the speed and flexibility of SQL alongside the ergonomics of models, transactions, migrations, and automatic type inference.

---

## Features

- ⚡ **Zero Dependencies**: Built directly on `bun:sqlite`.
- 🔄 **ORM + Query Builder Hybrid**: Use `db.table('users')` for fast CRUD or fluent `.select().from().where()` for complex queries.
- 🔗 **Relation Hydration (`asKey`)**: Automatic one-to-many grouping without duplicate rows.
- 📦 **Built-in Migrations**: CLI and programmatic migration runner (`bun-sqlight migrate`).
- 🛡️ **Transactions**: ACID transactions with auto-commit/rollback (`db.transaction`).
- 🔒 **Security & SafeMode**: Blocks SQL injection patterns and prevents accidental mass updates/deletes without WHERE.
- ⏱️ **Query Logging & Metrics**: Track duration in milliseconds and SQL execution times.
- 🧠 **TypeScript IntelliSense**: Automatic type generation and type safety.

---

## Installation

```bash
$ bun add bun-sqlight
```

---

## Quick Start

### 1. Initialize

```ts
import { Sqlight, BunSqlight } from 'bun-sqlight';

// In-memory or file-based database:
const db = new Sqlight('myDb.db', {
  logger: true,    // Log query execution & metrics
  safeMode: true,  // Prevent updates/deletes without WHERE
});
```

### 2. Define Tables

```ts
db.createTable('users', (t) => {
  t.id();
  t.string('name');
  t.string('email', { unique: true });
  t.timestamps();
});

db.createTable('orders', (t) => {
  t.id();
  t.string('product');
  t.foreign('user_id', 'users.id', { onDelete: 'CASCADE' });
});
```

### 3. ORM Model API (`db.table`)

Zero-boilerplate active record operations:

```ts
const users = db.table('users');

// CRUD
const newUser = users.create({ name: 'Alice', email: 'alice@example.com' });
const user = users.find(1);
const alice = users.findOne({ name: 'Alice' });
users.update(1, { name: 'Alice Cooper' });
users.delete(1);

// Aggregates
const count = users.count();
const exists = users.exists({ email: 'alice@example.com' });

// Drop down to query builder
const query = users.query().select('name').where('id', 1);
```

### 4. Query Builder API

Fluent SQL construction:

```ts
// Select
const results = db.select('name', 'email').from('users').where('id', 1).run();

// Calling from() first works identically:
db.from('users').select(['name', 'email']).where('id', 1).run();

// Joins with One-to-Many Hydration (asKey)
const usersWithOrders = db.select('*')
  .from('users')
  .join('orders.user_id', 'users.id', { asKey: 'orders', type: 'LEFT' })
  .run();
// Returns: [{ id: 1, name: 'Alice', orders: [{ id: 1, product: 'Book' }] }]
```

### 5. Transactions

```ts
db.transaction((trx) => {
  trx.table('accounts').update(1, { balance: 80 });
  trx.table('accounts').update(2, { balance: 70 });
});
```

### 6. Migrations CLI

```bash
$ bun-sqlight migrate            # Run pending migrations
$ bun-sqlight migrate:rollback   # Revert last batch
$ bun-sqlight migrate:status     # View status
$ bun-sqlight migrate:create add_users_table  # Create new migration
```

---

## Documentation

For full API reference, examples, hooks, security rules, and type generation, check [docs.md](docs.md) and [flux.md](flux.md).

## Contributing

Contributions are welcome! Please check [todo.md](todo.md) for roadmap items.