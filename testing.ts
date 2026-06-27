import { Sqlight } from './src/index';

const db = new Sqlight('test.db');


db.createTable('users', (table) => {
    table.id();
    table.string('name');
    table.timestamps();
});



// Valid select with generic table name
db.select<'users'>('name').from('users');

// Valid insert
db.insert('users', { name: 'DSdas' });

db.close();