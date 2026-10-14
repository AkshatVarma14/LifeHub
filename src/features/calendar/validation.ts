/**
 * Calendar Event Validation Rules for LifeHub.
 * Stage 1: Calendar Persistence & Domain Foundation (FR-07).
 * Pure deterministic validation functions for calendar events.
 */

import type {
  EventStatus,
  EventRecurrence,
  EventSource,
} from '../../types/calendar.ts';
import { normalizeToUtcIso } from '../../utils/date.ts';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  sanitized?: T;
}

export interface EventInput {
  id?: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  category: string;
  location?: string | null;
  notes?: string | null;
  recurrence?: EventRecurrence;
  reminderMinutesBefore?: number | null;
  status?: EventStatus;
  source?: EventSource;
}

const VALID_STATUSES: readonly EventStatus[] = ['pending', 'completed', 'cancelled'];
const VALID_RECURRENCES: readonly EventRecurrence[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
const VALID_SOURCES: readonly EventSource[] = ['manual', 'email', 'system'];
export const MAX_REMINDER_MINUTES = 43200; // 30 days in minutes

export function validateEventInput(input: unknown): ValidationResult<EventInput> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Event input must be an object'] };
  }

  const raw = input as Partial<EventInput>;

  // 1. Title validation (1-150 chars after trim)
  let sanitizedTitle = '';
  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    errors.push('Event title cannot be empty');
  } else if (raw.title.trim().length > 150) {
    errors.push('Event title cannot exceed 150 characters');
  } else {
    sanitizedTitle = raw.title.trim();
  }

  // 2. Start Time validation and normalization to canonical UTC ISO
  let sanitizedStartTime = '';
  if (typeof raw.startTime !== 'string' || raw.startTime.trim().length === 0) {
    errors.push('Event start time is required');
  } else {
    try {
      sanitizedStartTime = normalizeToUtcIso(raw.startTime);
    } catch (err: any) {
      errors.push(`Invalid start time: ${err.message}`);
    }
  }

  // 3. End Time validation and normalization (optional, must be >= startTime)
  let sanitizedEndTime: string | null = null;
  if (raw.endTime !== undefined && raw.endTime !== null) {
    if (typeof raw.endTime !== 'string' || raw.endTime.trim().length === 0) {
      sanitizedEndTime = null;
    } else {
      try {
        sanitizedEndTime = normalizeToUtcIso(raw.endTime);
        if (sanitizedStartTime && sanitizedEndTime < sanitizedStartTime) {
          errors.push('Event end time cannot be earlier than start time');
        }
      } catch (err: any) {
        errors.push(`Invalid end time: ${err.message}`);
      }
    }
  }

  // 4. Category validation (1-50 chars after trim)
  let sanitizedCategory = '';
  if (typeof raw.category !== 'string' || raw.category.trim().length === 0) {
    errors.push('Event category cannot be empty');
  } else if (raw.category.trim().length > 50) {
    errors.push('Event category cannot exceed 50 characters');
  } else {
    sanitizedCategory = raw.category.trim();
  }

  // 5. Location validation (optional, max 255 chars, trim, empty -> null)
  let sanitizedLocation: string | null = null;
  if (raw.location !== undefined && raw.location !== null) {
    if (typeof raw.location !== 'string') {
      errors.push('Location must be a string or null');
    } else {
      const trimmed = raw.location.trim();
      if (trimmed.length > 255) {
        errors.push('Location cannot exceed 255 characters');
      } else {
        sanitizedLocation = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  // 6. Notes validation (optional, max 2000 chars, trim, empty -> null)
  let sanitizedNotes: string | null = null;
  if (raw.notes !== undefined && raw.notes !== null) {
    if (typeof raw.notes !== 'string') {
      errors.push('Notes must be a string or null');
    } else {
      const trimmed = raw.notes.trim();
      if (trimmed.length > 2000) {
        errors.push('Notes cannot exceed 2000 characters');
      } else {
        sanitizedNotes = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  // 7. Recurrence validation (default: 'none')
  let sanitizedRecurrence: EventRecurrence = 'none';
  if (raw.recurrence !== undefined && raw.recurrence !== null) {
    if (!VALID_RECURRENCES.includes(raw.recurrence as EventRecurrence)) {
      errors.push(
        `Invalid recurrence '${raw.recurrence}'. Allowed values: ${VALID_RECURRENCES.join(', ')}`
      );
    } else {
      sanitizedRecurrence = raw.recurrence as EventRecurrence;
    }
  }

  // 8. Reminder offset validation (optional, non-negative integer <= 43200)
  let sanitizedReminderMinutes: number | null = null;
  if (raw.reminderMinutesBefore !== undefined && raw.reminderMinutesBefore !== null) {
    const offset = raw.reminderMinutesBefore;
    if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0 || offset > MAX_REMINDER_MINUTES) {
      errors.push(
        `Reminder offset must be an integer between 0 and ${MAX_REMINDER_MINUTES} minutes (or null)`
      );
    } else {
      sanitizedReminderMinutes = offset;
    }
  }

  // 9. Status validation (default: 'pending')
  let sanitizedStatus: EventStatus = 'pending';
  if (raw.status !== undefined && raw.status !== null) {
    if (!VALID_STATUSES.includes(raw.status as EventStatus)) {
      errors.push(
        `Invalid status '${raw.status}'. Allowed values: ${VALID_STATUSES.join(', ')}`
      );
    } else {
      sanitizedStatus = raw.status as EventStatus;
    }
  }

  // 10. Source validation (default: 'manual')
  let sanitizedSource: EventSource = 'manual';
  if (raw.source !== undefined && raw.source !== null) {
    if (!VALID_SOURCES.includes(raw.source as EventSource)) {
      errors.push(
        `Invalid source '${raw.source}'. Allowed values: ${VALID_SOURCES.join(', ')}`
      );
    } else {
      sanitizedSource = raw.source as EventSource;
    }
  }

  // 11. Optional ID validation
  let sanitizedId: string | undefined = undefined;
  if (raw.id !== undefined && raw.id !== null) {
    if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
      errors.push('Event ID must be a non-empty string');
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
      title: sanitizedTitle,
      startTime: sanitizedStartTime,
      endTime: sanitizedEndTime,
      category: sanitizedCategory,
      location: sanitizedLocation,
      notes: sanitizedNotes,
      recurrence: sanitizedRecurrence,
      reminderMinutesBefore: sanitizedReminderMinutes,
      status: sanitizedStatus,
      source: sanitizedSource,
    },
  };
}
