# bun-sqlight Documentation

`bun-sqlight` is a zero-dependency, lightweight, and type-safe SQLite abstraction layer built specifically for the Bun JavaScript runtime.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Connection API](#connection-api)
3. [Query Builder API](#query-builder-api)
   - [SELECT Queries](#select-queries)
   - [INSERT Queries](#insert-queries)
   - [UPDATE Queries](#update-queries)
   - [DELETE Queries](#delete-queries)
   - [JOIN Operations & Table Aliases](#join-operations--table-aliases)
4. [Schema Builder API](#schema-builder-api)
   - [Column Types](#column-types)
   - [Timestamps & UUID Auto-Hooks](#timestamps--uuid-auto-hooks)
   - [Foreign Keys & Referential Integrity](#foreign-keys--referential-integrity)
5. [Security & Query Protection](#security--query-protection)
6. [Type Generation](#type-generation)

---

## Getting Started

### Installation

```bash
$ bun add bun-sqlight
```

---

## Connection API

To start using `bun-sqlight`, import the `Sqlight` class and instantiate it. By default, it connects to an in-memory SQLite database if no path is provided.

```ts
import { Sqlight } from 'bun-sqlight';

// Connect to an in-memory database
const db = new Sqlight();

// Or connect to a file-based SQLite database
const db = new Sqlight('production.db');

// Run raw queries directly (validated for security constraints)
const users = db.raw("SELECT * FROM users WHERE age > 18");

// Close the connection
db.close();
```

---

## Query Builder API

`bun-sqlight` provides a chainable builder interface to transform your JavaScript/TypeScript API calls into structured SQL strings and execute them. 

Always execute a query by appending `.run()` at the end of the query chain.

### SELECT Queries

Retrieve data using chainable `.select()`, `.from()`, `.where()`, `.orWhere()`, `.orderBy()`, `.limit()`, and `.offset()` calls.

```ts
// Simple SELECT
const allUsers = db.select('*').from('users').run();

// SELECT with WHERE constraints
const john = db.select('id', 'name')
  .from('users')
  .where('name', 'John')
  .run();

// Using custom comparisons (=, !=, >, <, >=, <=)
const activeUsers = db.select('*')
  .from('users')
  .where('age', '>=', 18)
  .where('status', '!=', 'inactive')
  .run();

// Combined WHERE / OR WHERE
const matches = db.select('*')
  .from('users')
  .where('role', 'admin')
  .orWhere('name', 'SuperUser')
  .run();

// Ordering, Limit & Offset
const userPage = db.select('*')
  .from('users')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .offset(20)
  .run();
```

### INSERT Queries

Insert records by passing a table name and a flat object representing column-value pairs.

```ts
// Insert record
db.insert('users', {
  name: 'John Doe',
  email: 'john@example.com'
}).run();

// Dates inside Date objects are automatically parsed and formatted:
db.insert('events', {
  title: 'Meeting',
  event_date: new Date('2026-06-27T12:00:00Z') // automatically converted to SQLite format
}).run();
```

### UPDATE Queries

Update records using `.update()` chained with a `.where()` constraint.

> [!WARNING]
> Running an `.update()` query without a `.where()` constraint will throw a security exception.

```ts
// Safe UPDATE
db.update('users', { name: 'Jane Doe' })
  .where('id', 1)
  .run();
```

### DELETE Queries

Delete records using `.delete()` chained with a `.where()` constraint.

> [!WARNING]
> Running a `.delete()` query without a `.where()` constraint will throw a security exception.

```ts
// Safe DELETE
db.delete('users')
  .where('id', 1)
  .run();
```

### JOIN Operations & Table Aliases

Perform joins with custom comparisons, join types (`INNER`, `LEFT`, `RIGHT`, `FULL`), and table aliases.

```ts
// INNER JOIN (default)
const results = db.select('*')
  .from('users')
  .join('orders.user_id', 'users.id')
  .run();

// JOIN with aliases and custom type
const results = db.select('U.name', 'P.price')
  .from('users')
  .join('products.user_id', 'users.id', {
    type: 'LEFT',
    alias: { users: 'U', products: 'P' }
  })
  .run();
```

---

## Schema Builder API

You can create and drop tables using a callback interface.

```ts
// Create table structure
db.createTable('users', (table) => {
  table.id(); // INTEGER PRIMARY KEY AUTOINCREMENT
  table.string('name');
  table.string('email', { unique: true });
  table.timestamps(); // adds created_at and updated_at TIMESTAMP
});

// Drop table
db.dropTable('users');
```

### Column Types

Supported column types inside the callback include:

- `table.id(name?)`: Defines an autoincrementing integer primary key column. Defaults to name `'id'`.
- `table.uuid(name?)`: Defines a UUID primary key column (string-based) that generates UUIDs on the fly.
- `table.string(name, options?)`: Text column.
- `table.integer(name, options?)`: Integer numeric column.
- `table.boolean(name, options?)`: Boolean representation (stored as `1` or `0`).
- `table.float(name, options?)`: Floating-point numeric column.
- `table.date(name, options?)`: Date column (converts Javascript Date objects to `YYYY-MM-DD`).
- `table.datetime(name, options?)`: Datetime column (converts Javascript Date objects to `YYYY-MM-DD HH:MM:SS.SSS`).
- `table.timestamps()`: Automatically generates `created_at` and `updated_at` timestamp columns.

### Column Options

Columns support the following constraints:

```ts
table.string('name', {
  default: 'John Doe', // default value
  unique: true,        // unique index constraint
  nullable: true       // specifies if column can be NULL (defaults to NOT NULL)
});
```

### Timestamps & UUID Auto-Hooks

`bun-sqlight` implements internal hooks to automate field metadata:
- **UUID Generation**: When a table is declared with `table.uuid()`, a `beforeInsert` hook is registered to automatically populate the UUID using `crypto.randomUUID()` upon record insertions.
- **Auto-Timestamps**: When `table.timestamps()` is used, a `beforeUpdate` hook is registered to automatically update `updated_at` with the `CURRENT_TIMESTAMP` value during update operations.

### Foreign Keys & Referential Integrity

You can define referential constraints using `.foreign(columnName, referencedColumn, options)`:

```ts
db.createTable('orders', (table) => {
  table.id();
  table.string('product');
  // Define foreign key constraint users_fk.id with cascade behaviors
  table.foreign('user_id', 'users_fk.id', {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
});
```

---

## Security & Query Protection

`bun-sqlight` incorporates strict compile-time SQL structure sanitization in `validateSQLQuery` to prevent malicious database manipulations:
- Blocks query chaining (multiple commands using unquoted semicolons).
- Blocks inline SQL comments (`--`, `#`, `/*`) that attempt to hide parts of query structures.
- Detects SQL injection tautologies (e.g. `OR 1=1`).
- Identifies and rejects unsafe `UNION` structures.
- Prevents database administrative execution functions (e.g. `exec`, `sp_executesql`).
- **Enforces Safety Restrictions**: Strictly raises errors if an `UPDATE` or `DELETE` statement is issued without a corresponding `WHERE` clause.

---

## Type Generation

When you use the schema builder (`db.createTable`), `bun-sqlight` automatically reads the structure definitions and generates dynamic TypeScript typings inside the `src/generated/` folder. This gives you automatic intellisense and type-safety mapping queries back to interface variables!
