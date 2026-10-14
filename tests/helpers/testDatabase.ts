/**
 * Test Database Helper for Node 24 Built-in node:sqlite.
 * Creates an in-memory SQLite database initialized with LifeHub V1 schema.
 * Adapts DatabaseSync to SqliteExecutor without external dependencies.
 */

import { DatabaseSync } from 'node:sqlite';
import { MIGRATION_V1_SQL, MIGRATION_V2_SQL } from '../../src/db/schema.ts';
import type { SqliteExecutor } from '../../src/features/finance/repositories/types.ts';

export function createTestDatabase(): { executor: SqliteExecutor; rawDb: DatabaseSync } {
  const db = new DatabaseSync(':memory:');

  // Enforce foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Apply V1 & V2 schema
  db.exec(MIGRATION_V1_SQL);
  db.exec(MIGRATION_V2_SQL);
  db.exec('PRAGMA user_version = 2;');


  const executor: SqliteExecutor = {
    async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T[];
    },

    async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      const stmt = db.prepare(sql);
      const row = stmt.get(...params);
      return (row as T) ?? null;
    },

    async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }> {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },

    async execAsync(sql: string): Promise<void> {
      db.exec(sql);
    },

    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      db.exec('BEGIN TRANSACTION;');
      try {
        await task();
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    },
  };

  return { executor, rawDb: db };
}
