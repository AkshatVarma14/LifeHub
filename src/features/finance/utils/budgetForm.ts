/**
 * Budget Form State Mapping and Validation Utilities for LifeHub.
 * Stage 1 Slice 4B: Monthly Budget Configuration.
 * Pure deterministic mapping and validation between budget form inputs and domain models.
 */

import type { MonthlyBudget } from '../../../types/finance.ts';
import {
  type BudgetInput,
  type ValidationResult,
  validateBudgetInput,
} from '../validation.ts';
import {
  tryParseRupeesToPaise,
  paiseToRupeesString,
} from '../../../utils/currency.ts';
import { isValidMonthString } from '../../../utils/date.ts';

export interface BudgetFormData {
  amount: string; // Plain rupee string entered by user, e.g. "50000" or "0"
}

/**
 * Returns initial form data for configuring or editing a monthly budget.
 * - If no budget is configured (null), defaults to empty string ("").
 * - If a budget is configured with 0 paise, formats to "0.00".
 * - If a budget is configured with >0 paise, formats using paiseToRupeesString.
 */
export function getInitialBudgetFormData(
  existing?: MonthlyBudget | null
): BudgetFormData {
  if (existing) {
    return {
      amount: paiseToRupeesString(existing.totalBudgetPaise),
    };
  }

  return {
    amount: '',
  };
}

/**
 * Validates and maps form data to a domain BudgetInput.
 *
 * Rules:
 * - Month must be a valid YYYY-MM string.
 * - Amount cannot be empty or whitespace.
 * - Amount is parsed via tryParseRupeesToPaise without floating-point math.
 * - Amount >= 0 is allowed (0 is a valid planned budget).
 * - Preserves existing categoryLimitsJson if present.
 */
export function validateAndMapBudgetForm(
  formData: BudgetFormData,
  month: string,
  existingCategoryLimitsJson?: string | null
): ValidationResult<BudgetInput> {
  const errors: string[] = [];

  if (!formData || typeof formData !== 'object') {
    return { isValid: false, errors: ['Form data must be an object'] };
  }

  // 1. Month validation
  const trimmedMonth = typeof month === 'string' ? month.trim() : '';
  if (!isValidMonthString(trimmedMonth)) {
    errors.push('Target month must be in valid YYYY-MM format');
  }

  // 2. Amount parsing & validation
  const amountStr = typeof formData.amount === 'string' ? formData.amount.trim() : '';
  if (amountStr.length === 0) {
    errors.push('Please enter a budget amount');
  } else {
    const parsed = tryParseRupeesToPaise(amountStr);
    if (!parsed.success) {
      errors.push(parsed.error ?? 'Invalid budget amount');
    } else if (parsed.paise < 0) {
      errors.push('Budget amount cannot be negative');
    } else {
      // Amount is valid non-negative integer paise.
      // Delegate to validateBudgetInput to ensure consistency with domain rules
      const domainInput: BudgetInput = {
        month: trimmedMonth,
        totalBudgetPaise: parsed.paise,
        categoryLimitsJson: existingCategoryLimitsJson ?? null,
      };

      const domainValidation = validateBudgetInput(domainInput);
      if (!domainValidation.isValid) {
        errors.push(...domainValidation.errors);
      } else if (errors.length === 0 && domainValidation.sanitized) {
        return {
          isValid: true,
          errors: [],
          sanitized: domainValidation.sanitized,
        };
      }
    }
  }

  return { isValid: false, errors };
}
