import { Sqlight } from './dist/';
const db = new Sqlight();
db.createTable('users', {
  id: 'INTEGER PRIMARY KEY',
  name: 'TEXT',
  age: 'INTEGER',
});

for (let i = 0; i < 10; i++) {
  db.insert('users', {
    name: 'user' + i,
    age: i,
  }).run();
}

console.log(db.select('*').from('users').where('age', 5).run());
