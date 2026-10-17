/**
 * SQLite Timer Repository for LifeHub.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08, FR-09).
 * Manages persisted stopwatch and countdown sessions with timestamp tracking.
 */

import type { TimerSession } from '../../../types/habits.ts';
import {
  type TimerSessionInput,
  type UpdateTimerInput,
  validateTimerSessionInput,
  validateUpdateTimerInput,
} from '../validation.ts';
import {
  type SqliteExecutor,
  type TimerRepository,
  type TimerSessionRow,
  mapTimerSessionRow,
} from './types.ts';
import { generateUUID } from '../../../utils/id.ts';
import { normalizeToUtcIso } from '../../../utils/date.ts';

export class SqliteTimerRepository implements TimerRepository {
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

  async createSession(input: TimerSessionInput): Promise<TimerSession> {
    const validation = validateTimerSessionInput(input);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Timer session validation failed: ${validation.errors.join('; ')}`);
    }

    const data = validation.sanitized;

    // Layer 1 (pre-check): reject if another session is already active (running or paused)
    if (data.status === 'running' || data.status === 'paused') {
      const active = await this.getActiveSession();
      if (active) {
        throw new Error(
          `An active timer session is already in progress (session id: '${active.id}', status: '${active.status}')`
        );
      }
    }

    const db = await this.getDb();
    const id = data.id ?? generateUUID();
    const now = new Date().toISOString();

    try {
      await db.runAsync(
        `INSERT INTO timer_sessions (
          id, habit_id, type, status, started_at, target_duration_seconds,
          accumulated_seconds, current_segment_started_at, ended_at, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        id,
        data.habitId ?? null,
        data.type,
        data.status,
        data.startedAt,
        data.targetDurationSeconds ?? null,
        data.accumulatedSeconds,
        data.currentSegmentStartedAt ?? null,
        data.endedAt ?? null,
        data.notes ?? null,
        now,
        now
      );
    } catch (err: any) {
      // Layer 2 (database): catch unique constraint from idx_timer_sessions_single_active
      if (
        err?.message?.includes('idx_timer_sessions_single_active') ||
        err?.message?.includes('UNIQUE constraint failed')
      ) {
        throw new Error('An active timer session is already in progress');
      }
      throw err;
    }

    const created = await this.getSessionById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created timer session with id '${id}'`);
    }
    return created;
  }

  async getSessionById(id: string): Promise<TimerSession | null> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      return null;
    }
    const db = await this.getDb();
    const row = await db.getFirstAsync<TimerSessionRow>(
      `SELECT * FROM timer_sessions WHERE id = ?;`,
      id.trim()
    );
    return row ? mapTimerSessionRow(row) : null;
  }

  async getActiveSession(): Promise<TimerSession | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<TimerSessionRow>(
      `SELECT * FROM timer_sessions
       WHERE status IN ('running', 'paused')
       ORDER BY started_at DESC
       LIMIT 1;`
    );
    return row ? mapTimerSessionRow(row) : null;
  }

  async updateSession(id: string, updates: UpdateTimerInput): Promise<TimerSession> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Session ID must be a non-empty string');
    }

    const db = await this.getDb();
    const existing = await this.getSessionById(id);
    if (!existing) {
      throw new Error(`Timer session with id '${id}' not found`);
    }

    const validation = validateUpdateTimerInput(updates, existing);
    if (!validation.isValid || !validation.sanitized) {
      throw new Error(`Timer session update validation failed: ${validation.errors.join('; ')}`);
    }

    const sanitized = validation.sanitized;
    const targetStatus = sanitized.status ?? existing.status;

    // Layer 1 (pre-check): if transitioning to running or paused, check if another active session exists
    if (targetStatus === 'running' || targetStatus === 'paused') {
      const active = await this.getActiveSession();
      if (active && active.id !== existing.id) {
        throw new Error(
          `An active timer session is already in progress (session id: '${active.id}', status: '${active.status}')`
        );
      }
    }

    const now = new Date().toISOString();
    const newStatus = targetStatus;
    const newAccumulated = sanitized.accumulatedSeconds !== undefined
      ? sanitized.accumulatedSeconds
      : existing.accumulatedSeconds;

    const newCurrentSegment = sanitized.currentSegmentStartedAt !== undefined
      ? sanitized.currentSegmentStartedAt
      : existing.currentSegmentStartedAt;

    const newEndedAt = sanitized.endedAt !== undefined
      ? sanitized.endedAt
      : existing.endedAt;

    const newNotes = sanitized.notes !== undefined ? sanitized.notes : existing.notes;

    try {
      await db.runAsync(
        `UPDATE timer_sessions
         SET status = ?, accumulated_seconds = ?, current_segment_started_at = ?,
             ended_at = ?, notes = ?, updated_at = ?
         WHERE id = ?;`,
        newStatus,
        newAccumulated,
        newCurrentSegment,
        newEndedAt,
        newNotes,
        now,
        id.trim()
      );
    } catch (err: any) {
      // Layer 2 (database): catch unique constraint from idx_timer_sessions_single_active
      if (
        err?.message?.includes('idx_timer_sessions_single_active') ||
        err?.message?.includes('UNIQUE constraint failed')
      ) {
        throw new Error('An active timer session is already in progress');
      }
      throw err;
    }

    const updated = await this.getSessionById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated timer session '${id}'`);
    }
    return updated;
  }

  async listSessions(habitId?: string | null, limit = 50): Promise<TimerSession[]> {
    const db = await this.getDb();
    let sql = `SELECT * FROM timer_sessions`;
    const params: unknown[] = [];

    if (habitId) {
      sql += ` WHERE habit_id = ?`;
      params.push(habitId.trim());
    }

    sql += ` ORDER BY started_at DESC LIMIT ?;`;
    params.push(limit);

    const rows = await db.getAllAsync<TimerSessionRow>(sql, ...params);
    return rows.map(mapTimerSessionRow);
  }

  async deleteSession(id: string): Promise<boolean> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      return false;
    }
    const db = await this.getDb();
    const result = await db.runAsync(
      `DELETE FROM timer_sessions WHERE id = ?;`,
      id.trim()
    );
    return result.changes > 0;
  }
}
