/**
 * Category Limit Form State Mapping and Validation Utilities for LifeHub.
 * Stage 1 Slice 4C.2: Category Budget Limit Configuration.
 * Pure deterministic mapping and validation between category limit form inputs and domain models.
 */

import type { ExpenseCategory } from '../../../types/finance.ts';
import { EXPENSE_CATEGORIES, isExpenseCategory } from '../constants.ts';
import {
  tryParseRupeesToPaise,
  paiseToRupeesString,
  MAX_SAFE_PAISE,
} from '../../../utils/currency.ts';

export interface CategoryLimitFormData {
  category: ExpenseCategory;
  amount: string; // Plain rupee string entered by user, e.g. "12000" or "0"
}

export interface CategoryLimitValidationResult {
  isValid: boolean;
  error?: string;
  paise?: number;
}

/**
 * Returns initial form data for configuring or editing a category limit.
 * - If category is omitted or invalid, defaults to the first EXPENSE_CATEGORIES entry.
 * - If existingLimitPaise is null/undefined, amount is empty ("").
 * - If existingLimitPaise is 0, formats to "0.00".
 * - If existingLimitPaise > 0, formats using paiseToRupeesString.
 */
export function getInitialCategoryLimitFormData(
  category?: ExpenseCategory | null,
  existingLimitPaise?: number | null
): CategoryLimitFormData {
  const selectedCategory: ExpenseCategory =
    category && isExpenseCategory(category) ? category : EXPENSE_CATEGORIES[0];

  let amount = '';
  if (existingLimitPaise !== null && existingLimitPaise !== undefined) {
    amount = paiseToRupeesString(existingLimitPaise);
  }

  return {
    category: selectedCategory,
    amount,
  };
}

/**
 * Validates a category limit rupee string and parses it into integer paise.
 *
 * Rules:
 * - Amount cannot be empty or whitespace.
 * - Amount is parsed via tryParseRupeesToPaise without floating-point math.
 * - Amount >= 0 is allowed (0 is a valid configured limit).
 * - Amount > MAX_SAFE_PAISE is rejected.
 */
export function validateCategoryLimitAmount(amountStr: unknown): CategoryLimitValidationResult {
  if (typeof amountStr !== 'string') {
    return { isValid: false, error: 'Please enter a category limit amount' };
  }

  const trimmed = amountStr.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Please enter a category limit amount' };
  }

  const parsed = tryParseRupeesToPaise(trimmed);
  if (!parsed.success) {
    return { isValid: false, error: parsed.error ?? 'Invalid limit amount' };
  }

  if (parsed.paise < 0) {
    return { isValid: false, error: 'Category limit cannot be negative' };
  }

  if (parsed.paise > MAX_SAFE_PAISE) {
    return { isValid: false, error: 'Category limit exceeds maximum allowable threshold' };
  }

  return {
    isValid: true,
    paise: parsed.paise,
  };
}
