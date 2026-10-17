/**
 * Repository Types, Row Models, and Mappers for LifeHub Habits and Focus Timers.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08, FR-09).
 */

import type {
  Habit,
  HabitCompletion,
  TimerSession,
  TimerType,
  TimerStatus,
} from '../../../types/habits.ts';
import type {
  HabitInput,
  CompletionInput,
  TimerSessionInput,
  UpdateTimerInput,
} from '../validation.ts';
import type { SqliteExecutor } from '../../finance/repositories/types.ts';

export type { SqliteExecutor };

/**
 * SQLite row representation for `habits` table.
 */
export interface HabitRow {
  id: string;
  name: string;
  description: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

/**
 * SQLite row representation for `habit_completions` table.
 */
export interface HabitCompletionRow {
  id: string;
  habit_id: string;
  completed_date: string;
  completed_at: string;
  notes: string | null;
  created_at: string;
}

/**
 * SQLite row representation for `timer_sessions` table.
 */
export interface TimerSessionRow {
  id: string;
  habit_id: string | null;
  type: string;
  status: string;
  started_at: string;
  target_duration_seconds: number | null;
  accumulated_seconds: number;
  current_segment_started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maps SQLite habit row to domain Habit entity.
 */
export function mapHabitRow(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps SQLite habit completion row to domain HabitCompletion entity.
 */
export function mapCompletionRow(row: HabitCompletionRow): HabitCompletion {
  return {
    id: row.id,
    habitId: row.habit_id,
    completedDate: row.completed_date,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/**
 * Maps SQLite timer session row to domain TimerSession entity.
 */
export function mapTimerSessionRow(row: TimerSessionRow): TimerSession {
  return {
    id: row.id,
    habitId: row.habit_id,
    type: row.type as TimerType,
    status: row.status as TimerStatus,
    startedAt: row.started_at,
    targetDurationSeconds: row.target_duration_seconds,
    accumulatedSeconds: row.accumulated_seconds,
    currentSegmentStartedAt: row.current_segment_started_at,
    endedAt: row.ended_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface HabitRepository {
  create(input: HabitInput): Promise<Habit>;
  getById(id: string): Promise<Habit | null>;
  list(includeArchived?: boolean): Promise<Habit[]>;
  update(id: string, input: HabitInput): Promise<Habit>;
  archive(id: string): Promise<Habit>;
  unarchive(id: string): Promise<Habit>;
  delete(id: string): Promise<boolean>;

  recordCompletion(input: CompletionInput): Promise<HabitCompletion>;
  removeCompletion(habitId: string, completedDate: string): Promise<boolean>;
  getCompletions(habitId: string, startDate?: string, endDate?: string): Promise<HabitCompletion[]>;
  getCompletionsForDate(completedDate: string): Promise<HabitCompletion[]>;
  isCompletedOnDate(habitId: string, completedDate: string): Promise<boolean>;
}

export interface TimerRepository {
  createSession(input: TimerSessionInput): Promise<TimerSession>;
  getSessionById(id: string): Promise<TimerSession | null>;
  getActiveSession(): Promise<TimerSession | null>;
  updateSession(id: string, updates: UpdateTimerInput): Promise<TimerSession>;
  listSessions(habitId?: string | null, limit?: number): Promise<TimerSession[]>;
  deleteSession(id: string): Promise<boolean>;
}
