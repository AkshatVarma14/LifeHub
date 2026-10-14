/**
 * Date and Calendar Validation Utilities for LifeHub.
 * Stage 1: Finance vertical slice.
 * Strict calendar date validation (leap years, month days, YYYY-MM-DD, YYYY-MM).
 * Future-dated transactions are explicitly allowed.
 */

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Determines whether a given year is a leap year.
 * Gregorian leap year rule: divisible by 4, except end of century unless divisible by 400.
 */
export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year)) {
    return false;
  }
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the number of days in a given month (1-12) for a given year.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return DAYS_IN_MONTH[month - 1] ?? 0;
}

/**
 * Validates whether a string is a valid ISO calendar date (YYYY-MM-DD).
 * Checks syntax, real calendar days per month, and leap year correctness.
 * Future dates are allowed.
 */
export function isValidDateString(dateStr: string): boolean {
  if (typeof dateStr !== 'string') {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    return false;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    return false;
  }

  return true;
}

/**
 * Validates whether a string is a valid year-month string (YYYY-MM).
 */
export function isValidMonthString(monthStr: string): boolean {
  if (typeof monthStr !== 'string') {
    return false;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(monthStr.trim());
  if (!match) {
    return false;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  if (year < 1900 || year > 2100) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  return true;
}

/**
 * Extracts the YYYY-MM prefix from a valid YYYY-MM-DD date string.
 */
export function extractMonthFromDate(dateStr: string): string {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Cannot extract month from invalid date: ${dateStr}`);
  }
  return dateStr.slice(0, 7);
}

/**
 * Returns the year and month as a YYYY-MM string for a given date (defaults to current local date).
 */
export function getCurrentMonthString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns the current date as a YYYY-MM-DD string for a given date (defaults to current local date).
 */
export function getTodayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Returns the YYYY-MM string of the preceding calendar month.
 * Handles year boundary transitions (e.g. 2026-01 -> 2025-12).
 */
export function getPreviousMonthString(monthStr: string): string {
  if (!isValidMonthString(monthStr)) {
    throw new Error(`Invalid month string '${monthStr}'. Expected YYYY-MM.`);
  }
  const [yearStr, monthNumStr] = monthStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthNumStr, 10);

  if (month === 1) {
    year -= 1;
    month = 12;
  } else {
    month -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Returns the YYYY-MM string of the subsequent calendar month.
 * Handles year boundary transitions (e.g. 2026-12 -> 2027-01).
 */
export function getNextMonthString(monthStr: string): string {
  if (!isValidMonthString(monthStr)) {
    throw new Error(`Invalid month string '${monthStr}'. Expected YYYY-MM.`);
  }
  const [yearStr, monthNumStr] = monthStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthNumStr, 10);

  if (month === 12) {
    year += 1;
    month = 1;
  } else {
    month += 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Formats a YYYY-MM month string for human display (e.g. '2026-10' -> 'October 2026').
 */
export function formatMonthDisplay(monthStr: string): string {
  if (!isValidMonthString(monthStr)) {
    throw new Error(`Invalid month string '${monthStr}'. Expected YYYY-MM.`);
  }
  const [yearStr, monthNumStr] = monthStr.split('-');
  const monthIndex = parseInt(monthNumStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIndex] ?? '';
  return `${monthName} ${yearStr}`;
}

/**
 * Formats a YYYY-MM-DD date string for readable display (e.g. '2026-10-12' -> '12 Oct 2026').
 */
export function formatDateDisplay(dateStr: string): string {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string '${dateStr}'. Expected YYYY-MM-DD.`);
  }
  const [yearStr, monthNumStr, dayStr] = dateStr.split('-');
  const monthIndex = parseInt(monthNumStr, 10) - 1;
  const monthShort = MONTH_NAMES_SHORT[monthIndex] ?? '';
  const day = parseInt(dayStr, 10);
  return `${day} ${monthShort} ${yearStr}`;
}

const ISO_DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}(?::?\d{2})?)$/i;

/**
 * Normalizes any valid ISO-8601 date-time string with explicit timezone designator into a canonical UTC ISO-8601 string.
 * Format: YYYY-MM-DDTHH:mm:ss.sssZ (24 characters, millisecond precision, ending in 'Z').
 * Rejects non-strings, malformed calendar dates (e.g. Feb 31, leap day in non-leap year), out-of-range hours/minutes,
 * invalid timezone offsets, missing timezone designators, and years outside 1900-2100.
 */
export function normalizeToUtcIso(dateTimeInput: string): string {
  if (typeof dateTimeInput !== 'string' || dateTimeInput.trim().length === 0) {
    throw new Error('Date-time input must be a non-empty string');
  }

  const trimmed = dateTimeInput.trim();
  const match = ISO_DATETIME_REGEX.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid ISO-8601 date-time format '${dateTimeInput}'. Expected ISO-8601 with explicit timezone designator (e.g. 'YYYY-MM-DDTHH:mm:ss.sssZ' or offset)`
    );
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  const second = match[6] !== undefined ? parseInt(match[6], 10) : 0;
  const offset = match[8];

  if (year < 1900 || year > 2100) {
    throw new Error(`Date-time year '${year}' outside allowable bounds (1900-2100)`);
  }

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month '${month}'`);
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    throw new Error(
      `Invalid calendar day '${day}' for month '${month}' in year '${year}'`
    );
  }

  if (hour < 0 || hour > 23) {
    throw new Error(`Invalid hour '${hour}'. Must be between 0 and 23`);
  }

  if (minute < 0 || minute > 59) {
    throw new Error(`Invalid minute '${minute}'. Must be between 0 and 59`);
  }

  if (second < 0 || second > 59) {
    throw new Error(`Invalid second '${second}'. Must be between 0 and 59`);
  }

  let toParse = trimmed;
  if (/^[+-]\d{2}$/.test(offset)) {
    toParse = `${trimmed}:00`;
  } else if (/^[+-]\d{4}$/.test(offset)) {
    toParse = `${trimmed.slice(0, trimmed.length - 2)}:${trimmed.slice(trimmed.length - 2)}`;
  }

  if (offset.toUpperCase() !== 'Z') {
    const offMatch = /^([+-])(\d{2}):?(\d{2})?$/.exec(offset);
    if (offMatch) {
      const offH = parseInt(offMatch[2], 10);
      const offM = offMatch[3] !== undefined ? parseInt(offMatch[3], 10) : 0;
      if (offH > 14 || (offH === 14 && offM > 0) || offM > 59) {
        throw new Error(
          `Invalid timezone offset '${offset}'. Offset must be between -14:00 and +14:00`
        );
      }
    }
  }

  const date = new Date(toParse);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date-time string '${dateTimeInput}'`);
  }

  const utcYear = date.getUTCFullYear();
  if (utcYear < 1900 || utcYear > 2100) {
    throw new Error(`Date-time UTC year '${utcYear}' outside allowable bounds (1900-2100)`);
  }

  return date.toISOString();
}

/**
 * Returns deterministic half-open UTC bounds [startInclusiveUtc, endExclusiveUtc) for a UTC calendar month.
 * Month must be in valid YYYY-MM format.
 *
 * NOTE: Timezone-aware local calendar months are deferred until the UI slice, when a robust
 * implementation can be selected and tested without adding dependencies solely for this foundation slice.
 */
export function getUtcMonthRange(monthStr: string): { startInclusiveUtc: string; endExclusiveUtc: string } {
  if (!isValidMonthString(monthStr)) {
    throw new Error(`Invalid month string '${monthStr}'. Expected YYYY-MM.`);
  }

  const startInclusiveUtc = `${monthStr.trim()}-01T00:00:00.000Z`;
  const nextMonth = getNextMonthString(monthStr.trim());
  const endExclusiveUtc = `${nextMonth}-01T00:00:00.000Z`;

  return { startInclusiveUtc, endExclusiveUtc };
}


