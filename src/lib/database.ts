import { Database } from 'bun:sqlite';
export class SqlightBaseDatabase extends Database {
  constructor(filename: string) {
    super(filename);
  }
}
