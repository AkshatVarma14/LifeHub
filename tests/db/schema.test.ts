import test from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import {
  MIGRATION_V1_SQL,
  MIGRATION_V2_SQL,
  MIGRATION_V3_SQL,
  TARGET_SCHEMA_VERSION,
} from '../../src/db/schema.ts';
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

test('Database Schema: Migration constants and SQL definitions (V1, V2, V3)', () => {
  assert.strictEqual(TARGET_SCHEMA_VERSION, 3, 'Target schema version must be 3 for Stage 1 Slice 6A');

  // Verify V1 tables (Finance)
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS fixed_payments/i, 'Must define fixed_payments table');
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS transactions/i, 'Must define transactions table');
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS monthly_budgets/i, 'Must define monthly_budgets table');

  // Verify V2 table and indexes (Calendar Events - FR-07)
  assert.match(MIGRATION_V2_SQL, /CREATE TABLE IF NOT EXISTS events/i, 'Must define events table in V2');
  assert.match(MIGRATION_V2_SQL, /CREATE INDEX IF NOT EXISTS idx_events_start_time ON events\(start_time\)/i, 'Must index events start_time');

  // Verify V3 tables and indexes (Habits & Timers - FR-08, FR-09)
  assert.match(MIGRATION_V3_SQL, /CREATE TABLE IF NOT EXISTS habits/i, 'Must define habits table in V3');
  assert.match(MIGRATION_V3_SQL, /CREATE TABLE IF NOT EXISTS habit_completions/i, 'Must define habit_completions table in V3');
  assert.match(MIGRATION_V3_SQL, /CREATE TABLE IF NOT EXISTS timer_sessions/i, 'Must define timer_sessions table in V3');

  // Verify V3 constraints and indexes
  assert.match(MIGRATION_V3_SQL, /name TEXT NOT NULL CHECK \(length\(trim\(name\)\) > 0\)/i, 'Habit name non-empty check');
  assert.match(MIGRATION_V3_SQL, /is_archived INTEGER NOT NULL DEFAULT 0 CHECK \(is_archived IN \(0, 1\)\)/i, 'is_archived boolean check');
  assert.match(MIGRATION_V3_SQL, /UNIQUE \(habit_id, completed_date\)/i, 'Unique constraint on habit completion date');
  assert.match(MIGRATION_V3_SQL, /type TEXT NOT NULL CHECK \(type IN \('stopwatch', 'countdown'\)\)/i, 'Timer type check');
  assert.match(MIGRATION_V3_SQL, /status TEXT NOT NULL CHECK \(status IN \('running', 'paused', 'completed', 'cancelled'\)\)/i, 'Timer status check');
  assert.match(MIGRATION_V3_SQL, /ended_at TEXT CHECK \(ended_at IS NULL OR ended_at >= started_at\)/i, 'Timer ended_at chronology check');
  assert.match(MIGRATION_V3_SQL, /CREATE UNIQUE INDEX IF NOT EXISTS idx_timer_sessions_single_active/i, 'Single active timer unique index');
});

test('Database Schema: Real SQLite in-memory execution and constraints for V1, V2, and V3', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  // Migrations execute cleanly and idempotently
  db.exec(MIGRATION_V1_SQL);
  db.exec(MIGRATION_V2_SQL);
  db.exec(MIGRATION_V3_SQL);
  assert.doesNotThrow(() => {
    db.exec(MIGRATION_V1_SQL);
    db.exec(MIGRATION_V2_SQL);
    db.exec(MIGRATION_V3_SQL);
  }, 'Re-running migration SQL must be idempotent');

  const now = new Date().toISOString();

  // 1. Valid habit insert
  db.prepare(`
    INSERT INTO habits (id, name, description, is_archived, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?);
  `).run('h_1', 'Morning Meditation', '10 mins daily', 0, now, now);

  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get('h_1') as any;
  assert.strictEqual(habit.name, 'Morning Meditation');
  assert.strictEqual(habit.is_archived, 0);

  // CHECK constraint: empty habit name fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO habits (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?);
    `).run('h_bad', '   ', now, now);
  }, /CHECK constraint failed/i);

  // 2. Habit completion insert
  db.prepare(`
    INSERT INTO habit_completions (id, habit_id, completed_date, completed_at, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?);
  `).run('c_1', 'h_1', '2026-10-18', now, 'Felt great', now);

  const comp = db.prepare('SELECT * FROM habit_completions WHERE id = ?').get('c_1') as any;
  assert.strictEqual(comp.habit_id, 'h_1');
  assert.strictEqual(comp.completed_date, '2026-10-18');

  // UNIQUE constraint: duplicate completion on same day fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO habit_completions (id, habit_id, completed_date, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?);
    `).run('c_dup', 'h_1', '2026-10-18', now, now);
  }, /UNIQUE constraint failed/i);

  // FOREIGN KEY: completion for non-existent habit fails
  assert.throws(() => {
    db.prepare(`
      INSERT INTO habit_completions (id, habit_id, completed_date, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?);
    `).run('c_bad_habit', 'h_nonexistent', '2026-10-19', now, now);
  }, /FOREIGN KEY constraint failed/i);

  // 3. Timer session insert (stopwatch)
  db.prepare(`
    INSERT INTO timer_sessions (id, habit_id, type, status, started_at, target_duration_seconds, accumulated_seconds, current_segment_started_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run('ts_1', 'h_1', 'stopwatch', 'running', now, null, 0, now, now, now);

  // CHECK constraint: stopwatch cannot have target_duration_seconds
  assert.throws(() => {
    db.prepare(`
      INSERT INTO timer_sessions (id, type, status, started_at, target_duration_seconds, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `).run('ts_bad_sw', 'stopwatch', 'running', now, 300, now, now);
  }, /CHECK constraint failed/i);

  // UNIQUE INDEX constraint: second active timer (running) fails at DB level
  assert.throws(() => {
    db.prepare(`
      INSERT INTO timer_sessions (id, habit_id, type, status, started_at, target_duration_seconds, accumulated_seconds, current_segment_started_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run('ts_2_conflict', 'h_1', 'stopwatch', 'running', now, null, 0, now, now, now);
  }, /UNIQUE constraint failed.*idx_timer_sessions_single_active/i);

  // UNIQUE INDEX constraint: second active timer (paused) also fails at DB level
  assert.throws(() => {
    db.prepare(`
      INSERT INTO timer_sessions (id, habit_id, type, status, started_at, target_duration_seconds, accumulated_seconds, current_segment_started_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run('ts_2_paused_conflict', 'h_1', 'countdown', 'paused', now, 600, 0, null, now, now);
  }, /UNIQUE constraint failed.*idx_timer_sessions_single_active/i);

  // CHECK constraint: ended_at earlier than started_at fails
  const earlier = new Date(Date.now() - 60000).toISOString();
  assert.throws(() => {
    db.prepare(`
      INSERT INTO timer_sessions (id, type, status, started_at, ended_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `).run('ts_bad_ended_at', 'stopwatch', 'completed', now, earlier, now, now);
  }, /CHECK constraint failed/i);

  // Free active slot by completing ts_1
  db.prepare(`
    UPDATE timer_sessions
    SET status = 'completed', ended_at = ?, current_segment_started_at = NULL
    WHERE id = 'ts_1';
  `).run(now);

  // 4. Timer session insert (countdown) now succeeds because ts_1 is completed
  db.prepare(`
    INSERT INTO timer_sessions (id, habit_id, type, status, started_at, target_duration_seconds, accumulated_seconds, current_segment_started_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run('ts_2', 'h_1', 'countdown', 'running', now, 1500, 0, now, now, now);

  // CHECK constraint: countdown must have target_duration_seconds > 0
  assert.throws(() => {
    db.prepare(`
      INSERT INTO timer_sessions (id, type, status, started_at, target_duration_seconds, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `).run('ts_bad_cd', 'countdown', 'paused', now, null, now, now);
  }, /CHECK constraint failed/i);

  assert.throws(() => {
    db.prepare(`
      INSERT INTO timer_sessions (id, type, status, started_at, target_duration_seconds, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `).run('ts_bad_cd_0', 'countdown', 'paused', now, 0, now, now);
  }, /CHECK constraint failed/i);
});

test('Database Schema: Real production runMigrations lifecycle (v1 -> v2 -> v3) and atomic rollback', async () => {
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');
  const executor = createTestExecutor(rawDb);

  // Step 1: Initial state has user_version = 0
  const initialVersion = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(initialVersion, 0, 'New database must start at user_version 0');

  // Step 2: Seed v1 and v2 pre-existing user data
  rawDb.exec(MIGRATION_V1_SQL);
  rawDb.exec('PRAGMA user_version = 1;');
  rawDb.exec(MIGRATION_V2_SQL);
  rawDb.exec('PRAGMA user_version = 2;');

  const now = new Date().toISOString();
  await executor.runAsync(`
    INSERT INTO transactions (id, amount_paise, type, category, date, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, 'tx_1', 250000, 'expense', 'Food', '2026-10-10', 'Groceries', now, now);

  await executor.runAsync(`
    INSERT INTO events (id, title, start_time, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?);
  `, 'evt_1', 'Sprint Planning', '2026-10-20T10:00:00.000Z', 'Work', now, now);

  // Step 3: Migration rollback test for v3
  const failingExecutor: MigrationDatabase = {
    ...executor,
    async execAsync(sql: string): Promise<void> {
      if (sql === MIGRATION_V3_SQL) {
        // Run partial DDL inside the uncommitted transaction then fail
        await executor.execAsync(`
          CREATE TABLE IF NOT EXISTS habits (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);
        throw new Error('Simulated failure during v3 migration');
      }
      return executor.execAsync(sql);
    },
  };

  await assert.rejects(
    async () => {
      await runMigrations(failingExecutor);
    },
    /Simulated failure during v3 migration/i
  );

  // user_version must remain 2 after rollback
  const vAfterFailure = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(vAfterFailure, 2, 'user_version must remain 2 after failed v3 migration');

  // habits table must not exist
  const habitTableAfterRollback = await executor.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='habits';"
  );
  assert.strictEqual(habitTableAfterRollback, null, 'habits table must be rolled back');

  // Verify prior data is 100% intact
  const tx = await executor.getFirstAsync<any>('SELECT * FROM transactions WHERE id = ?;', 'tx_1');
  assert.strictEqual(tx.amount_paise, 250000);

  const evt = await executor.getFirstAsync<any>('SELECT * FROM events WHERE id = ?;', 'evt_1');
  assert.strictEqual(evt.title, 'Sprint Planning');

  // Step 4: Successful migration to v3
  await runMigrations(executor);

  const vCurrent = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(vCurrent, 3, 'user_version must advance to 3');

  const habitsTable = await executor.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='habits';"
  );
  assert.strictEqual(habitsTable?.name, 'habits');

  const completionsTable = await executor.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='habit_completions';"
  );
  assert.strictEqual(completionsTable?.name, 'habit_completions');

  const timersTable = await executor.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='timer_sessions';"
  );
  assert.strictEqual(timersTable?.name, 'timer_sessions');

  // Prior data still intact after upgrade
  const txAfter = await executor.getFirstAsync<any>('SELECT * FROM transactions WHERE id = ?;', 'tx_1');
  assert.strictEqual(txAfter.amount_paise, 250000);

  // Step 5: Idempotency
  await runMigrations(executor);
  const vIdempotent = (await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;
  assert.strictEqual(vIdempotent, 3);
});
