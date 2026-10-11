import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

export const DATABASE_NAME = 'lifehub.db';

let dbInstance: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Returns the singleton database instance with foreign keys enabled
 * and all schema migrations verified.
 */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Enforce foreign key constraints on every opened connection
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Run schema migrations atomically
    await runMigrations(db);

    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * Resets the cached database reference (primarily for testing and environment resets).
 */
export function resetDatabaseInstance(): void {
  dbInstance = null;
  initPromise = null;
}
