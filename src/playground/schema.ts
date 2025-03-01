import { DatabaseManager } from '../lib/db-manager';
import { serve } from 'bun';
import { QueryBuilder } from '../lib/query-builder';
const qb = new QueryBuilder();
const db = new DatabaseManager(qb, DatabaseManager.getDb('f.db')) as unknown as QueryBuilder;
db.createTable('user', (table) => {
  table.string('name');
  table.integer('age');
  table.id();
  // table.uuid('uuid')
});
db.createTable('product', (table) => {
  table.foreign('user_id', 'user.id');
  table.id();
  table.float('price');
  table.string('name');
});

db.insert('user', { name: 'John Doe', age: 18 }).run();
db.insert('user', { name: 'Jane Doe', age: 20 }).run();
db.insert('product', { user_id: 1, price: 100, name: 'Casca de banana' }).run();
db.insert('product', { user_id: 2, price: 200, name: 'Olá' }).run();
db.insert('product', { user_id: 2, price: 200, name: 'Olá2' }).run();
db.insert('product', { user_id: 2, price: 200, name: 'Olá3' }).run();
console.log(
  db
    .select('U.name, P.name as p_name')
    .from('user')
    .join('P.user_id', 'U.id', {
      comparison: '!=',
      type: 'RIGHT',
      alias: {
        product: 'P',
        user: 'U',
      },
    })
    .run()
);
console.log({
  parts: qb
    .select('U.name, P.name as p_name')
    .from('user')
    .join('P.user_id', 'U.id', {
      comparison: '!=',
      type: 'RIGHT',
      alias: {
        product: 'P',
        user: 'U',
      },
    }).actualQuery,
});
