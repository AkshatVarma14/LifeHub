import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_V1_SQL, TARGET_SCHEMA_VERSION } from './schema';

export { TARGET_SCHEMA_VERSION };

/**
 * Runs pending database migrations idempotently using PRAGMA user_version.
 * Wraps migration execution in a database transaction to ensure atomicity.
 * If any migration step fails, the transaction rolls back without advancing user_version.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Read current schema version
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= TARGET_SCHEMA_VERSION) {
    return;
  }

  // Apply Migration v1
  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V1_SQL);
      await db.execAsync('PRAGMA user_version = 1;');
    });
  }
}
