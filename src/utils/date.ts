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
