import { Database as _db } from 'bun:sqlite';
export class Database extends _db {
  constructor(filename: string) {
    super();
  }
}
