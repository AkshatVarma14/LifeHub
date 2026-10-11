/**
 * Database schema definitions for LifeHub.
 * Stage 1: Finance vertical slice (Transactions, Monthly Budgets, Fixed Payments).
 * All monetary amounts are stored as integer minor units (paise for INR).
 */

export const TARGET_SCHEMA_VERSION = 1;

export const MIGRATION_V1_SQL = `
-- Fixed Payment Definitions (TDD §4.1.5 - Schema foundation for foreign keys; UI deferred)
CREATE TABLE IF NOT EXISTS fixed_payments (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  expected_amount_paise INTEGER NOT NULL CHECK (expected_amount_paise > 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Actual Financial Transactions (FR-01, FR-03, ADR-02)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category TEXT NOT NULL,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  description TEXT NOT NULL,
  linked_fixed_payment_id TEXT REFERENCES fixed_payments(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_linked ON transactions(linked_fixed_payment_id);

-- Monthly Budget Ceilings and Category Limits (FR-02)
CREATE TABLE IF NOT EXISTS monthly_budgets (
  id TEXT PRIMARY KEY NOT NULL,
  month TEXT UNIQUE NOT NULL, -- Format: YYYY-MM
  total_budget_paise INTEGER NOT NULL CHECK (total_budget_paise >= 0),
  category_limits_json TEXT, -- Serialized JSON: Record<string, number> in paise
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_month ON monthly_budgets(month);
`;
