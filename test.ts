import { Sqlight } from './dist/src';
const db = new Sqlight();
db.createTable('users', {
  id: 'INTEGER PRIMARY KEY',
  name: 'TEXT',
  age: 'INTEGER',
});
db.createTable('products', (q) => {
  q.id();
  q.string('name');
  q.float('price');
  q.boolean('available');
});
for (let i = 0; i < 10; i++) {
  db.insert('users', {
    name: 'user' + i,
    age: i,
    id: i,
  }).run();
}
// console.log(db.select('*').from('users').where('age', '>', 5).run());
