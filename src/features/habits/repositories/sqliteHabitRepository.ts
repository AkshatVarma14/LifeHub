/**
 * SQLite Habit Repository for LifeHub.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08).
 * Manages habit definitions and completion history with duplicate prevention.
 */

import type { Habit, HabitCompletion } from '../../../types/habits.ts';
import {
  type HabitInput,
  type CompletionInput,
  validateHabitInput,
  validateCompletionInput,
} from '../validation.ts';
import {
  type SqliteExecutor,
  type HabitRepository,
  type HabitRow,
  type HabitCompletionRow,
  mapHabitRow,
  mapCompletionRow,
} from './types.ts';
import { generateUUID } from '../../../utils/id.ts';

export class SqliteHabitRepository implements HabitRepository {
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

  async create(input: HabitInput): Promise<Habit> {
    const validation = validateHabitInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Habit validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const data = validation.sanitized;
    const id = data.id ?? generateUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO habits (id, name, description, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      id,
      data.name,
      data.description ?? null,
      data.isArchived ? 1 : 0,
      now,
      now
    );

    const created = await this.getById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created habit with id '${id}'`);
    }
    return created;
  }

  async getById(id: string): Promise<Habit | null> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      return null;
    }
    const db = await this.getDb();
    const row = await db.getFirstAsync<HabitRow>(
      `SELECT * FROM habits WHERE id = ?;`,
      id.trim()
    );
    return row ? mapHabitRow(row) : null;
  }

  async list(includeArchived = false): Promise<Habit[]> {
    const db = await this.getDb();
    const sql = includeArchived
      ? `SELECT * FROM habits ORDER BY created_at ASC;`
      : `SELECT * FROM habits WHERE is_archived = 0 ORDER BY created_at ASC;`;
    const rows = await db.getAllAsync<HabitRow>(sql);
    return rows.map(mapHabitRow);
  }

  async update(id: string, input: HabitInput): Promise<Habit> {
    const validation = validateHabitInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Habit validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Habit with id '${id}' not found`);
    }

    const data = validation.sanitized;
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE habits
       SET name = ?, description = ?, is_archived = ?, updated_at = ?
       WHERE id = ?;`,
      data.name,
      data.description ?? null,
      data.isArchived ? 1 : 0,
      now,
      id.trim()
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated habit with id '${id}'`);
    }
    return updated;
  }

  async archive(id: string): Promise<Habit> {
    const db = await this.getDb();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Habit with id '${id}' not found`);
    }
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE habits SET is_archived = 1, updated_at = ? WHERE id = ?;`,
      now,
      id.trim()
    );
    const updated = await this.getById(id);
    return updated!;
  }

  async unarchive(id: string): Promise<Habit> {
    const db = await this.getDb();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Habit with id '${id}' not found`);
    }
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE habits SET is_archived = 0, updated_at = ? WHERE id = ?;`,
      now,
      id.trim()
    );
    const updated = await this.getById(id);
    return updated!;
  }

  async delete(id: string): Promise<boolean> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      return false;
    }
    const db = await this.getDb();
    const result = await db.runAsync(
      `DELETE FROM habits WHERE id = ?;`,
      id.trim()
    );
    return result.changes > 0;
  }

  async recordCompletion(input: CompletionInput): Promise<HabitCompletion> {
    const validation = validateCompletionInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Completion validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const data = validation.sanitized;

    // Verify habit exists
    const habit = await this.getById(data.habitId);
    if (!habit) {
      throw new Error(`Cannot record completion: habit with id '${data.habitId}' does not exist`);
    }

    const id = data.id ?? generateUUID();
    const now = new Date().toISOString();

    try {
      await db.runAsync(
        `INSERT INTO habit_completions (id, habit_id, completed_date, completed_at, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        id,
        data.habitId,
        data.completedDate,
        data.completedAt,
        data.notes ?? null,
        now
      );
    } catch (err: any) {
      // Check for unique constraint violation (habit_id, completed_date)
      if (err?.message && /unique constraint failed/i.test(err.message)) {
        throw new Error(
          `Habit '${data.habitId}' is already completed for date '${data.completedDate}'`
        );
      }
      throw err;
    }

    const row = await db.getFirstAsync<HabitCompletionRow>(
      `SELECT * FROM habit_completions WHERE id = ?;`,
      id
    );
    if (!row) {
      throw new Error(`Failed to retrieve newly created completion record '${id}'`);
    }
    return mapCompletionRow(row);
  }

  async removeCompletion(habitId: string, completedDate: string): Promise<boolean> {
    if (!habitId || !completedDate) {
      return false;
    }
    const db = await this.getDb();
    const result = await db.runAsync(
      `DELETE FROM habit_completions WHERE habit_id = ? AND completed_date = ?;`,
      habitId.trim(),
      completedDate.trim()
    );
    return result.changes > 0;
  }

  async getCompletions(
    habitId: string,
    startDate?: string,
    endDate?: string
  ): Promise<HabitCompletion[]> {
    if (!habitId) {
      return [];
    }
    const db = await this.getDb();
    let sql = `SELECT * FROM habit_completions WHERE habit_id = ?`;
    const params: unknown[] = [habitId.trim()];

    if (startDate && endDate) {
      sql += ` AND completed_date >= ? AND completed_date <= ?`;
      params.push(startDate.trim(), endDate.trim());
    } else if (startDate) {
      sql += ` AND completed_date >= ?`;
      params.push(startDate.trim());
    } else if (endDate) {
      sql += ` AND completed_date <= ?`;
      params.push(endDate.trim());
    }

    sql += ` ORDER BY completed_date ASC;`;

    const rows = await db.getAllAsync<HabitCompletionRow>(sql, ...params);
    return rows.map(mapCompletionRow);
  }

  async getCompletionsForDate(completedDate: string): Promise<HabitCompletion[]> {
    if (!completedDate) {
      return [];
    }
    const db = await this.getDb();
    const rows = await db.getAllAsync<HabitCompletionRow>(
      `SELECT * FROM habit_completions WHERE completed_date = ? ORDER BY completed_at ASC;`,
      completedDate.trim()
    );
    return rows.map(mapCompletionRow);
  }

  async isCompletedOnDate(habitId: string, completedDate: string): Promise<boolean> {
    if (!habitId || !completedDate) {
      return false;
    }
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ? LIMIT 1;`,
      habitId.trim(),
      completedDate.trim()
    );
    return row !== null;
  }
}
