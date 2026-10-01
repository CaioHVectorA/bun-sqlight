import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Sqlight } from '../src/index';

describe('Transaction API', () => {
  let db: Sqlight;

  beforeEach(() => {
    db = new Sqlight(':memory:');
    db.createTable('accounts', (t) => {
      t.id();
      t.string('owner');
      t.integer('balance');
    });
    db.table('accounts').create({ owner: 'Alice', balance: 100 });
    db.table('accounts').create({ owner: 'Bob', balance: 50 });
  });

  afterEach(() => {
    db.close();
  });

  test('Should commit transaction successfully', () => {
    db.transaction((trx) => {
      trx.table('accounts').update(1, { balance: 80 });
      trx.table('accounts').update(2, { balance: 70 });
    });

    const alice = db.table('accounts').find(1);
    const bob = db.table('accounts').find(2);

    expect(alice?.balance).toBe(80);
    expect(bob?.balance).toBe(70);
  });

  test('Should rollback transaction on error', () => {
    expect(() => {
      db.transaction((trx) => {
        trx.table('accounts').update(1, { balance: 10 });
        throw new Error('Failure midway through transfer');
      });
    }).toThrow('Failure midway through transfer');

    const alice = db.table('accounts').find(1);
    expect(alice?.balance).toBe(100); // Unchanged due to rollback
  });

  test('Should support async transaction and commit', async () => {
    await db.transaction(async (trx) => {
      await Promise.resolve();
      trx.table('accounts').update(1, { balance: 90 });
    });

    const alice = db.table('accounts').find(1);
    expect(alice?.balance).toBe(90);
  });

  test('Should support async transaction and rollback on rejection', async () => {
    await expect(
      db.transaction(async (trx) => {
        trx.table('accounts').update(1, { balance: 0 });
        throw new Error('Async failure');
      })
    ).rejects.toThrow('Async failure');

    const alice = db.table('accounts').find(1);
    expect(alice?.balance).toBe(100);
  });

  test('Should support manual transaction control', () => {
    const trx = db.beginTransaction();
    db.table('accounts').update(1, { balance: 300 });
    expect(trx.isActive()).toBe(true);
    trx.commit();
    expect(trx.isActive()).toBe(false);

    const alice = db.table('accounts').find(1);
    expect(alice?.balance).toBe(300);

    const trx2 = db.beginTransaction();
    db.table('accounts').update(1, { balance: 500 });
    trx2.rollback();
    expect(trx2.isActive()).toBe(false);

    const aliceAfterRollback = db.table('accounts').find(1);
    expect(aliceAfterRollback?.balance).toBe(300);
  });
});
