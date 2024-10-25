
Bun sqlight is a simple and lightweight Sqlite abstraction layer for Bun sqlite API.

> **Note:** This is a work in progress and not yet ready for production use. The guide below is a future plan and may not be implemented yet. (check `todo.md`)

## Get started

### Installation

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
db.createTable('users', function (table) {
    table.increments('id');
    table.string('name');
    table.string('email', { unique: true });
    table.timestamps();
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

## Contributing

Any contribution is welcome! Please check the [todo.md](todo.md) file to see what needs to be done, and you can open a PR or a issue to help us improve the project!