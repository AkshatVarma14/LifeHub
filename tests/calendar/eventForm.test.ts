import test from 'node:test';
import assert from 'node:assert';
import {
  getInitialEventFormData,
  validateAndMapEventForm,
  alignEndDateTime,
  type EventFormData,
} from '../../src/features/calendar/utils/eventForm.ts';
import type { CalendarEvent } from '../../src/types/calendar.ts';
import { getCurrentMonthString, getTodayDateString } from '../../src/utils/date.ts';

test('Event Form: getInitialEventFormData defaults for new event', () => {
  const currentMonth = getCurrentMonthString();
  const today = getTodayDateString();

  // 1. Viewing current month defaults date to today
  const currentMonthForm = getInitialEventFormData(null, currentMonth);
  assert.strictEqual(currentMonthForm.startDate, today);
  assert.strictEqual(currentMonthForm.startTime, '09:00');
  assert.strictEqual(currentMonthForm.hasEndTime, false);
  assert.strictEqual(currentMonthForm.category, 'Academic');
  assert.strictEqual(currentMonthForm.status, 'pending');
  assert.strictEqual(currentMonthForm.recurrence, 'none');
  assert.strictEqual(currentMonthForm.reminderMinutesBefore, null);
  assert.strictEqual(currentMonthForm.title, '');

  // 2. Viewing a different month defaults date to 1st of that month
  const differentMonthForm = getInitialEventFormData(null, '2026-12');
  assert.strictEqual(differentMonthForm.startDate, '2026-12-01');
  assert.strictEqual(differentMonthForm.endDate, '2026-12-01');
});

test('Event Form: getInitialEventFormData prepopulates from existing event', () => {
  const existing: CalendarEvent = {
    id: 'evt-123',
    title: 'Final Exam',
    startTime: '2026-10-15T09:30:00.000Z',
    endTime: '2026-10-15T11:30:00.000Z',
    category: 'Academic',
    location: 'Hall 101',
    notes: 'Bring calculator',
    recurrence: 'none',
    reminderMinutesBefore: 30,
    status: 'pending',
    source: 'manual',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  const form = getInitialEventFormData(existing);
  assert.strictEqual(form.title, 'Final Exam');
  assert.strictEqual(form.category, 'Academic');
  assert.strictEqual(form.hasEndTime, true);
  assert.strictEqual(form.location, 'Hall 101');
  assert.strictEqual(form.notes, 'Bring calculator');
  assert.strictEqual(form.reminderMinutesBefore, 30);
  assert.strictEqual(form.status, 'pending');

  // Verify start date matches local date key
  const d = new Date(existing.startTime);
  const expectedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.strictEqual(form.startDate, expectedDate);
});

test('Event Form: validateAndMapEventForm valid cases', () => {
  // 1. Valid event without end time
  const validNoEnd: EventFormData = {
    title: 'Doctor Appointment',
    category: 'Health',
    startDate: '2026-10-20',
    startTime: '14:30',
    hasEndTime: false,
    endDate: '2026-10-20',
    endTime: '15:30',
    location: 'Clinic 4',
    notes: 'Routine checkup',
    recurrence: 'none',
    reminderMinutesBefore: 15,
    status: 'pending',
  };

  const result1 = validateAndMapEventForm(validNoEnd);
  assert.strictEqual(result1.isValid, true);
  assert.ok(result1.sanitized !== undefined);
  assert.strictEqual(result1.sanitized.title, 'Doctor Appointment');
  assert.strictEqual(result1.sanitized.category, 'Health');
  assert.strictEqual(result1.sanitized.endTime, null);
  assert.strictEqual(result1.sanitized.reminderMinutesBefore, 15);
  assert.strictEqual(result1.sanitized.source, 'manual');

  // 2. Valid event with end time
  const validWithEnd: EventFormData = {
    ...validNoEnd,
    hasEndTime: true,
  };

  const result2 = validateAndMapEventForm(validWithEnd);
  assert.strictEqual(result2.isValid, true);
  assert.ok(result2.sanitized?.endTime !== null);
  assert.ok(result2.sanitized!.endTime! >= result2.sanitized!.startTime);
});

test('Event Form: validateAndMapEventForm rejection cases', () => {
  const baseValid: EventFormData = {
    title: 'Valid Title',
    category: 'Work',
    startDate: '2026-10-20',
    startTime: '10:00',
    hasEndTime: false,
    endDate: '2026-10-20',
    endTime: '11:00',
    location: '',
    notes: '',
    recurrence: 'none',
    reminderMinutesBefore: null,
    status: 'pending',
  };

  // 1. Empty title
  const emptyTitle = validateAndMapEventForm({ ...baseValid, title: '   ' });
  assert.strictEqual(emptyTitle.isValid, false);
  assert.match(emptyTitle.errors.join('; '), /title cannot be empty/i);

  // 2. Title too long (> 150 chars)
  const longTitle = validateAndMapEventForm({ ...baseValid, title: 'A'.repeat(151) });
  assert.strictEqual(longTitle.isValid, false);
  assert.match(longTitle.errors.join('; '), /cannot exceed 150 characters/i);

  // 3. Invalid start date
  const invalidDate = validateAndMapEventForm({ ...baseValid, startDate: '2026-02-31' });
  assert.strictEqual(invalidDate.isValid, false);
  assert.match(invalidDate.errors.join('; '), /valid calendar date/i);

  // 4. Invalid start time
  const invalidTime = validateAndMapEventForm({ ...baseValid, startTime: '25:00' });
  assert.strictEqual(invalidTime.isValid, false);
  assert.match(invalidTime.errors.join('; '), /24-hour format/i);

  // 5. End time earlier than start time
  const invertedTimes = validateAndMapEventForm({
    ...baseValid,
    hasEndTime: true,
    startDate: '2026-10-20',
    startTime: '14:00',
    endDate: '2026-10-20',
    endTime: '13:00',
  });
  assert.strictEqual(invertedTimes.isValid, false);
  assert.match(invertedTimes.errors.join('; '), /cannot be earlier than start time/i);

  // 6. Empty category
  const emptyCategory = validateAndMapEventForm({ ...baseValid, category: '  ' });
  assert.strictEqual(emptyCategory.isValid, false);
  assert.match(emptyCategory.errors.join('; '), /category cannot be empty/i);

  // 7. Invalid reminder minutes
  const badReminder = validateAndMapEventForm({ ...baseValid, reminderMinutesBefore: -5 });
  assert.strictEqual(badReminder.isValid, false);
  assert.match(badReminder.errors.join('; '), /integer between 0 and 43200/i);

  // 8. Non-integer reminder offset
  const floatReminder = validateAndMapEventForm({ ...baseValid, reminderMinutesBefore: 15.5 });
  assert.strictEqual(floatReminder.isValid, false);
  assert.match(floatReminder.errors.join('; '), /integer between 0 and 43200/i);

  // 9. Location too long (> 255 chars)
  const longLocation = validateAndMapEventForm({ ...baseValid, location: 'X'.repeat(256) });
  assert.strictEqual(longLocation.isValid, false);
  assert.match(longLocation.errors.join('; '), /Location cannot exceed 255 characters/i);

  // 10. Notes too long (> 2000 chars)
  const longNotes = validateAndMapEventForm({ ...baseValid, notes: 'Y'.repeat(2001) });
  assert.strictEqual(longNotes.isValid, false);
  assert.match(longNotes.errors.join('; '), /Notes cannot exceed 2000 characters/i);
});

test('Event Form: validateAndMapEventForm sanitizes optional fields and preserves recurrence', () => {
  const formWithWhitespace: EventFormData = {
    title: '  Lecture on AI  ',
    category: '  Academic  ',
    startDate: '2026-10-25',
    startTime: '10:00',
    hasEndTime: true,
    endDate: '2026-10-25',
    endTime: '11:30',
    location: '   ',
    notes: '   ',
    recurrence: 'weekly',
    reminderMinutesBefore: 0,
    status: 'completed',
  };

  const result = validateAndMapEventForm(formWithWhitespace);
  assert.strictEqual(result.isValid, true);
  assert.ok(result.sanitized !== undefined);
  assert.strictEqual(result.sanitized.title, 'Lecture on AI');
  assert.strictEqual(result.sanitized.category, 'Academic');
  assert.strictEqual(result.sanitized.location, null);
  assert.strictEqual(result.sanitized.notes, null);
  assert.strictEqual(result.sanitized.recurrence, 'weekly');
  assert.strictEqual(result.sanitized.reminderMinutesBefore, 0);
  assert.strictEqual(result.sanitized.status, 'completed');
});

test('Event Form: alignEndDateTime auto-aligns, rolls over midnight, and preserves valid end times', () => {
  // 1. Afternoon start time where existing end time is earlier (e.g. default was 10:00, start changed to 15:00)
  const afternoon = alignEndDateTime('2026-10-15', '15:00', '2026-10-15', '10:00');
  assert.strictEqual(afternoon.endDate, '2026-10-15');
  assert.strictEqual(afternoon.endTime, '16:00');

  // 2. Midnight rollover (start 23:30 + 1 hour -> next day 00:30)
  const midnight = alignEndDateTime('2026-10-15', '23:30', '2026-10-15', '10:00');
  assert.strictEqual(midnight.endDate, '2026-10-16');
  assert.strictEqual(midnight.endTime, '00:30');

  // 3. Month & Year rollover (Dec 31 at 23:15 + 1 hour -> Jan 1 next year at 00:15)
  const yearRollover = alignEndDateTime('2026-12-31', '23:15');
  assert.strictEqual(yearRollover.endDate, '2027-01-01');
  assert.strictEqual(yearRollover.endTime, '00:15');

  // 4. Leap year rollover (Feb 29 at 23:45 + 1 hour -> Mar 1 at 00:45)
  const leapRollover = alignEndDateTime('2024-02-29', '23:45');
  assert.strictEqual(leapRollover.endDate, '2024-03-01');
  assert.strictEqual(leapRollover.endTime, '00:45');

  // 5. Preserves existing valid end date and time that is >= start date and time
  const preserved = alignEndDateTime('2026-10-15', '09:00', '2026-10-15', '12:00');
  assert.strictEqual(preserved.endDate, '2026-10-15');
  assert.strictEqual(preserved.endTime, '12:00');

  // 6. Custom duration preset (e.g. +30 minutes)
  const custom30 = alignEndDateTime('2026-10-15', '10:00', undefined, undefined, 30);
  assert.strictEqual(custom30.endDate, '2026-10-15');
  assert.strictEqual(custom30.endTime, '10:30');

  // 7. Custom duration preset across midnight (+120 minutes from 22:30)
  const custom120 = alignEndDateTime('2026-10-15', '22:30', undefined, undefined, 120);
  assert.strictEqual(custom120.endDate, '2026-10-16');
  assert.strictEqual(custom120.endTime, '00:30');
});


