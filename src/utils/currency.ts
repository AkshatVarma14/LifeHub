/**
 * Currency Utilities for LifeHub (INR).
 * All internal monetary calculations and storage use integer minor units (paise).
 * 1 Rupee = 100 Paise.
 * Uses exact string splitting and integer arithmetic to avoid IEEE-754 floating-point errors.
 */

// Maximum reasonable monetary boundary in paise: 100 Crore INR (10^11 paise)
// Well below Number.MAX_SAFE_INTEGER (9 * 10^15)
export const MAX_SAFE_PAISE = 100_000_000_000;

export interface CurrencyParseResult {
  success: boolean;
  paise: number;
  error?: string;
}

/**
 * Checks if a value is a valid, safe integer paise amount.
 */
export function isValidPaise(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/**
 * Parses a rupee input string or number into exact integer paise without floating-point math.
 * Accepts formats like: "100", "100.5", "100.50", "₹1,50,000.50", "0", "0.25".
 * Rejects negative values (use allowNegative option if needed), more than 2 decimal places,
 * non-numeric characters, and values exceeding MAX_SAFE_PAISE.
 */
export function tryParseRupeesToPaise(
  input: string | number,
  options?: { allowNegative?: boolean }
): CurrencyParseResult {
  if (input === null || input === undefined) {
    return { success: false, paise: 0, error: 'Input cannot be null or undefined' };
  }

  let str = typeof input === 'number' ? input.toString() : input.trim();

  if (str.length === 0) {
    return { success: false, paise: 0, error: 'Input cannot be empty' };
  }

  // Handle optional leading negative sign
  let isNegative = false;
  if (str.startsWith('-')) {
    if (!options?.allowNegative) {
      return { success: false, paise: 0, error: 'Negative amounts are not permitted' };
    }
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Strip currency prefixes: ₹, INR, Rs, Rs., and commas
  str = str.replace(/^(₹|INR|Rs\.?)\s*/i, '').replace(/,/g, '').trim();

  if (str.length === 0) {
    return { success: false, paise: 0, error: 'Amount cannot be empty' };
  }

  // Validate strict decimal format: digits with optional decimal point and up to 2 decimal digits
  if (!/^\d+(\.\d+)?$/.test(str)) {
    return { success: false, paise: 0, error: 'Invalid numeric format' };
  }

  const parts = str.split('.');
  if (parts.length > 2) {
    return { success: false, paise: 0, error: 'Multiple decimal points' };
  }

  const wholeStr = parts[0];
  const fracStr = parts[1] ?? '';

  // Reject more than two decimal digits (do not round silently)
  if (fracStr.length > 2) {
    return { success: false, paise: 0, error: 'Amount cannot have more than 2 decimal places' };
  }

  const whole = parseInt(wholeStr, 10);
  if (!Number.isSafeInteger(whole)) {
    return { success: false, paise: 0, error: 'Amount exceeds safe integer limit' };
  }

  // Pad fraction to exactly two digits: "5" -> "50", "" -> "00", "50" -> "50"
  const fraction = parseInt(fracStr.padEnd(2, '0'), 10);

  const totalPaise = whole * 100 + fraction;

  if (!Number.isSafeInteger(totalPaise) || totalPaise > MAX_SAFE_PAISE) {
    return { success: false, paise: 0, error: 'Amount exceeds maximum allowable threshold' };
  }

  const finalPaise = isNegative ? -totalPaise : totalPaise;
  return { success: true, paise: finalPaise };
}

/**
 * Parses a rupee input string or number into exact integer paise.
 * Throws an Error if the input is invalid.
 */
export function parseRupeesToPaise(
  input: string | number,
  options?: { allowNegative?: boolean }
): number {
  const result = tryParseRupeesToPaise(input, options);
  if (!result.success) {
    throw new Error(result.error ?? 'Invalid rupee amount');
  }
  return result.paise;
}

/**
 * Converts integer paise to a plain rupee decimal string (e.g. 15050 -> "150.50", 10000 -> "100.00").
 */
export function paiseToRupeesString(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw new Error('Paise amount must be a safe integer');
  }

  const isNegative = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const fracStr = fraction.toString().padStart(2, '0');

  return `${isNegative ? '-' : ''}${whole}.${fracStr}`;
}

/**
 * Formats integer paise into standard Indian Rupee notation (INR).
 * Follows the Indian numbering system: last 3 digits grouped, then groups of 2.
 * Examples:
 *   15000050 -> "₹1,50,000.50"
 *   -500000 -> "-₹5,000.00"
 *   0 -> "₹0.00"
 */
export function formatPaiseToINR(
  paise: number,
  options?: { showPaise?: boolean }
): string {
  if (!Number.isSafeInteger(paise)) {
    throw new Error('Paise amount must be a safe integer');
  }

  const isNegative = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;

  // Format whole rupees in Indian numbering system
  const wholeStr = whole.toString();
  let formattedWhole: string;

  if (wholeStr.length <= 3) {
    formattedWhole = wholeStr;
  } else {
    const lastThree = wholeStr.slice(-3);
    const remaining = wholeStr.slice(0, -3);
    const groups: string[] = [];
    let i = remaining.length;

    while (i > 0) {
      const start = Math.max(0, i - 2);
      groups.unshift(remaining.slice(start, i));
      i -= 2;
    }

    formattedWhole = `${groups.join(',')},${lastThree}`;
  }

  const showFraction = options?.showPaise ?? true;
  const fracStr = fraction.toString().padStart(2, '0');
  const formattedFraction = showFraction ? `.${fracStr}` : '';
  const sign = isNegative ? '-' : '';

  return `${sign}₹${formattedWhole}${formattedFraction}`;
}
