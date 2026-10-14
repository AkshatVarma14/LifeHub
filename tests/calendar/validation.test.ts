import test from 'node:test';
import assert from 'node:assert';
import { validateEventInput } from '../../src/features/calendar/validation.ts';

test('Calendar Validation: Valid minimal and complete inputs', () => {
  // Minimal valid input (only required fields)
  const minResult = validateEventInput({
    title: 'Study Session',
    startTime: '2026-10-15T09:00:00.000Z',
    category: 'Academic',
  });

  assert.strictEqual(minResult.isValid, true);
  assert.strictEqual(minResult.errors.length, 0);
  assert.deepStrictEqual(minResult.sanitized, {
    id: undefined,
    title: 'Study Session',
    startTime: '2026-10-15T09:00:00.000Z',
    endTime: null,
    category: 'Academic',
    location: null,
    notes: null,
    recurrence: 'none',
    reminderMinutesBefore: null,
    status: 'pending',
    source: 'manual',
  });

  // Complete valid input
  const fullResult = validateEventInput({
    id: 'custom-id-123',
    title: '  Midterm Exam  ',
    startTime: '2026-10-20T10:00:00.000Z',
    endTime: '2026-10-20T12:00:00.000Z',
    category: '  Academic  ',
    location: '  Hall B  ',
    notes: '  Bring calculator  ',
    recurrence: 'monthly',
    reminderMinutesBefore: 60,
    status: 'pending',
    source: 'manual',
  });

  assert.strictEqual(fullResult.isValid, true);
  assert.strictEqual(fullResult.errors.length, 0);
  assert.strictEqual(fullResult.sanitized?.id, 'custom-id-123');
  assert.strictEqual(fullResult.sanitized?.title, 'Midterm Exam');
  assert.strictEqual(fullResult.sanitized?.location, 'Hall B');
  assert.strictEqual(fullResult.sanitized?.notes, 'Bring calculator');
  assert.strictEqual(fullResult.sanitized?.recurrence, 'monthly');
  assert.strictEqual(fullResult.sanitized?.reminderMinutesBefore, 60);
});

test('Calendar Validation: Timestamp offset normalization and chronological enforcement', () => {
  // Positive offset normalization (+05:30)
  const offsetResult = validateEventInput({
    title: 'Doctor Appointment',
    startTime: '2026-10-15T15:00:00+05:30',
    endTime: '2026-10-15T16:00:00+05:30',
    category: 'Health',
  });

  assert.strictEqual(offsetResult.isValid, true);
  assert.strictEqual(offsetResult.sanitized?.startTime, '2026-10-15T09:30:00.000Z');
  assert.strictEqual(offsetResult.sanitized?.endTime, '2026-10-15T10:30:00.000Z');

  // Equal startTime and endTime (zero-duration event) is valid
  const instantResult = validateEventInput({
    title: 'Reminder Bell',
    startTime: '2026-10-15T09:00:00.000Z',
    endTime: '2026-10-15T09:00:00.000Z',
    category: 'Personal',
  });
  assert.strictEqual(instantResult.isValid, true);

  // End time earlier than start time must be rejected
  const invertedResult = validateEventInput({
    title: 'Time Traveler Meeting',
    startTime: '2026-10-15T10:00:00.000Z',
    endTime: '2026-10-15T09:00:00.000Z',
    category: 'Work',
  });
  assert.strictEqual(invertedResult.isValid, false);
  assert.ok(invertedResult.errors.some((e) => e.includes('end time cannot be earlier than start time')));

  // Malformed date strings
  const badDateResult = validateEventInput({
    title: 'Bad Date',
    startTime: 'not-a-date',
    category: 'Other',
  });
  assert.strictEqual(badDateResult.isValid, false);
  assert.ok(badDateResult.errors.some((e) => e.includes('Invalid start time')));
});

test('Calendar Validation: Title and Category boundaries', () => {
  // Empty and whitespace titles
  assert.strictEqual(validateEventInput({ title: '', startTime: '2026-10-15T09:00:00Z', category: 'Work' }).isValid, false);
  assert.strictEqual(validateEventInput({ title: '   ', startTime: '2026-10-15T09:00:00Z', category: 'Work' }).isValid, false);

  // Title max length (150 chars)
  const ok150 = 'a'.repeat(150);
  assert.strictEqual(validateEventInput({ title: ok150, startTime: '2026-10-15T09:00:00Z', category: 'Work' }).isValid, true);
  const tooLong151 = 'a'.repeat(151);
  assert.strictEqual(validateEventInput({ title: tooLong151, startTime: '2026-10-15T09:00:00Z', category: 'Work' }).isValid, false);

  // Empty and whitespace categories
  assert.strictEqual(validateEventInput({ title: 'Event', startTime: '2026-10-15T09:00:00Z', category: '' }).isValid, false);
  assert.strictEqual(validateEventInput({ title: 'Event', startTime: '2026-10-15T09:00:00Z', category: '   ' }).isValid, false);

  // Category max length (50 chars)
  const okCat50 = 'c'.repeat(50);
  assert.strictEqual(validateEventInput({ title: 'Event', startTime: '2026-10-15T09:00:00Z', category: okCat50 }).isValid, true);
  const tooLongCat51 = 'c'.repeat(51);
  assert.strictEqual(validateEventInput({ title: 'Event', startTime: '2026-10-15T09:00:00Z', category: tooLongCat51 }).isValid, false);
});

test('Calendar Validation: Location, Notes, and Reminder Offset sanitization', () => {
  // Whitespace-only location and notes convert to null
  const resEmptyFields = validateEventInput({
    title: 'Clean Event',
    startTime: '2026-10-15T09:00:00Z',
    category: 'Work',
    location: '   ',
    notes: '   ',
  });
  assert.strictEqual(resEmptyFields.isValid, true);
  assert.strictEqual(resEmptyFields.sanitized?.location, null);
  assert.strictEqual(resEmptyFields.sanitized?.notes, null);

  // Location max length (255 chars)
  assert.strictEqual(validateEventInput({
    title: 'Event',
    startTime: '2026-10-15T09:00:00Z',
    category: 'Work',
    location: 'L'.repeat(256),
  }).isValid, false);

  // Notes max length (2000 chars)
  assert.strictEqual(validateEventInput({
    title: 'Event',
    startTime: '2026-10-15T09:00:00Z',
    category: 'Work',
    notes: 'N'.repeat(2001),
  }).isValid, false);

  // Reminder minutes boundaries
  // 0 is valid (at time of event)
  assert.strictEqual(validateEventInput({
    title: 'Event',
    startTime: '2026-10-15T09:00:00Z',
    category: 'Work',
    reminderMinutesBefore: 0,
  }).isValid, true);

  // 43200 is valid (30 days)
  assert.strictEqual(validateEventInput({
    title: 'Event',
    startTime: '2026-10-15T09:00:00Z',
    category: 'Work',
    reminderMinutesBefore: 43200,
  }).isValid, true);

  // Negative offset rejected
  assert.strictEqual(validateEventInput({
    title: 'Event',
    startTime: '2026-10-15T09:00:00Z',
    category: 'Work',
    reminderMinutesBefore: -1,
  }).isValid, false);

  // Non-integer offset rejected
  assert.strictEqual(validateEventInput({
    title: 'Event',
    startTime: '2026-10-15T09:00:00Z',
    category: 'Work',
    reminderMinutesBefore: 15.5,
  }).isValid, false);

  // Offset > 43200 rejected
  assert.strictEqual(validateEventInput({
    title: 'Event',
    startTime: '2026-10-15T09:00:00Z',
    category: 'Work',
    reminderMinutesBefore: 43201,
  }).isValid, false);
});

test('Calendar Validation: Enums for recurrence, status, and source', () => {
  // Recurrence enum checks
  assert.strictEqual(validateEventInput({ title: 'Evt', startTime: '2026-10-15T09:00:00Z', category: 'Work', recurrence: 'daily' }).isValid, true);
  assert.strictEqual(validateEventInput({ title: 'Evt', startTime: '2026-10-15T09:00:00Z', category: 'Work', recurrence: 'biweekly' as any }).isValid, false);

  // Status enum checks
  assert.strictEqual(validateEventInput({ title: 'Evt', startTime: '2026-10-15T09:00:00Z', category: 'Work', status: 'completed' }).isValid, true);
  assert.strictEqual(validateEventInput({ title: 'Evt', startTime: '2026-10-15T09:00:00Z', category: 'Work', status: 'finished' as any }).isValid, false);

  // Source enum checks
  assert.strictEqual(validateEventInput({ title: 'Evt', startTime: '2026-10-15T09:00:00Z', category: 'Work', source: 'manual' }).isValid, true);
  assert.strictEqual(validateEventInput({ title: 'Evt', startTime: '2026-10-15T09:00:00Z', category: 'Work', source: 'external' as any }).isValid, false);

  // Non-object input check
  assert.strictEqual(validateEventInput(null).isValid, false);
  assert.strictEqual(validateEventInput('string').isValid, false);
});
