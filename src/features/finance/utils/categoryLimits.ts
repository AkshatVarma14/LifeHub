/**
 * Category Limits Utilities for LifeHub Finance.
 * Stage 1: Finance vertical slice.
 * Safe serialization, deserialization, and corruption detection for category limits.
 */

import type { ExpenseCategory } from '../../../types/finance.ts';
import { isExpenseCategory } from '../constants.ts';
import { isValidPaise } from '../../../utils/currency.ts';

/**
 * Category limits map. Category limits are optional per category.
 */
export type CategoryLimitsMap = Partial<Record<ExpenseCategory, number>>;

export interface ParsedCategoryLimits {
  /**
   * Valid parsed limits map. Contains only verified expense categories with positive integer paise.
   */
  limits: CategoryLimitsMap;

  /**
   * Indicates whether the input JSON was corrupted, invalid syntax, or contained invalid entries.
   */
  isCorrupt: boolean;

  /**
   * Keys that failed validation (e.g., unrecognized categories, non-integer or non-positive amounts).
   */
  corruptKeys: string[];

  /**
   * Diagnostic message if corruption occurred.
   */
  errorMessage: string | null;

  /**
   * The original raw JSON string preserved as-is.
   */
  rawJson: string | null;
}

/**
 * Safely parses a stored category_limits_json string.
 *
 * Guarantees:
 * - Does NOT crash on malformed JSON or unexpected non-object structures.
 * - Does NOT invent default limits or guess values for missing/corrupt keys.
 * - Preserves rawJson intact.
 * - Flags corruption explicitly so callers can warn the user or prompt re-saving.
 */
export function parseCategoryLimitsSafely(rawJson: string | null | undefined): ParsedCategoryLimits {
  if (rawJson === null || rawJson === undefined || rawJson.trim() === '') {
    return {
      limits: {},
      isCorrupt: false,
      corruptKeys: [],
      errorMessage: null,
      rawJson: rawJson ?? null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      limits: {},
      isCorrupt: true,
      corruptKeys: ['__syntax_error__'],
      errorMessage: 'Invalid JSON syntax in category limits',
      rawJson,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      limits: {},
      isCorrupt: true,
      corruptKeys: ['__not_an_object__'],
      errorMessage: 'Category limits must be a JSON object',
      rawJson,
    };
  }

  const limits: CategoryLimitsMap = {};
  const corruptKeys: string[] = [];

  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isExpenseCategory(key)) {
      corruptKeys.push(key);
      continue;
    }

    if (!isValidPaise(value) || (value as number) <= 0) {
      corruptKeys.push(key);
      continue;
    }

    limits[key as ExpenseCategory] = value as number;
  }

  const isCorrupt = corruptKeys.length > 0;
  return {
    limits,
    isCorrupt,
    corruptKeys,
    errorMessage: isCorrupt ? `Corrupted or invalid category limit entries: ${corruptKeys.join(', ')}` : null,
    rawJson,
  };
}

/**
 * Serializes a category limits map to a normalized JSON string.
 * Returns null if limits is empty, null, or undefined.
 * Throws an Error if limits contains invalid categories or non-positive amounts.
 */
export function serializeCategoryLimits(limits: CategoryLimitsMap | null | undefined): string | null {
  if (!limits || Object.keys(limits).length === 0) {
    return null;
  }

  const sanitized: Partial<Record<ExpenseCategory, number>> = {};
  for (const [key, value] of Object.entries(limits)) {
    if (!isExpenseCategory(key)) {
      throw new Error(`Invalid expense category '${key}' for category limits`);
    }
    if (!isValidPaise(value) || (value as number) <= 0) {
      throw new Error(`Limit for '${key}' must be a positive integer greater than zero`);
    }
    sanitized[key as ExpenseCategory] = value as number;
  }

  if (Object.keys(sanitized).length === 0) {
    return null;
  }

  return JSON.stringify(sanitized);
}
