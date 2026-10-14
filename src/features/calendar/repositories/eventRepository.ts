/**
 * SQLite Event Repository for LifeHub Calendar.
 * Stage 1: Calendar Persistence & Domain Foundation (FR-07).
 * Enforces canonical UTC normalization, parameterized SQL, and half-open range queries.
 */

import type { CalendarEvent, EventStatus } from '../../../types/calendar.ts';
import {
  type EventInput,
  validateEventInput,
} from '../validation.ts';
import {
  type SqliteExecutor,
  type EventRepository,
  type EventRow,
  mapEventRow,
} from './types.ts';
import { generateUUID } from '../../../utils/id.ts';
import { getUtcMonthRange, normalizeToUtcIso } from '../../../utils/date.ts';

export class SqliteEventRepository implements EventRepository {
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

  async create(input: EventInput): Promise<CalendarEvent> {
    const validation = validateEventInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const data = validation.sanitized;
    const id = data.id ?? generateUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO events (
        id, title, start_time, end_time, category, location, notes,
        recurrence, reminder_minutes_before, status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      data.title,
      data.startTime,
      data.endTime ?? null,
      data.category,
      data.location ?? null,
      data.notes ?? null,
      data.recurrence ?? 'none',
      data.reminderMinutesBefore ?? null,
      data.status ?? 'pending',
      data.source ?? 'manual',
      now,
      now
    );

    const created = await this.getById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created event with id '${id}'`);
    }
    return created;
  }

  async getById(id: string): Promise<CalendarEvent | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<EventRow>(
      'SELECT * FROM events WHERE id = ?;',
      id
    );
    return row ? mapEventRow(row) : null;
  }

  async getByDateRange(
    startInclusiveUtc: string,
    endExclusiveUtc: string
  ): Promise<CalendarEvent[]> {
    const normStart = normalizeToUtcIso(startInclusiveUtc);
    const normEnd = normalizeToUtcIso(endExclusiveUtc);

    if (normStart > normEnd) {
      throw new Error(
        `Invalid range: startInclusiveUtc '${normStart}' cannot be after endExclusiveUtc '${normEnd}'`
      );
    }

    if (normStart === normEnd) {
      return [];
    }

    const db = await this.getDb();
    const rows = await db.getAllAsync<EventRow>(
      `SELECT * FROM events
       WHERE start_time >= ? AND start_time < ?
       ORDER BY start_time ASC, created_at ASC;`,
      normStart,
      normEnd
    );

    return rows.map(mapEventRow);
  }

  async getByMonth(month: string): Promise<CalendarEvent[]> {
    const { startInclusiveUtc, endExclusiveUtc } = getUtcMonthRange(month);
    return this.getByDateRange(startInclusiveUtc, endExclusiveUtc);
  }

  async update(id: string, input: EventInput): Promise<CalendarEvent> {
    const validation = validateEventInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const db = await this.getDb();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Event with id '${id}' not found`);
    }

    const data = validation.sanitized;
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE events
       SET title = ?, start_time = ?, end_time = ?, category = ?, location = ?, notes = ?,
           recurrence = ?, reminder_minutes_before = ?, status = ?, source = ?, updated_at = ?
       WHERE id = ?;`,
      data.title,
      data.startTime,
      data.endTime ?? null,
      data.category,
      data.location ?? null,
      data.notes ?? null,
      data.recurrence ?? 'none',
      data.reminderMinutesBefore ?? null,
      data.status ?? 'pending',
      data.source ?? 'manual',
      now,
      id
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated event with id '${id}'`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const db = await this.getDb();
    const result = await db.runAsync('DELETE FROM events WHERE id = ?;', id);
    return result.changes > 0;
  }

  async updateStatus(id: string, status: EventStatus): Promise<CalendarEvent> {
    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      throw new Error(`Invalid status '${status}'. Allowed values: pending, completed, cancelled`);
    }

    const db = await this.getDb();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Event with id '${id}' not found`);
    }

    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE events SET status = ?, updated_at = ? WHERE id = ?;',
      status,
      now,
      id
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated event with id '${id}'`);
    }
    return updated;
  }

  async listAll(): Promise<CalendarEvent[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<EventRow>(
      'SELECT * FROM events ORDER BY start_time ASC, created_at ASC;'
    );
    return rows.map(mapEventRow);
  }
}
