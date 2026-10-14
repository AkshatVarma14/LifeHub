/**
 * Repository Types, Database Row Models, and Mappers for LifeHub Calendar.
 * Stage 1: Calendar Persistence & Domain Foundation (FR-07).
 */

import type {
  CalendarEvent,
  EventStatus,
  EventRecurrence,
  EventSource,
} from '../../../types/calendar.ts';
import type { EventInput } from '../validation.ts';
import type { SqliteExecutor } from '../../finance/repositories/types.ts';

export type { SqliteExecutor };

/**
 * Database row representation for `events` table.
 */
export interface EventRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  category: string;
  location: string | null;
  notes: string | null;
  recurrence: string;
  reminder_minutes_before: number | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * Maps a SQLite events row to the strongly-typed CalendarEvent domain entity.
 */
export function mapEventRow(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    category: row.category,
    location: row.location,
    notes: row.notes,
    recurrence: row.recurrence as EventRecurrence,
    reminderMinutesBefore: row.reminder_minutes_before,
    status: row.status as EventStatus,
    source: row.source as EventSource,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface EventRepository {
  create(input: EventInput): Promise<CalendarEvent>;
  getById(id: string): Promise<CalendarEvent | null>;
  /**
   * Retrieves events where start_time falls within the half-open interval:
   * start_time >= normalizeToUtcIso(startInclusiveUtc) AND start_time < normalizeToUtcIso(endExclusiveUtc)
   *
   * Note: Multi-day spanning events that began prior to startInclusiveUtc are
   * excluded even if their duration overlaps the interval.
   */
  getByDateRange(startInclusiveUtc: string, endExclusiveUtc: string): Promise<CalendarEvent[]>;
  /**
   * Retrieves events where start_time falls within the half-open UTC calendar month:
   * [YYYY-MM-01T00:00:00.000Z, YYYY-(MM+1)-01T00:00:00.000Z)
   *
   * Note: Multi-day spanning events that began prior to the month are excluded
   * even if their duration overlaps the month.
   */
  getByMonth(month: string): Promise<CalendarEvent[]>;
  update(id: string, input: EventInput): Promise<CalendarEvent>;
  delete(id: string): Promise<boolean>;
  updateStatus(id: string, status: EventStatus): Promise<CalendarEvent>;
  listAll(): Promise<CalendarEvent[]>;
}
