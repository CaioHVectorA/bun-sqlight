# bun-sqlight Documentation

`bun-sqlight` is a zero-dependency, lightweight, and type-safe SQLite abstraction layer built specifically for the Bun JavaScript runtime. It sits in the sweet spot between an ORM and a Query Builder — offering the fluent flexibility of SQL building alongside active record models, transactions, migrations, relations hydration, and compile-time safety.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Connection API & Options](#connection-api--options)
3. [ORM / Model API (`db.table`)](#orm--model-api-dbtable)
4. [Query Builder API](#query-builder-api)
   - [SELECT Queries](#select-queries)
   - [WHERE Clauses & Filters](#where-clauses--filters)
   - [INSERT Queries](#insert-queries)
   - [UPDATE Queries](#update-queries)
   - [DELETE Queries](#delete-queries)
   - [JOIN Operations & Aliases](#join-operations--aliases)
   - [One-to-Many Hydration (`asKey`)](#one-to-many-hydration-askey)
5. [Transactions](#transactions)
6. [Migrations System & CLI](#migrations-system--cli)
7. [Schema Builder API](#schema-builder-api)
   - [Column Types](#column-types)
   - [Timestamps & UUID Auto-Hooks](#timestamps--uuid-auto-hooks)
   - [Foreign Keys & Referential Integrity](#foreign-keys--referential-integrity)
8. [Security, SafeMode & Error Handling](#security-safemode--error-handling)
9. [Query Logging & Metrics](#query-logging--metrics)
10. [Type Generation](#type-generation)

---

## Getting Started

### Installation

```bash
$ bun add bun-sqlight
```

---

## Connection API & Options

Import `Sqlight` (or `BunSqlight`) and instantiate it. By default, it connects to an in-memory database (`:memory:`).

```ts
import { Sqlight, BunSqlight } from 'bun-sqlight';

// In-memory database
const db = new Sqlight();

// File-based database with logging and safeMode
const db = new Sqlight('production.db', {
  safeMode: true, // Prevents destructive queries without WHERE (default: true)
  logger: (log) => console.log(`[${log.type}] (${log.durationMs}ms) ${log.query}`),
});

// Run raw queries directly (validated against injection)
const users = db.raw("SELECT * FROM users WHERE age > ?", [18]);

// Close connection
db.close();
```

---

## ORM / Model API (`db.table`)

When you want clean, zero-boilerplate operations without manually assembling SQL strings, use `db.table(tableName)` or `db.model(tableName)`:

```ts
const users = db.table('users');

// Find by ID
const user = users.find(1); // or users.findById(1)

// Find one by criteria
const alice = users.findOne({ name: 'Alice' }); // or users.findFirst({ age: 25 })

// Find many with criteria, ordering, and pagination
const activeUsers = users.findMany({
  where: { active: 1 },
  orderBy: ['created_at', 'DESC'],
  limit: 10,
  offset: 0,
});

// Create (returns the inserted record with generated ID)
const newUser = users.create({ name: 'Charlie', age: 32 });

// Create multiple records
users.createMany([
  { name: 'Diana', age: 28 },
  { name: 'Evan', age: 24 },
]);

// Update by ID (returns updated record)
const updated = users.update(1, { age: 33 });

// Update by criteria
const updatedCount = users.updateWhere({ status: 'pending' }, { status: 'verified' });

// Delete by ID
users.delete(1);

// Delete by criteria
users.deleteWhere({ status: 'inactive' });

// Aggregate helpers
const count = users.count({ active: 1 });
const exists = users.exists({ email: 'user@example.com' });

// Drop down to query builder whenever needed
const qb = users.query().select('name').where('age', '>', 30);
```

---

## Query Builder API

`bun-sqlight` provides a chainable builder interface to transform your JavaScript/TypeScript API calls into structured SQL strings.

Execute a query by appending `.run()` at the end of the query chain.

### SELECT Queries

```ts
// Simple SELECT
const allUsers = db.select('*').from('users').run();

// Support both select('a', 'b') and select(['a', 'b'])
const partial = db.select('id', 'name').from('users').run();

// Calling from() first works identically:
const users = db.from('users').select('name', 'email').run();

// Single row shortcut:
const firstUser = db.select('*').from('users').first(); // or .get()

// Count helper
const total = db.from('users').count();
```

### WHERE Clauses & Filters

```ts
// Simple WHERE
db.select('*').from('users').where('id', 1).run();

// Object syntax:
db.select('*').from('users').where({ role: 'admin', active: 1 }).run();

// Comparison operators (=, !=, >, <, >=, <=)
db.select('*').from('users').where('age', '>=', 18).run();

// Combining with OR
db.select('*').from('users').where('role', 'admin').orWhere('role', 'owner').run();

// IN lists
db.select('*').from('users').whereIn('id', [1, 2, 3]).run();

// NULL checks
db.select('*').from('users').whereNull('deleted_at').run();
db.select('*').from('users').whereNotNull('email').run();
```

### INSERT Queries

```ts
// Single row
db.insert('users', { name: 'Alice', age: 25 }).run();

// Multiple rows
db.insert('users', [
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 },
]).run();
```

### UPDATE Queries

```ts
db.update('users', { age: 26 }).where('id', 1).run();
```

### DELETE Queries

```ts
db.delete('users').where('id', 1).run();
```

### JOIN Operations & Aliases

```ts
// INNER JOIN
db.select('*')
  .from('users')
  .join('orders.user_id', 'users.id')
  .run();

// JOIN with aliases and custom comparison
db.select('*')
  .from('users')
  .join('orders.user_id', 'users.id', {
    type: 'LEFT',
    comparison: '=',
    alias: { users: 'U', orders: 'O' },
  })
  .run();
```

### One-to-Many Hydration (`asKey`)

Standard SQL joins flatten records and duplicate parent columns. `bun-sqlight` includes relational hydration using `asKey`:

```ts
const usersWithOrders = db.select('*')
  .from('users')
  .join('orders.user_id', 'users.id', { asKey: 'orders', type: 'LEFT' })
  .run();

// Output:
// [
//   {
//     id: 1,
//     name: 'Alice',
//     orders: [
//       { id: 10, user_id: 1, product: 'Book' },
//       { id: 11, user_id: 1, product: 'Pen' }
//     ]
//   },
//   {
//     id: 2,
//     name: 'Bob',
//     orders: []
//   }
// ]
```

---

## Transactions

Transactions guarantee ACID compliance. If any error is thrown inside a transaction block, `ROLLBACK` is performed automatically:

```ts
// Automatic transaction
db.transaction((trx) => {
  trx.table('accounts').update(1, { balance: 80 });
  trx.table('accounts').update(2, { balance: 70 });
});

// Async transaction
await db.transaction(async (trx) => {
  await doAsyncWork();
  trx.table('accounts').update(1, { balance: 50 });
});

// Manual transaction
const trx = db.beginTransaction();
try {
  db.table('accounts').update(1, { balance: 300 });
  trx.commit();
} catch (err) {
  trx.rollback();
}
```

---

## Migrations System & CLI

Track database evolution across files with automatic batch tracking via `_sqlight_migrations`.

### Migration File Format

```ts
// migrations/001_create_users.ts
import type { DatabaseManager } from 'bun-sqlight';

export async function up(db: DatabaseManager) {
  db.createTable('users', (t) => {
    t.id();
    t.string('name');
    t.string('email', { unique: true });
    t.timestamps();
  });
}

export async function down(db: DatabaseManager) {
  db.dropTable('users');
}
```

### Programmatic API

```ts
// Apply pending migrations
await db.migrate.up();

// Rollback latest batch
await db.migrate.rollback();

// Status
const status = await db.migrate.status();

// Generate boilerplate file
db.migrate.create('add_posts_table');
```

### CLI Commands

```bash
# Apply pending migrations
$ bun-sqlight migrate [migrations-dir]

# Rollback last migration batch
$ bun-sqlight migrate:rollback [migrations-dir]

# View status of migrations
$ bun-sqlight migrate:status [migrations-dir]

# Generate a new timestamped migration
$ bun-sqlight migrate:create <name> [dir]

# Generate TypeScript declarations from schema file
$ bun-sqlight generate <schema-file> [output-file]
```

---

## Schema Builder API

Define database tables using a fluent callback or an object mapping.

```ts
db.createTable('users', (table) => {
  table.id();                     // autoincrement integer primary key
  table.uuid('uuid');             // UUID primary key with auto-generation hook
  table.string('name');           // TEXT
  table.integer('age');          // INTEGER
  table.boolean('is_active');     // BOOLEAN (0/1)
  table.float('rating');          // REAL
  table.date('birthday');         // DATE (YYYY-MM-DD)
  table.datetime('last_login');   // DATETIME
  table.timestamps();             // created_at and updated_at with auto-update
  table.foreign('team_id', 'teams.id', { onDelete: 'CASCADE' });
});
```

---

## Security, SafeMode & Error Handling

`bun-sqlight` enforces strict protection at both compile-time and run-time:
- **Injection Protection**: Detects comments (`--`, `#`, `/*`), tautologies (`OR 1=1`), and dynamic calls (`sp_executesql`).
- **Safe Mode**: Throws `SqlightSecurityError` if `UPDATE` or `DELETE` is called without a `WHERE` clause.
- **Explicit Override**: Use `.allowAll()` to bypass safeMode for mass updates or truncations:
  ```ts
  db.allowAll().delete('users').run();
  ```
- **Error Hierarchy**:
  - `SqlightError` (base)
  - `SqlightQueryError`
  - `SqlightSecurityError`
  - `SqlightValidationError`
  - `SqlightMigrationError`

---

## Query Logging & Metrics

Log queries, execution times, and timestamps:

```ts
const db = new Sqlight('app.db', {
  logger: (log) => {
    console.log(`[Sqlight] (${log.durationMs.toFixed(2)}ms) [${log.type}] ${log.query}`);
  },
});
```

---

## Type Generation

Run `bun-sqlight generate <schema-file>` or define tables in code to generate TypeScript types inside `src/generated/`. Enjoy complete IntelliSense across your queries!
