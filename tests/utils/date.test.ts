import test from 'node:test';
import assert from 'node:assert';
import {
  isLeapYear,
  getDaysInMonth,
  isValidDateString,
  isValidMonthString,
  extractMonthFromDate,
} from '../../src/utils/date.ts';

test('Date Utilities: isLeapYear rules', () => {
  // Typical leap years
  assert.strictEqual(isLeapYear(2024), true);
  assert.strictEqual(isLeapYear(2028), true);
  assert.strictEqual(isLeapYear(2020), true);

  // Non-leap years
  assert.strictEqual(isLeapYear(2025), false);
  assert.strictEqual(isLeapYear(2026), false);
  assert.strictEqual(isLeapYear(2023), false);

  // Century boundary rules
  assert.strictEqual(isLeapYear(1900), false); // Divisible by 100 but not 400
  assert.strictEqual(isLeapYear(2100), false);
  assert.strictEqual(isLeapYear(2000), true); // Divisible by 400
});

test('Date Utilities: getDaysInMonth correctness', () => {
  assert.strictEqual(getDaysInMonth(2024, 2), 29); // Leap Feb
  assert.strictEqual(getDaysInMonth(2025, 2), 28); // Normal Feb
  assert.strictEqual(getDaysInMonth(2026, 1), 31); // Jan
  assert.strictEqual(getDaysInMonth(2026, 4), 30); // Apr
  assert.strictEqual(getDaysInMonth(2026, 12), 31); // Dec
});

test('Date Utilities: isValidDateString calendar date boundaries', () => {
  // Valid standard dates
  assert.strictEqual(isValidDateString('2026-10-12'), true);
  assert.strictEqual(isValidDateString('2026-01-01'), true);
  assert.strictEqual(isValidDateString('2026-12-31'), true);

  // Leap day validity
  assert.strictEqual(isValidDateString('2024-02-29'), true); // Valid leap day
  assert.strictEqual(isValidDateString('2025-02-29'), false); // Invalid non-leap day

  // Day overflow for month
  assert.strictEqual(isValidDateString('2026-04-31'), false); // April has 30 days
  assert.strictEqual(isValidDateString('2026-06-31'), false); // June has 30 days
  assert.strictEqual(isValidDateString('2026-02-30'), false);

  // Month out of range
  assert.strictEqual(isValidDateString('2026-00-15'), false);
  assert.strictEqual(isValidDateString('2026-13-01'), false);

  // Day out of range
  assert.strictEqual(isValidDateString('2026-05-00'), false);
  assert.strictEqual(isValidDateString('2026-05-32'), false);

  // Future dates (explicitly allowed)
  assert.strictEqual(isValidDateString('2030-01-01'), true);
  assert.strictEqual(isValidDateString('2050-06-15'), true);

  // Invalid formats and strings
  assert.strictEqual(isValidDateString('2026/10/12'), false);
  assert.strictEqual(isValidDateString('12-10-2026'), false);
  assert.strictEqual(isValidDateString('invalid-date'), false);
  assert.strictEqual(isValidDateString(''), false);
});

test('Date Utilities: isValidMonthString validation', () => {
  assert.strictEqual(isValidMonthString('2026-10'), true);
  assert.strictEqual(isValidMonthString('2024-02'), true);
  assert.strictEqual(isValidMonthString('2030-12'), true);

  assert.strictEqual(isValidMonthString('2026-00'), false);
  assert.strictEqual(isValidMonthString('2026-13'), false);
  assert.strictEqual(isValidMonthString('2026'), false);
  assert.strictEqual(isValidMonthString('2026-10-12'), false);
});

test('Date Utilities: extractMonthFromDate extraction', () => {
  assert.strictEqual(extractMonthFromDate('2026-10-12'), '2026-10');
  assert.strictEqual(extractMonthFromDate('2024-02-29'), '2024-02');
  assert.throws(() => extractMonthFromDate('invalid-date'), /Cannot extract month/i);
});
