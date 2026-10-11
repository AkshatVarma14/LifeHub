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

