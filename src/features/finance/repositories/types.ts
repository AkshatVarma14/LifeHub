/**
 * Repository Types, Database Row Models, and Mappers for LifeHub Finance.
 * Stage 1: Finance vertical slice.
 */

import type {
  Transaction,
  MonthlyBudget,
  FixedPayment,
  TransactionType,
  ExpenseCategory,
  FinanceCategory,
} from '../../../types/finance.ts';
import type {
  TransactionInput,
  BudgetInput,
  FixedPaymentInput,
} from '../validation.ts';

/**
 * Common strongly-typed async SQLite executor interface.
 * Implemented natively by Expo SQLite's SQLiteDatabase, and by our Node 24 in-memory test adapter.
 */
export interface SqliteExecutor {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(
    sql: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }>;
  execAsync(sql: string): Promise<void>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/**
 * Database row representation for `transactions` table.
 */
export interface TransactionRow {
  id: string;
  amount_paise: number;
  type: string;
  category: string;
  date: string;
  description: string;
  linked_fixed_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row representation for `monthly_budgets` table.
 */
export interface MonthlyBudgetRow {
  id: string;
  month: string;
  total_budget_paise: number;
  category_limits_json: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row representation for `fixed_payments` table.
 */
export interface FixedPaymentRow {
  id: string;
  name: string;
  category: string;
  expected_amount_paise: number;
  due_day: number;
  active: number; // 0 or 1 in SQLite
  created_at: string;
  updated_at: string;
}

/**
 * Maps a SQLite transaction row to the strongly-typed Transaction domain entity.
 */
export function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    amountPaise: row.amount_paise,
    type: row.type as TransactionType,
    category: row.category as FinanceCategory,
    date: row.date,
    description: row.description,
    linkedFixedPaymentId: row.linked_fixed_payment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a SQLite monthly_budgets row to the strongly-typed MonthlyBudget domain entity.
 */
export function mapBudgetRow(row: MonthlyBudgetRow): MonthlyBudget {
  return {
    id: row.id,
    month: row.month,
    totalBudgetPaise: row.total_budget_paise,
    categoryLimitsJson: row.category_limits_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a SQLite fixed_payments row to the strongly-typed FixedPayment domain entity.
 */
export function mapFixedPaymentRow(row: FixedPaymentRow): FixedPayment {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExpenseCategory,
    expectedAmountPaise: row.expected_amount_paise,
    dueDay: row.due_day,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface TransactionRepository {
  create(input: TransactionInput): Promise<Transaction>;
  update(id: string, input: TransactionInput): Promise<Transaction>;
  delete(id: string): Promise<boolean>;
  getById(id: string): Promise<Transaction | null>;
  listByMonth(month: string): Promise<Transaction[]>;
  listAll(): Promise<Transaction[]>;
  listByLinkedFixedPayment(commitmentId: string): Promise<Transaction[]>;
}

export interface BudgetRepository {
  getByMonth(month: string): Promise<MonthlyBudget | null>;
  upsert(input: BudgetInput): Promise<MonthlyBudget>;
  deleteByMonth(month: string): Promise<boolean>;
  listAll(): Promise<MonthlyBudget[]>;
}

export interface FixedPaymentRepository {
  create(input: FixedPaymentInput): Promise<FixedPayment>;
  update(id: string, input: FixedPaymentInput): Promise<FixedPayment>;
  delete(id: string): Promise<boolean>;
  getById(id: string): Promise<FixedPayment | null>;
  listAll(): Promise<FixedPayment[]>;
  listActive(): Promise<FixedPayment[]>;
}
