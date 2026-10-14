import test from 'node:test';
import assert from 'node:assert';
import {
  isLeapYear,
  getDaysInMonth,
  isValidDateString,
  isValidMonthString,
  extractMonthFromDate,
  getCurrentMonthString,
  getTodayDateString,
  getPreviousMonthString,
  getNextMonthString,
  formatMonthDisplay,
  formatDateDisplay,
  normalizeToUtcIso,
  getUtcMonthRange,
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

test('Date Utilities: getCurrentMonthString format and custom date', () => {
  const customDate = new Date(2026, 9, 12); // October 2026 (month index 9)
  assert.strictEqual(getCurrentMonthString(customDate), '2026-10');

  const janDate = new Date(2025, 0, 1); // January 2025
  assert.strictEqual(getCurrentMonthString(janDate), '2025-01');

  // Default calls with new Date() must match YYYY-MM regex
  assert.match(getCurrentMonthString(), /^\d{4}-\d{2}$/);
});

test('Date Utilities: getTodayDateString format and custom date', () => {
  const customDate = new Date(2026, 9, 12); // October 12, 2026
  assert.strictEqual(getTodayDateString(customDate), '2026-10-12');

  const janDate = new Date(2025, 0, 5); // January 5, 2025
  assert.strictEqual(getTodayDateString(janDate), '2025-01-05');

  // Default calls with new Date() must match valid ISO date regex
  assert.match(getTodayDateString(), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(isValidDateString(getTodayDateString()));
});


test('Date Utilities: getPreviousMonthString and getNextMonthString stepping and boundaries', () => {
  // Regular month transition
  assert.strictEqual(getPreviousMonthString('2026-10'), '2026-09');
  assert.strictEqual(getNextMonthString('2026-10'), '2026-11');

  // Year boundary transitions
  assert.strictEqual(getPreviousMonthString('2026-01'), '2025-12');
  assert.strictEqual(getNextMonthString('2026-12'), '2027-01');

  // Input validation
  assert.throws(() => getPreviousMonthString('invalid-month'), /Invalid month string/i);
  assert.throws(() => getNextMonthString('invalid-month'), /Invalid month string/i);
});

test('Date Utilities: formatMonthDisplay and formatDateDisplay readable formats', () => {
  assert.strictEqual(formatMonthDisplay('2026-10'), 'October 2026');
  assert.strictEqual(formatMonthDisplay('2025-01'), 'January 2025');
  assert.strictEqual(formatMonthDisplay('2026-12'), 'December 2026');
  assert.throws(() => formatMonthDisplay('2026-13'), /Invalid month string/i);

  assert.strictEqual(formatDateDisplay('2026-10-12'), '12 Oct 2026');
  assert.strictEqual(formatDateDisplay('2024-02-29'), '29 Feb 2024');
  assert.strictEqual(formatDateDisplay('2025-01-01'), '1 Jan 2025');
  assert.throws(() => formatDateDisplay('2026-02-30'), /Invalid date string/i);
});

test('Date Utilities: normalizeToUtcIso canonical parsing and offset normalization', () => {
  // Standard UTC inputs
  assert.strictEqual(
    normalizeToUtcIso('2026-10-15T09:30:00.000Z'),
    '2026-10-15T09:30:00.000Z'
  );
  assert.strictEqual(
    normalizeToUtcIso('2026-10-15T09:30:00Z'),
    '2026-10-15T09:30:00.000Z'
  );

  // Positive offset (+05:30)
  assert.strictEqual(
    normalizeToUtcIso('2026-10-15T15:00:00+05:30'),
    '2026-10-15T09:30:00.000Z'
  );

  // Negative offset (-04:00)
  assert.strictEqual(
    normalizeToUtcIso('2026-10-15T05:30:00-04:00'),
    '2026-10-15T09:30:00.000Z'
  );

  // Whitespace trimming
  assert.strictEqual(
    normalizeToUtcIso('  2026-10-15T09:30:00.000Z  '),
    '2026-10-15T09:30:00.000Z'
  );

  // Rejections: empty and non-string
  assert.throws(() => normalizeToUtcIso(''), /non-empty string/i);
  assert.throws(() => normalizeToUtcIso('   '), /non-empty string/i);
  assert.throws(() => normalizeToUtcIso('invalid-date'), /Invalid.*date-time/i);
  assert.throws(() => normalizeToUtcIso('1850-01-01T00:00:00Z'), /outside allowable bounds/i);
  assert.throws(() => normalizeToUtcIso('2150-01-01T00:00:00Z'), /outside allowable bounds/i);

  // Calendar dates: rejection of impossible days (prevents silent JS Date rollovers)
  assert.throws(() => normalizeToUtcIso('2026-02-31T00:00:00.000Z'), /Invalid calendar day '31' for month '2'/i);
  assert.throws(() => normalizeToUtcIso('2025-02-29T12:00:00Z'), /Invalid calendar day '29' for month '2'/i); // Non-leap year
  assert.throws(() => normalizeToUtcIso('2026-04-31T12:00:00Z'), /Invalid calendar day '31' for month '4'/i); // April has 30 days
  assert.throws(() => normalizeToUtcIso('2026-06-31T12:00:00Z'), /Invalid calendar day '31' for month '6'/i); // June has 30 days

  // Valid leap days accepted
  assert.strictEqual(normalizeToUtcIso('2024-02-29T12:00:00.000Z'), '2024-02-29T12:00:00.000Z');
  assert.strictEqual(normalizeToUtcIso('2000-02-29T00:00:00Z'), '2000-02-29T00:00:00.000Z');

  // Century boundary non-leap years rejected
  assert.throws(() => normalizeToUtcIso('1900-02-29T00:00:00Z'), /Invalid calendar day '29' for month '2'/i);
  assert.throws(() => normalizeToUtcIso('2100-02-29T00:00:00Z'), /Invalid calendar day '29' for month '2'/i);

  // Out of range hours, minutes, seconds rejected
  assert.throws(() => normalizeToUtcIso('2026-10-15T24:00:00Z'), /Invalid hour '24'/i);
  assert.throws(() => normalizeToUtcIso('2026-10-15T25:00:00Z'), /Invalid hour '25'/i);
  assert.throws(() => normalizeToUtcIso('2026-10-15T12:60:00Z'), /Invalid minute '60'/i);
  assert.throws(() => normalizeToUtcIso('2026-10-15T12:00:60Z'), /Invalid second '60'/i);

  // Invalid timezone offsets rejected
  assert.throws(() => normalizeToUtcIso('2026-10-15T10:00:00+05:99'), /Invalid timezone offset/i);
  assert.throws(() => normalizeToUtcIso('2026-10-15T10:00:00+25:00'), /Invalid timezone offset/i);

  // Missing timezone designator rejected (ambiguous local time)
  assert.throws(() => normalizeToUtcIso('2026-10-15T10:00:00'), /Invalid.*date-time format/i);
  assert.throws(() => normalizeToUtcIso('2026-10-15 10:00:00'), /Invalid.*date-time format/i);

  // Non-ISO formats rejected
  assert.throws(() => normalizeToUtcIso('October 15, 2026'), /Invalid.*date-time format/i);
  assert.throws(() => normalizeToUtcIso('2026/10/15 10:00:00Z'), /Invalid.*date-time format/i);
});

test('Date Utilities: getUtcMonthRange deterministic half-open UTC bounds', () => {
  // Standard month
  const oct = getUtcMonthRange('2026-10');
  assert.strictEqual(oct.startInclusiveUtc, '2026-10-01T00:00:00.000Z');
  assert.strictEqual(oct.endExclusiveUtc, '2026-11-01T00:00:00.000Z');

  // Year boundary (December -> January next year)
  const dec = getUtcMonthRange('2026-12');
  assert.strictEqual(dec.startInclusiveUtc, '2026-12-01T00:00:00.000Z');
  assert.strictEqual(dec.endExclusiveUtc, '2027-01-01T00:00:00.000Z');

  // Leap-year February (2024)
  const leapFeb = getUtcMonthRange('2024-02');
  assert.strictEqual(leapFeb.startInclusiveUtc, '2024-02-01T00:00:00.000Z');
  assert.strictEqual(leapFeb.endExclusiveUtc, '2024-03-01T00:00:00.000Z');

  // Non-leap year February (2025)
  const nonLeapFeb = getUtcMonthRange('2025-02');
  assert.strictEqual(nonLeapFeb.startInclusiveUtc, '2025-02-01T00:00:00.000Z');
  assert.strictEqual(nonLeapFeb.endExclusiveUtc, '2025-03-01T00:00:00.000Z');

  // Invalid month inputs
  assert.throws(() => getUtcMonthRange('invalid-month'), /Invalid month string/i);
  assert.throws(() => getUtcMonthRange('2026-13'), /Invalid month string/i);
  assert.throws(() => getUtcMonthRange(''), /Invalid month string/i);
});


