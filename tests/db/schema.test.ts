import test from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { MIGRATION_V1_SQL, MIGRATION_V2_SQL, TARGET_SCHEMA_VERSION } from '../../src/db/schema.ts';
import { runMigrations, type MigrationDatabase } from '../../src/db/migrations.ts';

function createTestExecutor(rawDb: DatabaseSync): MigrationDatabase & {
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  runAsync: (sql: string, ...params: unknown[]) => Promise<{ changes: number; lastInsertRowId: number }>;
} {
  return {
    async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      const stmt = rawDb.prepare(sql);
      const row = stmt.get(...params);
      return (row as T) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const stmt = rawDb.prepare(sql);
      return stmt.all(...params) as T[];
    },
    async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }> {
      const stmt = rawDb.prepare(sql);
      const result = stmt.run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    async execAsync(sql: string): Promise<void> {
      rawDb.exec(sql);
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      rawDb.exec('BEGIN TRANSACTION;');
      try {
        await task();
        rawDb.exec('COMMIT;');
      } catch (err) {
        rawDb.exec('ROLLBACK;');
        throw err;
      }
    },
  };
}

test('Database Schema: Migration V1 and V2 constants and SQL definitions', () => {
  assert.strictEqual(TARGET_SCHEMA_VERSION, 2, 'Target schema version must be 2 for Stage 1 Slice 5A');

  // Verify V1 tables (Finance)
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS fixed_payments/i, 'Must define fixed_payments table');
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS transactions/i, 'Must define transactions table');
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS monthly_budgets/i, 'Must define monthly_budgets table');

  // Verify V2 table and indexes (Calendar Events - FR-07)
  assert.match(MIGRATION_V2_SQL, /CREATE TABLE IF NOT EXISTS events/i, 'Must define events table in V2');
  assert.match(MIGRATION_V2_SQL, /CREATE INDEX IF NOT EXISTS idx_events_start_time ON events\(start_time\)/i, 'Must index events start_time');
  assert.match(MIGRATION_V2_SQL, /CREATE INDEX IF NOT EXISTS idx_events_status ON events\(status\)/i, 'Must index events status');
  assert.match(MIGRATION_V2_SQL, /CREATE INDEX IF NOT EXISTS idx_events_category ON events\(category\)/i, 'Must index events category');
  assert.match(MIGRATION_V2_SQL, /CREATE INDEX IF NOT EXISTS idx_events_source ON events\(source\)/i, 'Must index events source');

  // Verify V2 column constraints
  assert.match(MIGRATION_V2_SQL, /title TEXT NOT NULL CHECK \(length\(trim\(title\)\) > 0\)/i, 'Title must be non-empty');
  assert.match(MIGRATION_V2_SQL, /category TEXT NOT NULL CHECK \(length\(trim\(category\)\) > 0\)/i, 'Category must be non-empty');
  assert.match(MIGRATION_V2_SQL, /end_time TEXT CHECK \(end_time IS NULL OR end_time >= start_time\)/i, 'end_time must be >= start_time');
  assert.match(MIGRATION_V2_SQL, /recurrence TEXT NOT NULL DEFAULT 'none' CHECK \(recurrence IN \('none', 'daily', 'weekly', 'monthly', 'yearly'\)\)/i, 'recurrence enum check');
  assert.match(MIGRATION_V2_SQL, /reminder_minutes_before INTEGER CHECK \(reminder_minutes_before IS NULL OR \(reminder_minutes_before >= 0 AND reminder_minutes_before <= 43200\)\)/i, 'reminder offset check');
  assert.match(MIGRATION_V2_SQL, /status TEXT NOT NULL DEFAULT 'pending' CHECK \(status IN \('pending', 'completed', 'cancelled'\)\)/i, 'status enum check');
  assert.match(MIGRATION_V2_SQL, /source TEXT NOT NULL DEFAULT 'manual' CHECK \(source IN \('manual', 'email', 'system'\)\)/i, 'source enum check');
});

test('Database Schema: Real SQLite in-memory execution and constraints for V1 and V2', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  // Migrations execute cleanly
  db.exec(MIGRATION_V1_SQL);
  db.exec(MIGRATION_V2_SQL);

  // Migrations are idempotent
  assert.doesNotThrow(() => {
    db.exec(MIGRATION_V1_SQL);
    db.exec(MIGRATION_V2_SQL);
  }, 'Re-running migration SQL must be idempotent');

  const now = new Date().toISOString();

  // Valid event insert succeeds
  db.prepare(`
    INSERT INTO events (id, title, start_time, end_time, category, location, notes, recurrence, reminder_minutes_before, status, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('evt_1', 'Team Sync', '2026-10-15T09:00:00.000Z', '2026-10-15T10:00:00.000Z', 'Work', 'Room A', 'Agenda items', 'weekly', 15, 'pending', 'manual', now, now);

  const evt = db.prepare('SELECT * FROM events WHERE id = ?').get('evt_1') as any;
  assert.strictEqual(evt.title, 'Team Sync');
  assert.strictEqual(evt.start_time, '2026-10-15T09:00:00.000Z');
  assert.strictEqual(evt.status, 'pending');
  assert.strictEqual(evt.source, 'manual');

  // CHECK constraint: empty title fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO events (id, title, start_time, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('evt_bad_title', '   ', '2026-10-15T09:00:00.000Z', 'Work', now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint: empty category fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO events (id, title, start_time, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('evt_bad_cat', 'Title', '2026-10-15T09:00:00.000Z', '  ', now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint: end_time earlier than start_time fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO events (id, title, start_time, end_time, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('evt_bad_range', 'Title', '2026-10-15T10:00:00.000Z', '2026-10-15T09:00:00.000Z', 'Work', now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint: invalid recurrence fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO events (id, title, start_time, category, recurrence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('evt_bad_rec', 'Title', '2026-10-15T10:00:00.000Z', 'Work', 'invalid_recurrence', now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint: negative reminder fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO events (id, title, start_time, category, reminder_minutes_before, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('evt_bad_rem_neg', 'Title', '2026-10-15T10:00:00.000Z', 'Work', -5, now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint: oversized reminder (> 43200) fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO events (id, title, start_time, category, reminder_minutes_before, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('evt_bad_rem_big', 'Title', '2026-10-15T10:00:00.000Z', 'Work', 43201, now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint: invalid status fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO events (id, title, start_time, category, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('evt_bad_status', 'Title', '2026-10-15T10:00:00.000Z', 'Work', 'in_progress', now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint: invalid source fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO events (id, title, start_time, category, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('evt_bad_source', 'Title', '2026-10-15T10:00:00.000Z', 'Work', 'external', now, now);
  }, /CHECK constraint failed/i);
});

test('Database Schema: Real production runMigrations lifecycle, finance data preservation, and atomic rollback', async () => {
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');
  const executor = createTestExecutor(rawDb);

  // Step 1: Initial state has user_version = 0
  const initialVersion = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(initialVersion, 0, 'New database must start at user_version 0');

  // Step 2: Simulate existing user at v1 (current production state in commit 45aba41)
  rawDb.exec(MIGRATION_V1_SQL);
  rawDb.exec('PRAGMA user_version = 1;');
  const v1 = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(v1, 1, 'Database must be at user_version 1');

  // Seed pre-existing finance data at v1
  const now = new Date().toISOString();
  await executor.runAsync(`
    INSERT INTO fixed_payments (id, name, category, expected_amount_paise, due_day, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, 'fp_1', 'Rent', 'Housing', 1500000, 5, 1, now, now);

  await executor.runAsync(`
    INSERT INTO transactions (id, amount_paise, type, category, date, description, linked_fixed_payment_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, 'tx_1', 1500000, 'expense', 'Housing', '2026-10-05', 'Rent payment', 'fp_1', now, now);

  await executor.runAsync(`
    INSERT INTO monthly_budgets (id, month, total_budget_paise, category_limits_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?);
  `, 'mb_1', '2026-10', 5000000, JSON.stringify({ Housing: 1500000 }), now, now);

  // Step 3: Migration rollback regression test
  // Inject a failure into execAsync when executing MIGRATION_V2_SQL after partially executing real DDL
  const failingExecutor: MigrationDatabase = {
    ...executor,
    async execAsync(sql: string): Promise<void> {
      if (sql === MIGRATION_V2_SQL) {
        // Execute real SQLite DDL statement that creates the events table inside the uncommitted production transaction
        await executor.execAsync(`
          CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            start_time TEXT NOT NULL,
            category TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);
        throw new Error('Simulated DDL syntax failure midway during v2 migration');
      }
      return executor.execAsync(sql);
    },
  };

  // Calling production runMigrations with failing executor must reject
  await assert.rejects(
    async () => {
      await runMigrations(failingExecutor);
    },
    /Simulated DDL syntax failure midway during v2 migration/i,
    'runMigrations must reject on DDL error'
  );

  // Assert user_version remains 1 after rollback
  const vAfterFailure = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(vAfterFailure, 1, 'user_version must remain 1 when v2 migration rolls back');

  // Assert events table and its indexes do NOT exist
  const eventsTable = await executor.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='events';"
  );
  assert.strictEqual(eventsTable, null, 'events table must be absent after rollback');

  const eventsIndex = await executor.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_events_start_time';"
  );
  assert.strictEqual(eventsIndex, null, 'idx_events_start_time must be absent after rollback');

  // Assert all pre-existing finance records are completely unchanged
  const fp = await executor.getFirstAsync<any>('SELECT * FROM fixed_payments WHERE id = ?;', 'fp_1');
  assert.strictEqual(fp.name, 'Rent');
  assert.strictEqual(fp.expected_amount_paise, 1500000);

  const tx = await executor.getFirstAsync<any>('SELECT * FROM transactions WHERE id = ?;', 'tx_1');
  assert.strictEqual(tx.amount_paise, 1500000);
  assert.strictEqual(tx.linked_fixed_payment_id, 'fp_1');

  const mb = await executor.getFirstAsync<any>('SELECT * FROM monthly_budgets WHERE id = ?;', 'mb_1');
  assert.strictEqual(mb.total_budget_paise, 5000000);

  // Step 4: Successful migration from v1 to v2 via real production runMigrations()
  await runMigrations(executor);

  const vCurrent = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(vCurrent, 2, 'user_version must advance to 2 after successful v2 migration');

  // Assert events table now exists
  const eventsTableCreated = await executor.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='events';"
  );
  assert.strictEqual(eventsTableCreated?.name, 'events', 'events table must exist after v2 migration');

  // Assert finance records STILL completely intact after upgrade
  const txAfterUpgrade = await executor.getFirstAsync<any>('SELECT * FROM transactions WHERE id = ?;', 'tx_1');
  assert.strictEqual(txAfterUpgrade.amount_paise, 1500000);

  // Step 5: Idempotency check: re-running runMigrations() on already up-to-date DB is a no-op
  await runMigrations(executor);
  const vStill = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(vStill, 2, 'user_version must remain 2 on idempotent re-run');
});
