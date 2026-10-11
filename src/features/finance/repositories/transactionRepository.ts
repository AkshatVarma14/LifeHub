/**
 * SQLite Transaction Repository for LifeHub Finance.
 * Stage 1: Finance vertical slice.
 * Enforces validation, parameterized queries, and referential integrity.
 */

import type { Transaction } from '../../../types/finance.ts';
import {
  type TransactionInput,
  validateTransactionInput,
} from '../validation.ts';
import {
  type SqliteExecutor,
  type TransactionRepository,
  type TransactionRow,
  mapTransactionRow,
} from './types.ts';
import { generateUUID } from '../../../utils/id.ts';
import { getDaysInMonth, isValidMonthString } from '../../../utils/date.ts';

export class SqliteTransactionRepository implements TransactionRepository {
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

  async create(input: TransactionInput): Promise<Transaction> {
    const validation = validateTransactionInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const data = validation.sanitized;
    const id = data.id ?? generateUUID();
    const now = new Date().toISOString();

    // Verify foreign key reference if linkedFixedPaymentId is provided
    if (data.linkedFixedPaymentId) {
      const parent = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM fixed_payments WHERE id = ?;',
        data.linkedFixedPaymentId
      );
      if (!parent) {
        throw new Error(
          `Cannot link transaction: Fixed payment commitment '${data.linkedFixedPaymentId}' does not exist`
        );
      }
    }

    await db.runAsync(
      `INSERT INTO transactions (id, amount_paise, type, category, date, description, linked_fixed_payment_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      data.amountPaise,
      data.type,
      data.category,
      data.date,
      data.description,
      data.linkedFixedPaymentId ?? null,
      now,
      now
    );

    const created = await this.getById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created transaction with id '${id}'`);
    }
    return created;
  }

  async update(id: string, input: TransactionInput): Promise<Transaction> {
    const validation = validateTransactionInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Transaction with id '${id}' not found`);
    }

    const data = validation.sanitized;
    const now = new Date().toISOString();

    if (data.linkedFixedPaymentId) {
      const parent = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM fixed_payments WHERE id = ?;',
        data.linkedFixedPaymentId
      );
      if (!parent) {
        throw new Error(
          `Cannot link transaction: Fixed payment commitment '${data.linkedFixedPaymentId}' does not exist`
        );
      }
    }

    await db.runAsync(
      `UPDATE transactions
       SET amount_paise = ?, type = ?, category = ?, date = ?, description = ?, linked_fixed_payment_id = ?, updated_at = ?
       WHERE id = ?;`,
      data.amountPaise,
      data.type,
      data.category,
      data.date,
      data.description,
      data.linkedFixedPaymentId ?? null,
      now,
      id
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated transaction with id '${id}'`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const db = await this.getDb();
    const result = await db.runAsync('DELETE FROM transactions WHERE id = ?;', id);
    return result.changes > 0;
  }

  async getById(id: string): Promise<Transaction | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<TransactionRow>(
      'SELECT * FROM transactions WHERE id = ?;',
      id
    );
    return row ? mapTransactionRow(row) : null;
  }

  async listByMonth(month: string): Promise<Transaction[]> {
    if (!isValidMonthString(month)) {
      throw new Error(`Invalid month string '${month}'. Expected format YYYY-MM.`);
    }

    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, monthNum);
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    const db = await this.getDb();
    const rows = await db.getAllAsync<TransactionRow>(
      `SELECT * FROM transactions
       WHERE date >= ? AND date <= ?
       ORDER BY date DESC, created_at DESC;`,
      startDate,
      endDate
    );
    return rows.map(mapTransactionRow);
  }

  async listAll(): Promise<Transaction[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<TransactionRow>(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC;'
    );
    return rows.map(mapTransactionRow);
  }

  async listByLinkedFixedPayment(commitmentId: string): Promise<Transaction[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<TransactionRow>(
      'SELECT * FROM transactions WHERE linked_fixed_payment_id = ? ORDER BY date DESC, created_at DESC;',
      commitmentId
    );
    return rows.map(mapTransactionRow);
  }
}
