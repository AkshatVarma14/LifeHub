import test from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { MIGRATION_V1_SQL, TARGET_SCHEMA_VERSION } from '../../src/db/schema.ts';

test('Database Schema: Migration V1 constants and SQL definitions', () => {
  assert.strictEqual(TARGET_SCHEMA_VERSION, 1, 'Target schema version must be 1 for Stage 1');

  // Verify tables
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS fixed_payments/i, 'Must define fixed_payments table');
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS transactions/i, 'Must define transactions table');
  assert.match(MIGRATION_V1_SQL, /CREATE TABLE IF NOT EXISTS monthly_budgets/i, 'Must define monthly_budgets table');

  // Verify paise currency representation (integer units)
  assert.match(MIGRATION_V1_SQL, /amount_paise INTEGER NOT NULL CHECK \(amount_paise > 0\)/i, 'Transactions must use amount_paise');
  assert.match(MIGRATION_V1_SQL, /expected_amount_paise INTEGER NOT NULL CHECK \(expected_amount_paise > 0\)/i, 'Fixed payments must use expected_amount_paise');
  assert.match(MIGRATION_V1_SQL, /total_budget_paise INTEGER NOT NULL CHECK \(total_budget_paise >= 0\)/i, 'Monthly budgets must use total_budget_paise');

  // Verify foreign key relationship and constraints
  assert.match(
    MIGRATION_V1_SQL,
    /linked_fixed_payment_id TEXT REFERENCES fixed_payments\(id\) ON DELETE SET NULL/i,
    'Transactions must define foreign key to fixed_payments with ON DELETE SET NULL'
  );

  // Verify indexes
  assert.match(MIGRATION_V1_SQL, /CREATE INDEX IF NOT EXISTS idx_transactions_date/i, 'Must index transactions date');
  assert.match(MIGRATION_V1_SQL, /CREATE INDEX IF NOT EXISTS idx_transactions_type/i, 'Must index transactions type');
  assert.match(MIGRATION_V1_SQL, /CREATE INDEX IF NOT EXISTS idx_monthly_budgets_month/i, 'Must index monthly budgets month');
});

test('Database Schema: Real SQLite in-memory execution and constraints', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  // Migration executes cleanly
  db.exec(MIGRATION_V1_SQL);

  // Migration is idempotent
  assert.doesNotThrow(() => {
    db.exec(MIGRATION_V1_SQL);
  }, 'Re-running migration SQL must be idempotent');

  // Insert valid fixed payment
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO fixed_payments (id, name, category, expected_amount_paise, due_day, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('fp_1', 'Rent', 'Housing', 1500000, 5, 1, now, now);

  // Insert valid transaction linked to fixed payment
  db.prepare(`
    INSERT INTO transactions (id, amount_paise, type, category, date, description, linked_fixed_payment_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('tx_1', 1500000, 'expense', 'Housing', '2026-10-05', 'October Rent', 'fp_1', now, now);

  // Verify transaction exists with link
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get('tx_1') as any;
  assert.strictEqual(tx.amount_paise, 1500000);
  assert.strictEqual(tx.linked_fixed_payment_id, 'fp_1');

  // ON DELETE SET NULL verification: deleting fixed payment must set linked_fixed_payment_id to NULL
  db.prepare('DELETE FROM fixed_payments WHERE id = ?').run('fp_1');
  const txAfterDelete = db.prepare('SELECT * FROM transactions WHERE id = ?').get('tx_1') as any;
  assert.strictEqual(txAfterDelete.linked_fixed_payment_id, null, 'linked_fixed_payment_id must be set to null on delete');

  // Foreign key violation check: linking non-existent fixed payment must throw
  assert.throws(() => {
    db.prepare(`
      INSERT INTO transactions (id, amount_paise, type, category, date, description, linked_fixed_payment_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx_bad_fk', 50000, 'expense', 'Utilities', '2026-10-06', 'Electric', 'non_existent_id', now, now);
  }, /FOREIGN KEY constraint failed/i);

  // CHECK constraint violation check: amount_paise <= 0 must fail
  assert.throws(() => {
    db.prepare(`
      INSERT INTO transactions (id, amount_paise, type, category, date, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx_zero_amt', 0, 'expense', 'Food', '2026-10-06', 'Snack', now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint violation check: invalid type must fail
  assert.throws(() => {
    db.prepare(`
      INSERT INTO transactions (id, amount_paise, type, category, date, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx_bad_type', 1000, 'invalid_type', 'Food', '2026-10-06', 'Snack', now, now);
  }, /CHECK constraint failed/i);

  // CHECK constraint violation check: monthly budget negative amount must fail
  assert.throws(() => {
    db.prepare(`
      INSERT INTO monthly_budgets (id, month, total_budget_paise, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('mb_neg', '2026-10', -100, now, now);
  }, /CHECK constraint failed/i);

  // Valid monthly budget succeeds
  db.prepare(`
    INSERT INTO monthly_budgets (id, month, total_budget_paise, category_limits_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('mb_1', '2026-10', 5000000, JSON.stringify({ Food: 1500000 }), now, now);

  const mb = db.prepare('SELECT * FROM monthly_budgets WHERE id = ?').get('mb_1') as any;
  assert.strictEqual(mb.total_budget_paise, 5000000);
});

test('Database Schema: Atomic migration lifecycle and user_version tracking', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  // Step 1: Initial state has user_version = 0
  const initialVersion = (db.prepare('PRAGMA user_version;').get() as any).user_version;
  assert.strictEqual(initialVersion, 0, 'New database must start at user_version 0');

  // Mimics the atomic transaction logic of runMigrations()
  const runMigrationLifecycle = (database: DatabaseSync) => {
    const current = (database.prepare('PRAGMA user_version;').get() as any).user_version;
    if (current >= TARGET_SCHEMA_VERSION) {
      return false; // Already current, no-op
    }

    database.exec('BEGIN TRANSACTION;');
    try {
      database.exec(MIGRATION_V1_SQL);
      database.exec('PRAGMA user_version = 1;');
      database.exec('COMMIT;');
      return true; // Applied
    } catch (err) {
      database.exec('ROLLBACK;');
      throw err;
    }
  };

  // Step 2: Apply migration from v0 -> v1
  const applied = runMigrationLifecycle(db);
  assert.strictEqual(applied, true, 'Migration must apply when user_version < 1');
  const updatedVersion = (db.prepare('PRAGMA user_version;').get() as any).user_version;
  assert.strictEqual(updatedVersion, 1, 'user_version must advance to 1 after successful migration');

  // Step 3: Idempotent no-op when already current
  const reapplied = runMigrationLifecycle(db);
  assert.strictEqual(reapplied, false, 'Migration must be skipped when already at TARGET_SCHEMA_VERSION');
  const stillVersion = (db.prepare('PRAGMA user_version;').get() as any).user_version;
  assert.strictEqual(stillVersion, 1, 'user_version must remain 1 when already current');

  // Step 4: Migration failure rolls back atomically and does NOT advance user_version
  const dbFail = new DatabaseSync(':memory:');
  assert.throws(() => {
    dbFail.exec('BEGIN TRANSACTION;');
    try {
      // Simulate DDL failure
      dbFail.exec('INVALID SQL STATEMENT CAUSING SYNTAX ERROR;');
      dbFail.exec('PRAGMA user_version = 1;');
      dbFail.exec('COMMIT;');
    } catch (err) {
      dbFail.exec('ROLLBACK;');
      throw err;
    }
  }, /syntax error/i);

  const failedVersion = (dbFail.prepare('PRAGMA user_version;').get() as any).user_version;
  assert.strictEqual(failedVersion, 0, 'user_version must NOT advance when migration fails');
});


