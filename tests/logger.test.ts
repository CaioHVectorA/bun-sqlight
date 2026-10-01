import { describe, test, expect } from 'bun:test';
import { Sqlight, type QueryLog } from '../src/index';

describe('Query Logging API', () => {
  test('Should call custom logger function with query and duration details', () => {
    const logs: QueryLog[] = [];
    const db = new Sqlight(':memory:', {
      logger: (log) => {
        logs.push(log);
      },
    });

    db.createTable('items', (t) => {
      t.id();
      t.string('name');
    });

    db.insert('items', { name: 'Item 1' }).run();
    db.select('*').from('items').run();

    expect(logs.length).toBeGreaterThanOrEqual(3);

    const schemaLog = logs.find((l) => l.type === 'SCHEMA');
    expect(schemaLog).toBeDefined();
    expect(schemaLog?.query).toContain('CREATE TABLE items');

    const selectLog = logs.find((l) => l.type === 'SELECT');
    expect(selectLog).toBeDefined();
    expect(selectLog?.query).toContain('SELECT * FROM items');
    expect(selectLog?.durationMs).toBeGreaterThanOrEqual(0);
    expect(selectLog?.timestamp).toBeInstanceOf(Date);

    db.close();
  });

  test('Should support logger: true option without erroring', () => {
    const db = new Sqlight(':memory:', { logger: true });
    expect(() => {
      db.createTable('users', (t) => {
        t.id();
        t.string('name');
      });
      db.raw('SELECT 1');
    }).not.toThrow();
    db.close();
  });
});
