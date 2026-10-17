/**
 * Validation Rules for Habits and Focus Timers.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08, FR-09).
 * Pure deterministic validation functions.
 */

import type { TimerType, TimerStatus, TimerSession } from '../../types/habits.ts';
import { isValidDateString, normalizeToUtcIso } from '../../utils/date.ts';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  sanitized?: T;
}

export interface HabitInput {
  id?: string;
  name: string;
  description?: string | null;
  isArchived?: boolean;
}

export interface CompletionInput {
  id?: string;
  habitId: string;
  completedDate: string; // YYYY-MM-DD
  completedAt?: string; // Canonical UTC ISO
  notes?: string | null;
}

export interface TimerSessionInput {
  id?: string;
  habitId?: string | null;
  type: TimerType;
  status?: TimerStatus;
  startedAt?: string;
  targetDurationSeconds?: number | null;
  accumulatedSeconds?: number;
  currentSegmentStartedAt?: string | null;
  endedAt?: string | null;
  notes?: string | null;
}

export interface UpdateTimerInput {
  status?: TimerStatus;
  accumulatedSeconds?: number;
  currentSegmentStartedAt?: string | null;
  endedAt?: string | null;
  notes?: string | null;
}

const VALID_TIMER_TYPES: readonly TimerType[] = ['stopwatch', 'countdown'];
const VALID_TIMER_STATUSES: readonly TimerStatus[] = ['running', 'paused', 'completed', 'cancelled'];
export const MAX_COUNTDOWN_SECONDS = 86400; // 24 hours

export function validateHabitInput(input: unknown): ValidationResult<HabitInput> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Habit input must be an object'] };
  }

  const raw = input as Partial<HabitInput>;

  // 1. Name validation (1-100 characters after trim)
  let sanitizedName = '';
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('Habit name cannot be empty');
  } else if (raw.name.trim().length > 100) {
    errors.push('Habit name cannot exceed 100 characters');
  } else {
    sanitizedName = raw.name.trim();
  }

  // 2. Description validation (optional, max 500 characters)
  let sanitizedDescription: string | null = null;
  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== 'string') {
      errors.push('Description must be a string or null');
    } else {
      const trimmed = raw.description.trim();
      if (trimmed.length > 500) {
        errors.push('Description cannot exceed 500 characters');
      } else {
        sanitizedDescription = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  // 3. isArchived validation (optional boolean, default false)
  let sanitizedIsArchived = false;
  if (raw.isArchived !== undefined && raw.isArchived !== null) {
    if (typeof raw.isArchived !== 'boolean') {
      errors.push('isArchived must be a boolean');
    } else {
      sanitizedIsArchived = raw.isArchived;
    }
  }

  // 4. Optional ID validation
  let sanitizedId: string | undefined = undefined;
  if (raw.id !== undefined && raw.id !== null) {
    if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
      errors.push('Habit ID must be a non-empty string');
    } else {
      sanitizedId = raw.id.trim();
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      id: sanitizedId,
      name: sanitizedName,
      description: sanitizedDescription,
      isArchived: sanitizedIsArchived,
    },
  };
}

export function validateCompletionInput(input: unknown): ValidationResult<CompletionInput> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Completion input must be an object'] };
  }

  const raw = input as Partial<CompletionInput>;

  // 1. Habit ID validation
  let sanitizedHabitId = '';
  if (typeof raw.habitId !== 'string' || raw.habitId.trim().length === 0) {
    errors.push('Habit ID is required and must be a non-empty string');
  } else {
    sanitizedHabitId = raw.habitId.trim();
  }

  // 2. Completed Date validation (YYYY-MM-DD)
  let sanitizedCompletedDate = '';
  if (typeof raw.completedDate !== 'string' || raw.completedDate.trim().length === 0) {
    errors.push('Completed date is required');
  } else if (!isValidDateString(raw.completedDate.trim())) {
    errors.push(`Invalid completed date '${raw.completedDate}'. Expected YYYY-MM-DD.`);
  } else {
    sanitizedCompletedDate = raw.completedDate.trim();
  }

  // 3. Completed At timestamp validation (defaults to now UTC)
  let sanitizedCompletedAt = new Date().toISOString();
  if (raw.completedAt !== undefined && raw.completedAt !== null) {
    if (typeof raw.completedAt !== 'string' || raw.completedAt.trim().length === 0) {
      errors.push('Completed at must be a non-empty string if provided');
    } else {
      try {
        sanitizedCompletedAt = normalizeToUtcIso(raw.completedAt);
      } catch (err: any) {
        errors.push(`Invalid completedAt timestamp: ${err.message}`);
      }
    }
  }

  // 4. Notes validation (optional, max 500 characters)
  let sanitizedNotes: string | null = null;
  if (raw.notes !== undefined && raw.notes !== null) {
    if (typeof raw.notes !== 'string') {
      errors.push('Notes must be a string or null');
    } else {
      const trimmed = raw.notes.trim();
      if (trimmed.length > 500) {
        errors.push('Notes cannot exceed 500 characters');
      } else {
        sanitizedNotes = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  // 5. Optional ID validation
  let sanitizedId: string | undefined = undefined;
  if (raw.id !== undefined && raw.id !== null) {
    if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
      errors.push('Completion ID must be a non-empty string');
    } else {
      sanitizedId = raw.id.trim();
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      id: sanitizedId,
      habitId: sanitizedHabitId,
      completedDate: sanitizedCompletedDate,
      completedAt: sanitizedCompletedAt,
      notes: sanitizedNotes,
    },
  };
}

export function validateTimerSessionInput(input: unknown): ValidationResult<TimerSessionInput> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Timer session input must be an object'] };
  }

  const raw = input as Partial<TimerSessionInput>;

  // 1. Type validation ('stopwatch' | 'countdown')
  let sanitizedType: TimerType = 'stopwatch';
  if (!raw.type || !VALID_TIMER_TYPES.includes(raw.type as TimerType)) {
    errors.push(`Invalid timer type '${raw.type}'. Allowed values: ${VALID_TIMER_TYPES.join(', ')}`);
  } else {
    sanitizedType = raw.type as TimerType;
  }

  // 2. Status validation (default 'running')
  let sanitizedStatus: TimerStatus = 'running';
  if (raw.status !== undefined && raw.status !== null) {
    if (!VALID_TIMER_STATUSES.includes(raw.status as TimerStatus)) {
      errors.push(`Invalid timer status '${raw.status}'. Allowed values: ${VALID_TIMER_STATUSES.join(', ')}`);
    } else {
      sanitizedStatus = raw.status as TimerStatus;
    }
  }

  // 3. Started At validation (defaults to now UTC)
  let sanitizedStartedAt = new Date().toISOString();
  if (raw.startedAt !== undefined && raw.startedAt !== null) {
    if (typeof raw.startedAt !== 'string' || raw.startedAt.trim().length === 0) {
      errors.push('Started at must be a non-empty string');
    } else {
      try {
        sanitizedStartedAt = normalizeToUtcIso(raw.startedAt);
      } catch (err: any) {
        errors.push(`Invalid startedAt timestamp: ${err.message}`);
      }
    }
  }

  // 4. Target duration validation
  let sanitizedTargetDuration: number | null = null;
  if (sanitizedType === 'stopwatch') {
    if (raw.targetDurationSeconds !== undefined && raw.targetDurationSeconds !== null) {
      errors.push('Target duration must be null for stopwatch sessions');
    }
  } else {
    // countdown
    const target = raw.targetDurationSeconds;
    if (typeof target !== 'number' || !Number.isInteger(target) || target <= 0 || target > MAX_COUNTDOWN_SECONDS) {
      errors.push(`Countdown target duration must be an integer between 1 and ${MAX_COUNTDOWN_SECONDS} seconds`);
    } else {
      sanitizedTargetDuration = target;
    }
  }

  // 5. Accumulated seconds validation (integer >= 0, default 0)
  let sanitizedAccumulatedSeconds = 0;
  if (raw.accumulatedSeconds !== undefined && raw.accumulatedSeconds !== null) {
    if (
      typeof raw.accumulatedSeconds !== 'number' ||
      !Number.isInteger(raw.accumulatedSeconds) ||
      raw.accumulatedSeconds < 0
    ) {
      errors.push('Accumulated seconds must be a non-negative integer');
    } else {
      sanitizedAccumulatedSeconds = raw.accumulatedSeconds;
    }
  }

  // 6. Current segment started at validation
  let sanitizedCurrentSegmentStartedAt: string | null = null;
  if (raw.currentSegmentStartedAt !== undefined && raw.currentSegmentStartedAt !== null) {
    if (typeof raw.currentSegmentStartedAt !== 'string' || raw.currentSegmentStartedAt.trim().length === 0) {
      errors.push('currentSegmentStartedAt must be a valid timestamp string or null');
    } else {
      try {
        sanitizedCurrentSegmentStartedAt = normalizeToUtcIso(raw.currentSegmentStartedAt);
      } catch (err: any) {
        errors.push(`Invalid currentSegmentStartedAt timestamp: ${err.message}`);
      }
    }
  } else if (sanitizedStatus === 'running') {
    // By default, if running and no segment start passed, use startedAt
    sanitizedCurrentSegmentStartedAt = sanitizedStartedAt;
  }

  // 7. Ended at validation
  let sanitizedEndedAt: string | null = null;
  if (raw.endedAt !== undefined && raw.endedAt !== null) {
    if (typeof raw.endedAt !== 'string' || raw.endedAt.trim().length === 0) {
      errors.push('endedAt must be a valid timestamp string or null');
    } else {
      try {
        sanitizedEndedAt = normalizeToUtcIso(raw.endedAt);
      } catch (err: any) {
        errors.push(`Invalid endedAt timestamp: ${err.message}`);
      }
    }
  }

  // Chronological order validations
  if (sanitizedCurrentSegmentStartedAt && sanitizedCurrentSegmentStartedAt < sanitizedStartedAt) {
    errors.push('currentSegmentStartedAt cannot be earlier than startedAt');
  }
  if (sanitizedEndedAt && sanitizedEndedAt < sanitizedStartedAt) {
    errors.push('endedAt cannot be earlier than startedAt');
  }

  // Status and timestamp consistency invariants
  if (sanitizedStatus === 'running') {
    if (sanitizedEndedAt !== null) {
      errors.push('endedAt must be null when timer session is running');
    }
    if (sanitizedCurrentSegmentStartedAt === null) {
      errors.push('currentSegmentStartedAt cannot be null when timer session is running');
    }
  } else if (sanitizedStatus === 'paused') {
    if (sanitizedEndedAt !== null) {
      errors.push('endedAt must be null when timer session is paused');
    }
    if (sanitizedCurrentSegmentStartedAt !== null) {
      errors.push('currentSegmentStartedAt must be null when timer session is paused');
    }
  } else if (sanitizedStatus === 'completed' || sanitizedStatus === 'cancelled') {
    if (sanitizedCurrentSegmentStartedAt !== null) {
      errors.push(`currentSegmentStartedAt must be null when timer session is ${sanitizedStatus}`);
    }
    if (sanitizedEndedAt === null) {
      errors.push(`endedAt must be set when timer session is ${sanitizedStatus}`);
    }
  }

  // 8. Habit ID validation (optional reference)
  let sanitizedHabitId: string | null = null;
  if (raw.habitId !== undefined && raw.habitId !== null) {
    if (typeof raw.habitId !== 'string' || raw.habitId.trim().length === 0) {
      errors.push('Habit ID must be a non-empty string or null');
    } else {
      sanitizedHabitId = raw.habitId.trim();
    }
  }

  // 9. Notes validation (optional, max 500 characters)
  let sanitizedNotes: string | null = null;
  if (raw.notes !== undefined && raw.notes !== null) {
    if (typeof raw.notes !== 'string') {
      errors.push('Notes must be a string or null');
    } else {
      const trimmed = raw.notes.trim();
      if (trimmed.length > 500) {
        errors.push('Notes cannot exceed 500 characters');
      } else {
        sanitizedNotes = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  // 10. Optional ID validation
  let sanitizedId: string | undefined = undefined;
  if (raw.id !== undefined && raw.id !== null) {
    if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
      errors.push('Session ID must be a non-empty string');
    } else {
      sanitizedId = raw.id.trim();
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      id: sanitizedId,
      habitId: sanitizedHabitId,
      type: sanitizedType,
      status: sanitizedStatus,
      startedAt: sanitizedStartedAt,
      targetDurationSeconds: sanitizedTargetDuration,
      accumulatedSeconds: sanitizedAccumulatedSeconds,
      currentSegmentStartedAt: sanitizedCurrentSegmentStartedAt,
      endedAt: sanitizedEndedAt,
      notes: sanitizedNotes,
    },
  };
}

/**
 * Validates updates to an existing TimerSession.
 * Enforces timer domain invariants:
 * - Terminal states ('completed', 'cancelled') cannot be transitioned or modified.
 * - accumulatedSeconds must be non-negative integer.
 * - Countdown accumulatedSeconds cannot exceed target duration upon completion.
 * - endedAt and currentSegmentStartedAt cannot precede startedAt.
 * - Status and timestamp relationships are preserved (running has active segment; paused/completed have null active segment).
 */
export function validateUpdateTimerInput(
  updates: unknown,
  existing: TimerSession
): ValidationResult<UpdateTimerInput> {
  const errors: string[] = [];

  if (!updates || typeof updates !== 'object') {
    return { isValid: false, errors: ['Update payload must be an object'] };
  }

  const raw = updates as Partial<UpdateTimerInput>;

  // 1. Terminal state check: completed or cancelled sessions cannot be transitioned or mutated
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    if (raw.status !== undefined && raw.status !== existing.status) {
      errors.push(
        `Cannot transition timer session from terminal status '${existing.status}' to '${raw.status}'`
      );
    }
    if (raw.accumulatedSeconds !== undefined && raw.accumulatedSeconds !== existing.accumulatedSeconds) {
      errors.push(`Cannot modify accumulatedSeconds on terminal session '${existing.status}'`);
    }
    if (raw.currentSegmentStartedAt !== undefined && raw.currentSegmentStartedAt !== null) {
      errors.push(`Cannot set currentSegmentStartedAt on terminal session '${existing.status}'`);
    }
    if (raw.endedAt !== undefined && raw.endedAt !== existing.endedAt) {
      errors.push(`Cannot modify endedAt on terminal session '${existing.status}'`);
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }
  }

  // 2. Status validation (if provided)
  let sanitizedStatus: TimerStatus | undefined = undefined;
  if (raw.status !== undefined && raw.status !== null) {
    if (!VALID_TIMER_STATUSES.includes(raw.status as TimerStatus)) {
      errors.push(`Invalid timer status '${raw.status}'. Allowed values: ${VALID_TIMER_STATUSES.join(', ')}`);
    } else {
      sanitizedStatus = raw.status as TimerStatus;
    }
  }

  const targetStatus = sanitizedStatus ?? existing.status;

  // 3. Accumulated seconds validation (if provided)
  let sanitizedAccumulatedSeconds: number | undefined = undefined;
  if (raw.accumulatedSeconds !== undefined && raw.accumulatedSeconds !== null) {
    if (
      typeof raw.accumulatedSeconds !== 'number' ||
      !Number.isInteger(raw.accumulatedSeconds) ||
      raw.accumulatedSeconds < 0
    ) {
      errors.push('Accumulated seconds must be a non-negative integer');
    } else {
      sanitizedAccumulatedSeconds = raw.accumulatedSeconds;
    }
  }

  // Countdown cap verification upon completion
  if (
    targetStatus === 'completed' &&
    existing.type === 'countdown' &&
    typeof existing.targetDurationSeconds === 'number'
  ) {
    const finalAccumulated =
      sanitizedAccumulatedSeconds !== undefined
        ? sanitizedAccumulatedSeconds
        : existing.accumulatedSeconds;
    if (finalAccumulated > existing.targetDurationSeconds) {
      errors.push(
        `Accumulated seconds (${finalAccumulated}s) cannot exceed countdown target duration (${existing.targetDurationSeconds}s) upon completion`
      );
    }
  }

  // 4. Current segment started at validation (if provided)
  let sanitizedCurrentSegmentStartedAt: string | null | undefined = undefined;
  if (raw.currentSegmentStartedAt !== undefined) {
    if (raw.currentSegmentStartedAt === null) {
      sanitizedCurrentSegmentStartedAt = null;
    } else if (typeof raw.currentSegmentStartedAt !== 'string' || raw.currentSegmentStartedAt.trim().length === 0) {
      errors.push('currentSegmentStartedAt must be a valid timestamp string or null');
    } else {
      try {
        sanitizedCurrentSegmentStartedAt = normalizeToUtcIso(raw.currentSegmentStartedAt);
        if (sanitizedCurrentSegmentStartedAt < existing.startedAt) {
          errors.push(
            `currentSegmentStartedAt '${sanitizedCurrentSegmentStartedAt}' cannot be earlier than session startedAt '${existing.startedAt}'`
          );
        }
      } catch (err: any) {
        errors.push(`Invalid currentSegmentStartedAt timestamp: ${err.message}`);
      }
    }
  }

  // 5. Ended at validation (if provided)
  let sanitizedEndedAt: string | null | undefined = undefined;
  if (raw.endedAt !== undefined) {
    if (raw.endedAt === null) {
      sanitizedEndedAt = null;
    } else if (typeof raw.endedAt !== 'string' || raw.endedAt.trim().length === 0) {
      errors.push('endedAt must be a valid timestamp string or null');
    } else {
      try {
        sanitizedEndedAt = normalizeToUtcIso(raw.endedAt);
        if (sanitizedEndedAt < existing.startedAt) {
          errors.push(
            `endedAt '${sanitizedEndedAt}' cannot be earlier than session startedAt '${existing.startedAt}'`
          );
        }
      } catch (err: any) {
        errors.push(`Invalid endedAt timestamp: ${err.message}`);
      }
    }
  }

  // 6. Notes validation (if provided)
  let sanitizedNotes: string | null | undefined = undefined;
  if (raw.notes !== undefined) {
    if (raw.notes === null) {
      sanitizedNotes = null;
    } else if (typeof raw.notes !== 'string') {
      errors.push('Notes must be a string or null');
    } else {
      const trimmed = raw.notes.trim();
      if (trimmed.length > 500) {
        errors.push('Notes cannot exceed 500 characters');
      } else {
        sanitizedNotes = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  // 7. Status and Timestamp state machine invariants
  const effectiveEndedAt =
    sanitizedEndedAt !== undefined ? sanitizedEndedAt : existing.endedAt;
  const effectiveCurrentSegment =
    sanitizedCurrentSegmentStartedAt !== undefined
      ? sanitizedCurrentSegmentStartedAt
      : existing.currentSegmentStartedAt;

  if (targetStatus === 'running') {
    if (effectiveEndedAt !== null) {
      errors.push('endedAt must be null when timer session is running');
    }
    if (effectiveCurrentSegment === null) {
      errors.push('currentSegmentStartedAt cannot be null when timer session is running');
    }
  } else if (targetStatus === 'paused') {
    if (effectiveEndedAt !== null) {
      errors.push('endedAt must be null when timer session is paused');
    }
    if (effectiveCurrentSegment !== null) {
      errors.push('currentSegmentStartedAt must be null when timer session is paused');
    }
  } else if (targetStatus === 'completed' || targetStatus === 'cancelled') {
    if (effectiveCurrentSegment !== null) {
      errors.push(`currentSegmentStartedAt must be null when timer session is ${targetStatus}`);
    }
    if (effectiveEndedAt === null) {
      errors.push(`endedAt must be set when timer session is ${targetStatus}`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      status: sanitizedStatus,
      accumulatedSeconds: sanitizedAccumulatedSeconds,
      currentSegmentStartedAt: sanitizedCurrentSegmentStartedAt,
      endedAt: sanitizedEndedAt,
      notes: sanitizedNotes,
    },
  };
}

