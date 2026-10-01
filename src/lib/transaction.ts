import type { DatabaseManager } from './db-manager';
import { SqlightQueryError } from './errors';

export interface ITransaction {
  commit(): void;
  rollback(): void;
}

export class Transaction implements ITransaction {
  private active = true;

  constructor(private dbManager: DatabaseManager<any, any>) {
    this.begin();
  }

  private begin(): void {
    try {
      this.dbManager.db.exec('BEGIN IMMEDIATE');
    } catch (err: any) {
      throw new SqlightQueryError(`Failed to begin transaction: ${err?.message || err}`);
    }
  }

  commit(): void {
    if (!this.active) return;
    try {
      this.dbManager.db.exec('COMMIT');
      this.active = false;
    } catch (err: any) {
      throw new SqlightQueryError(`Failed to commit transaction: ${err?.message || err}`);
    }
  }

  rollback(): void {
    if (!this.active) return;
    try {
      this.dbManager.db.exec('ROLLBACK');
      this.active = false;
    } catch (err: any) {
      throw new SqlightQueryError(`Failed to rollback transaction: ${err?.message || err}`);
    }
  }

  isActive(): boolean {
    return this.active;
  }
}
