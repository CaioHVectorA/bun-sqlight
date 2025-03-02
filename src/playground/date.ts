import { sleep } from 'bun';
import { setupDb } from './utils/setup-db';

const db = setupDb();

(async () => {
  db.createTable('logs', (table) => {
    table.date('log_date', { default: '2021-01-01' });
    table.uuid();
    table.string('name');
  });
  db.insert('logs', {
    name: 'John Doe',
  }).run();
  await sleep(3000);
  db.insert('logs', { log_date: new Date(), name: 'Jane Doe' }).run();
})();
