import { Database } from '../lib/connect';
import type { QueryBuilder } from '../lib/query-builder';
import { MetricTimer } from '../utils/metric-timer';
import { setupDb } from './utils/setup-db';
import { complexUserTable, mock, userTable } from './utils/tables';
const db = setupDb();
const mt = new MetricTimer('100k inserts');
const number = 10000;
db.createTable('user', userTable);
mt.reset(`${number / 1000}k inserts`);
for (let i = 0; i < number; i++) {
  db.insert('user', { name: `John Doe ${i}`, age: 18 + Math.floor(Math.random() * i) }).run();
}
console.log(mt.getLabelSeconds());

db.createTable('user_complex', complexUserTable);

mt.reset(`${number / 1000}k inserts on complex table`);
for (let i = 0; i < number; i++) {
  db.insert('user_complex', mock.complexUser()).run();
}

console.log(mt.getLabelSeconds());
