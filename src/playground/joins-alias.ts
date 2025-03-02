import { QueryBuilder } from '../lib/query-builder';
import { Database } from '../lib/connect';
import { productTable, userTable } from './utils/tables';
import { setupDb } from './utils/setup-db';
// this example shows an relational database with a user and a product table
// the product table has a foreign key to the user table

const db = setupDb();
db.createTable('user', userTable);
db.createTable('product', productTable);

// creating some rows - two users and some products associated with them
db.insert('user', { name: 'John Doe', age: 18 }).run();
db.insert('user', { name: 'Jane Doe', age: 20 }).run();

db.insert('product', { user_id: 1, price: 100, name: 'Banana' }).run();
db.insert('product', { user_id: 2, price: 200, name: 'Eggs' }).run();
db.insert('product', { user_id: 2, price: 200, name: 'Milk' }).run();
db.insert('product', { user_id: 2, price: 200, name: 'Meat' }).run();

// some
console.log(
  db
    .select('U.name as user_name', 'P.name as product_name')
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
