/**
 * Calendar Event Form State Mapping and Validation Utilities for LifeHub.
 * Stage 1 Slice 5C: Calendar Event Creation and Editing (FR-07).
 * Pure deterministic mapping and validation between form inputs and domain models.
 */

import type {
  CalendarEvent,
  EventStatus,
  EventRecurrence,
  DefaultCalendarCategory,
} from '../../../types/calendar.ts';
import { DEFAULT_CALENDAR_CATEGORIES } from '../../../types/calendar.ts';
import {
  type EventInput,
  type ValidationResult,
  validateEventInput,
  MAX_REMINDER_MINUTES,
} from '../validation.ts';
import {
  isValidDateString,
  getCurrentMonthString,
  getTodayDateString,
  formatLocalDateKey,
} from '../../../utils/date.ts';

export interface EventFormData {
  title: string;
  category: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  hasEndTime: boolean;
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  location: string;
  notes: string;
  recurrence: EventRecurrence;
  reminderMinutesBefore: number | null;
  status: EventStatus;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Returns initial form data for creating a new calendar event or editing an existing one.
 */
export function getInitialEventFormData(
  existing?: CalendarEvent | null,
  selectedMonth?: string
): EventFormData {
  if (existing) {
    const startD = new Date(existing.startTime);
    const startDate = formatLocalDateKey(existing.startTime);
    const startHours = String(startD.getHours()).padStart(2, '0');
    const startMins = String(startD.getMinutes()).padStart(2, '0');
    const startTime = `${startHours}:${startMins}`;

    let hasEndTime = false;
    let endDate = startDate;
    let endTime = '10:00';

    if (existing.endTime) {
      hasEndTime = true;
      const endD = new Date(existing.endTime);
      endDate = formatLocalDateKey(existing.endTime);
      const endHours = String(endD.getHours()).padStart(2, '0');
      const endMins = String(endD.getMinutes()).padStart(2, '0');
      endTime = `${endHours}:${endMins}`;
    }

    return {
      title: existing.title,
      category: existing.category,
      startDate,
      startTime,
      hasEndTime,
      endDate,
      endTime,
      location: existing.location ?? '',
      notes: existing.notes ?? '',
      recurrence: existing.recurrence,
      reminderMinutesBefore: existing.reminderMinutesBefore,
      status: existing.status,
    };
  }

  // Default date for new event:
  // If viewing current month, default to today; otherwise 1st of selectedMonth.
  const currentMonth = getCurrentMonthString();
  let defaultDate = getTodayDateString();
  if (selectedMonth && selectedMonth !== currentMonth) {
    const candidate = `${selectedMonth}-01`;
    if (isValidDateString(candidate)) {
      defaultDate = candidate;
    }
  }

  return {
    title: '',
    category: DEFAULT_CALENDAR_CATEGORIES[0],
    startDate: defaultDate,
    startTime: '09:00',
    hasEndTime: false,
    endDate: defaultDate,
    endTime: '10:00',
    location: '',
    notes: '',
    recurrence: 'none',
    reminderMinutesBefore: null,
    status: 'pending',
  };
}

/**
 * Validates and maps form data to a domain EventInput.
 *
 * Rules:
 * - Title is required (1-150 characters after trim).
 * - Start date must be a valid calendar date (YYYY-MM-DD).
 * - Start time must be a valid 24h time string (HH:mm).
 * - Combines local date and time into local wall-clock Date, then converts to canonical UTC ISO string.
 * - If hasEndTime is true:
 *   - End date must be a valid calendar date.
 *   - End time must be a valid 24h time string.
 *   - End time must not be earlier than start time.
 * - Category is required (1-50 characters).
 * - Location is optional (max 255 characters).
 * - Notes is optional (max 2000 characters).
 * - Recurrence must be a valid EventRecurrence.
 * - Reminder offset must be an integer between 0 and 43200 (or null).
 * - Status must be a valid EventStatus.
 */
export function validateAndMapEventForm(
  formData: EventFormData
): ValidationResult<EventInput> {
  const errors: string[] = [];

  if (!formData || typeof formData !== 'object') {
    return { isValid: false, errors: ['Form data must be an object'] };
  }

  // 1. Title validation
  const title = typeof formData.title === 'string' ? formData.title.trim() : '';
  if (title.length === 0) {
    errors.push('Event title cannot be empty');
  } else if (title.length > 150) {
    errors.push('Event title cannot exceed 150 characters');
  }

  // 2. Start Date validation
  const startDateStr = typeof formData.startDate === 'string' ? formData.startDate.trim() : '';
  if (!isValidDateString(startDateStr)) {
    errors.push('Start date must be a valid calendar date in YYYY-MM-DD format');
  }

  // 3. Start Time validation
  const startTimeStr = typeof formData.startTime === 'string' ? formData.startTime.trim() : '';
  if (!TIME_REGEX.test(startTimeStr)) {
    errors.push('Start time must be in HH:mm 24-hour format (e.g. 09:30 or 14:00)');
  }

  let startUtcIso = '';
  if (isValidDateString(startDateStr) && TIME_REGEX.test(startTimeStr)) {
    const [year, month, day] = startDateStr.split('-').map(Number);
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const localStartDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    if (isNaN(localStartDate.getTime())) {
      errors.push('Invalid start date/time');
    } else {
      startUtcIso = localStartDate.toISOString();
    }
  }

  // 4. End Date & Time validation (if hasEndTime is true)
  let endUtcIso: string | null = null;
  if (formData.hasEndTime) {
    const endDateStr = typeof formData.endDate === 'string' ? formData.endDate.trim() : '';
    if (!isValidDateString(endDateStr)) {
      errors.push('End date must be a valid calendar date in YYYY-MM-DD format');
    }

    const endTimeStr = typeof formData.endTime === 'string' ? formData.endTime.trim() : '';
    if (!TIME_REGEX.test(endTimeStr)) {
      errors.push('End time must be in HH:mm 24-hour format (e.g. 10:30 or 15:00)');
    }

    if (isValidDateString(endDateStr) && TIME_REGEX.test(endTimeStr)) {
      const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);
      const [eHours, eMinutes] = endTimeStr.split(':').map(Number);
      const localEndDate = new Date(eYear, eMonth - 1, eDay, eHours, eMinutes, 0, 0);
      if (isNaN(localEndDate.getTime())) {
        errors.push('Invalid end date/time');
      } else {
        endUtcIso = localEndDate.toISOString();
        if (startUtcIso && endUtcIso < startUtcIso) {
          errors.push('Event end time cannot be earlier than start time');
        }
      }
    }
  }

  // 5. Category validation
  const category = typeof formData.category === 'string' ? formData.category.trim() : '';
  if (category.length === 0) {
    errors.push('Event category cannot be empty');
  } else if (category.length > 50) {
    errors.push('Event category cannot exceed 50 characters');
  }

  // 6. Location validation
  const rawLoc = typeof formData.location === 'string' ? formData.location.trim() : '';
  let location: string | null = null;
  if (rawLoc.length > 255) {
    errors.push('Location cannot exceed 255 characters');
  } else {
    location = rawLoc.length > 0 ? rawLoc : null;
  }

  // 7. Notes validation
  const rawNotes = typeof formData.notes === 'string' ? formData.notes.trim() : '';
  let notes: string | null = null;
  if (rawNotes.length > 2000) {
    errors.push('Notes cannot exceed 2000 characters');
  } else {
    notes = rawNotes.length > 0 ? rawNotes : null;
  }

  // 8. Reminder validation
  let reminderMinutesBefore: number | null = null;
  if (formData.reminderMinutesBefore !== undefined && formData.reminderMinutesBefore !== null) {
    const offset = formData.reminderMinutesBefore;
    if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0 || offset > MAX_REMINDER_MINUTES) {
      errors.push(`Reminder offset must be an integer between 0 and ${MAX_REMINDER_MINUTES} minutes (or null)`);
    } else {
      reminderMinutesBefore = offset;
    }
  }

  if (errors.length > 0 || !startUtcIso) {
    return { isValid: false, errors };
  }

  const candidateInput: EventInput = {
    title,
    startTime: startUtcIso,
    endTime: endUtcIso,
    category,
    location,
    notes,
    recurrence: formData.recurrence,
    reminderMinutesBefore,
    status: formData.status,
    source: 'manual',
  };

  // Run candidate through domain validateEventInput to ensure canonical normalization
  return validateEventInput(candidateInput);
}
