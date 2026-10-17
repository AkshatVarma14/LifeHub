import {
  MIGRATION_V1_SQL,
  MIGRATION_V2_SQL,
  MIGRATION_V3_SQL,
  TARGET_SCHEMA_VERSION,
} from './schema.ts';

export { TARGET_SCHEMA_VERSION };

/**
 * Structural database interface required for executing migrations.
 * Implemented by expo-sqlite SQLiteDatabase and test SqliteExecutor.
 */
export interface MigrationDatabase {
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/**
 * Runs pending database migrations idempotently using PRAGMA user_version.
 * Wraps each migration step execution in a database transaction to ensure atomicity.
 * If any migration step fails, the transaction rolls back without advancing user_version.
 */
export async function runMigrations(db: MigrationDatabase): Promise<void> {
  // Read current schema version
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= TARGET_SCHEMA_VERSION) {
    return;
  }

  // Apply Migration v1 (Finance vertical slice)
  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V1_SQL);
      await db.execAsync('PRAGMA user_version = 1;');
    });
    currentVersion = 1;
  }

  // Apply Migration v2 (Calendar events vertical slice)
  if (currentVersion < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V2_SQL);
      await db.execAsync('PRAGMA user_version = 2;');
    });
    currentVersion = 2;
  }

  // Apply Migration v3 (Habits & Timer sessions vertical slice - FR-08, FR-09)
  if (currentVersion < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATION_V3_SQL);
      await db.execAsync('PRAGMA user_version = 3;');
    });
    currentVersion = 3;
  }
}

