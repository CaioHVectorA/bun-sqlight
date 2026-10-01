import type { DatabaseManager } from './db-manager';
import type { QueryBuilder } from './query-builder';

export interface FindManyOptions {
  where?: Record<string, any>;
  orderBy?: [string, 'ASC' | 'DESC'];
  limit?: number;
  offset?: number;
}

/**
 * TableRepository provides an ORM-style active record / repository abstraction
 * over a specific SQLite table, combining typed high-level operations with
 * zero-boilerplate CRUD and the ability to drop down to the QueryBuilder anytime.
 */
export class TableRepository<
  TSelect = any,
  TInsert = Record<string, any>,
  TUpdate = Partial<TInsert>
> {
  constructor(
    public readonly tableName: string,
    private readonly dbManager: DatabaseManager<any, any>
  ) {}

  /**
   * Drops down to the QueryBuilder pre-scoped to this table.
   */
  query(): QueryBuilder<any, any> {
    return this.dbManager.builder.from(this.tableName as any);
  }

  /**
   * Find a single record by its primary key (id).
   */
  find(id: number | string): TSelect | null {
    return this.findOne({ id });
  }

  /**
   * Alias for find(id).
   */
  findById(id: number | string): TSelect | null {
    return this.find(id);
  }

  /**
   * Find a single record matching the given conditions.
   */
  findOne(where: Record<string, any>): TSelect | null {
    const results = this.findMany({ where, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find the first record matching the given conditions (or first record in table).
   */
  findFirst(where?: Record<string, any>): TSelect | null {
    const results = this.findMany({ where, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find all records matching criteria.
   */
  findMany(options?: FindManyOptions): TSelect[] {
    const qb = this.dbManager.select('*').from(this.tableName as any);

    if (options?.where) {
      for (const [key, val] of Object.entries(options.where)) {
        qb.where(key, val);
      }
    }

    if (options?.orderBy) {
      const [col, dir] = options.orderBy;
      qb.orderBy(col, dir);
    }

    if (options?.limit !== undefined) {
      qb.limit(options.limit);
    }

    if (options?.offset !== undefined) {
      qb.offset(options.offset);
    }

    return qb.run() as TSelect[];
  }

  /**
   * Insert a new record into the table and return the inserted record.
   */
  create(data: TInsert): TSelect {
    this.dbManager.insert(this.tableName as any, data as any);
    const query = this.dbManager.builder.run();
    const queryWithReturning = `${query} RETURNING *`;

    try {
      const result = this.dbManager.db.query(queryWithReturning).get() as TSelect;
      if (result) return result;
    } catch {
      // Fallback if RETURNING clause fails
      this.dbManager.db.exec(query);
    }

    // Try finding by last_insert_rowid or by provided primary key
    const lastRowId = (this.dbManager.db.query('SELECT last_insert_rowid() AS id').get() as any)?.id;
    if (lastRowId) {
      const found = this.find(lastRowId);
      if (found) return found;
    }

    if ((data as any).id) {
      const found = this.find((data as any).id);
      if (found) return found;
    }

    return data as unknown as TSelect;
  }

  /**
   * Insert multiple records into the table.
   */
  createMany(dataList: TInsert[]): TSelect[] {
    return dataList.map((item) => this.create(item));
  }

  /**
   * Update a record by primary key (id).
   */
  update(id: number | string, data: Partial<TUpdate>): TSelect | null {
    this.dbManager.update(this.tableName as any, data as any).where('id', id);
    const query = this.dbManager.builder.run();
    const queryWithReturning = `${query} RETURNING *`;

    try {
      const result = this.dbManager.db.query(queryWithReturning).get() as TSelect;
      if (result) return result;
    } catch {
      this.dbManager.db.exec(query);
    }

    return this.find(id);
  }

  /**
   * Update records matching given WHERE conditions.
   * Returns the count of rows updated.
   */
  updateWhere(where: Record<string, any>, data: Partial<TUpdate>): number {
    const qb = this.dbManager.update(this.tableName as any, data as any);
    for (const [key, val] of Object.entries(where)) {
      qb.where(key, val);
    }
    const query = this.dbManager.builder.run();
    const result = this.dbManager.db.run(query);
    return result.changes;
  }

  /**
   * Delete a record by primary key (id).
   */
  delete(id: number | string): boolean {
    const changes = this.deleteWhere({ id });
    return changes > 0;
  }

  /**
   * Delete records matching given conditions.
   * Returns the count of deleted rows.
   */
  deleteWhere(where: Record<string, any>): number {
    const qb = this.dbManager.delete(this.tableName as any);
    for (const [key, val] of Object.entries(where)) {
      qb.where(key, val);
    }
    const query = this.dbManager.builder.run();
    const result = this.dbManager.db.run(query);
    return result.changes;
  }

  /**
   * Count records matching criteria.
   */
  count(where?: Record<string, any>): number {
    let sql = `SELECT COUNT(*) AS total FROM ${this.tableName}`;
    if (where && Object.keys(where).length > 0) {
      const clauses = Object.entries(where).map(([k, v]) =>
        `${k} = ${typeof v === 'string' ? `"${v}"` : v}`
      );
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }
    const res = this.dbManager.db.query(sql).get() as any;
    return res?.total ?? 0;
  }

  /**
   * Check if at least one record exists matching conditions.
   */
  exists(where: Record<string, any>): boolean {
    return this.count(where) > 0;
  }
}
