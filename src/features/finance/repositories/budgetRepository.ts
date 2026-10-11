/**
 * SQLite Monthly Budget Repository for LifeHub Finance.
 * Stage 1: Finance vertical slice.
 * Enforces validation, safe category limit storage, and idempotent upserts per month.
 */

import type { MonthlyBudget } from '../../../types/finance.ts';
import {
  type BudgetInput,
  validateBudgetInput,
} from '../validation.ts';
import {
  type SqliteExecutor,
  type BudgetRepository,
  type MonthlyBudgetRow,
  mapBudgetRow,
} from './types.ts';
import { generateUUID } from '../../../utils/id.ts';
import { isValidMonthString } from '../../../utils/date.ts';

export class SqliteBudgetRepository implements BudgetRepository {
  private getDb: () => Promise<SqliteExecutor>;

  constructor(dbOrProvider?: SqliteExecutor | (() => Promise<SqliteExecutor>)) {
    if (typeof dbOrProvider === 'function') {
      this.getDb = dbOrProvider;
    } else if (dbOrProvider) {
      this.getDb = () => Promise.resolve(dbOrProvider);
    } else {
      this.getDb = async () => {
        const { getDatabase } = await import('../../../db/client.ts');
        return getDatabase();
      };
    }
  }

  async getByMonth(month: string): Promise<MonthlyBudget | null> {
    if (!isValidMonthString(month)) {
      throw new Error(`Invalid month string '${month}'. Expected format YYYY-MM.`);
    }

    const db = await this.getDb();
    const row = await db.getFirstAsync<MonthlyBudgetRow>(
      'SELECT * FROM monthly_budgets WHERE month = ?;',
      month
    );
    return row ? mapBudgetRow(row) : null;
  }

  async upsert(input: BudgetInput): Promise<MonthlyBudget> {
    const validation = validateBudgetInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const data = validation.sanitized;
    const id = data.id ?? generateUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO monthly_budgets (id, month, total_budget_paise, category_limits_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(month) DO UPDATE SET
         total_budget_paise = excluded.total_budget_paise,
         category_limits_json = excluded.category_limits_json,
         updated_at = excluded.updated_at;`,
      id,
      data.month,
      data.totalBudgetPaise,
      data.categoryLimitsJson ?? null,
      now,
      now
    );

    const saved = await this.getByMonth(data.month);
    if (!saved) {
      throw new Error(`Failed to retrieve monthly budget for '${data.month}' after upsert`);
    }
    return saved;
  }

  async deleteByMonth(month: string): Promise<boolean> {
    if (!isValidMonthString(month)) {
      throw new Error(`Invalid month string '${month}'. Expected format YYYY-MM.`);
    }

    const db = await this.getDb();
    const result = await db.runAsync('DELETE FROM monthly_budgets WHERE month = ?;', month);
    return result.changes > 0;
  }

  async listAll(): Promise<MonthlyBudget[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<MonthlyBudgetRow>(
      'SELECT * FROM monthly_budgets ORDER BY month DESC;'
    );
    return rows.map(mapBudgetRow);
  }
}
