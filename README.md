
Bun sqlight is a SQLite abstraction layer for Bun sqlite API. Focus on zero dependency and simplicity

> **Note:** This is a work in progress and not yet ready for production use. The guide below is a future plan and may not be implemented yet. (check `todo.md` and contribute section!)

# Get started

## Installation

### Initialize

```ts
import { BunSqlight } from 'bun-sqlight';
const db = new BunSqlight('myDb.db');
```

### Usage

```ts
db.from('users').select('name', 'email').where('id', 1).get();
// same result:
db.select(['name', 'email']).from('users').where('id', 1).get();
db.select('name', 'email').from('users').where('id', 1).get();


// CRUD:
db.from('users').insert({ name: 'John', email: 'john@gm.co'}).set()
db.from('users').update({ name: 'John Doe', email: 'john2@gm.co'}).where('id', 1).set();
db.from('users').delete().where('id', 1).remove();
```

### Schema

The bun-sqlight improves a good migration system to manage the database schema.

```ts
// migrations/create-users-table.ts
db.createTable('users', (t) => {
    t.increments('id');
    t.string('name');
    t.string('email', { unique: true });
    t.timestamps();
})

// or 

db.createTable('users', {
    id: 'integer primary key',
    name: 'text',
    email: 'text UNIQUE',
    created_at: 'datetime',
    updated_at: 'datetime',
})
```

when you run the file, the table will be created in the database.

You can use the bun-sqlight to automatically run all migrations:

```bash
$ bun-sqlight migrate
```
All TS or JS files in the `migrations` directory will be executed.

# Contributing

Any contribution is welcome! Please check the [todo.md](todo.md) file to see what needs to be done, and you can open a PR or a issue to help us improve the project!