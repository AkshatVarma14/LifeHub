/**
 * Database schema definitions for LifeHub.
 * Stage 1: Finance vertical slice (Transactions, Monthly Budgets, Fixed Payments).
 * All monetary amounts are stored as integer minor units (paise for INR).
 */

export const TARGET_SCHEMA_VERSION = 3;

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

export const MIGRATION_V2_SQL = `
-- Calendar Events (FR-07)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  start_time TEXT NOT NULL,
  end_time TEXT CHECK (end_time IS NULL OR end_time >= start_time),
  category TEXT NOT NULL CHECK (length(trim(category)) > 0),
  location TEXT,
  notes TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  reminder_minutes_before INTEGER CHECK (reminder_minutes_before IS NULL OR (reminder_minutes_before >= 0 AND reminder_minutes_before <= 43200)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'email', 'system')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
`;

export const MIGRATION_V3_SQL = `
-- Habits (FR-08)
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_habits_is_archived ON habits(is_archived);
CREATE INDEX IF NOT EXISTS idx_habits_created_at ON habits(created_at);

-- Habit Completions (FR-08)
CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_date TEXT NOT NULL, -- Format: YYYY-MM-DD (local calendar date of completion)
  completed_at TEXT NOT NULL, -- Canonical UTC ISO-8601
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (habit_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completed_date);

-- Timer Sessions (FR-08, FR-09)
CREATE TABLE IF NOT EXISTS timer_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT REFERENCES habits(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('stopwatch', 'countdown')),
  status TEXT NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
  started_at TEXT NOT NULL,
  target_duration_seconds INTEGER CHECK (
    (type = 'stopwatch' AND target_duration_seconds IS NULL) OR
    (type = 'countdown' AND target_duration_seconds IS NOT NULL AND target_duration_seconds > 0)
  ),
  accumulated_seconds INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_seconds >= 0),
  current_segment_started_at TEXT,
  ended_at TEXT CHECK (ended_at IS NULL OR ended_at >= started_at),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timer_sessions_habit_id ON timer_sessions(habit_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_status ON timer_sessions(status);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_started_at ON timer_sessions(started_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_timer_sessions_single_active ON timer_sessions((1)) WHERE status IN ('running', 'paused');
`;

