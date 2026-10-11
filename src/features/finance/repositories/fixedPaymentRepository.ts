/**
 * SQLite Fixed Payment Commitment Repository for LifeHub Finance.
 * Stage 1: Finance vertical slice.
 * Enforces validation, parameterized queries, and due-day ordering.
 */

import type { FixedPayment } from '../../../types/finance.ts';
import {
  type FixedPaymentInput,
  validateFixedPaymentInput,
} from '../validation.ts';
import {
  type SqliteExecutor,
  type FixedPaymentRepository,
  type FixedPaymentRow,
  mapFixedPaymentRow,
} from './types.ts';
import { generateUUID } from '../../../utils/id.ts';

export class SqliteFixedPaymentRepository implements FixedPaymentRepository {
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

  async create(input: FixedPaymentInput): Promise<FixedPayment> {
    const validation = validateFixedPaymentInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const data = validation.sanitized;
    const id = data.id ?? generateUUID();
    const now = new Date().toISOString();
    const activeInt = data.active ? 1 : 0;

    await db.runAsync(
      `INSERT INTO fixed_payments (id, name, category, expected_amount_paise, due_day, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      data.name,
      data.category,
      data.expectedAmountPaise,
      data.dueDay,
      activeInt,
      now,
      now
    );

    const created = await this.getById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created fixed payment commitment with id '${id}'`);
    }
    return created;
  }

  async update(id: string, input: FixedPaymentInput): Promise<FixedPayment> {
    const validation = validateFixedPaymentInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Fixed payment commitment with id '${id}' not found`);
    }

    const data = validation.sanitized;
    const now = new Date().toISOString();
    const activeInt = data.active ? 1 : 0;

    await db.runAsync(
      `UPDATE fixed_payments
       SET name = ?, category = ?, expected_amount_paise = ?, due_day = ?, active = ?, updated_at = ?
       WHERE id = ?;`,
      data.name,
      data.category,
      data.expectedAmountPaise,
      data.dueDay,
      activeInt,
      now,
      id
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated fixed payment commitment with id '${id}'`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const db = await this.getDb();
    // Triggering ON DELETE SET NULL on linked transactions automatically via SQLite schema
    const result = await db.runAsync('DELETE FROM fixed_payments WHERE id = ?;', id);
    return result.changes > 0;
  }

  async getById(id: string): Promise<FixedPayment | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<FixedPaymentRow>(
      'SELECT * FROM fixed_payments WHERE id = ?;',
      id
    );
    return row ? mapFixedPaymentRow(row) : null;
  }

  async listAll(): Promise<FixedPayment[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<FixedPaymentRow>(
      'SELECT * FROM fixed_payments ORDER BY due_day ASC, name ASC;'
    );
    return rows.map(mapFixedPaymentRow);
  }

  async listActive(): Promise<FixedPayment[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<FixedPaymentRow>(
      'SELECT * FROM fixed_payments WHERE active = 1 ORDER BY due_day ASC, name ASC;'
    );
    return rows.map(mapFixedPaymentRow);
  }
}
