/**
 * Finance Validation Rules for LifeHub.
 * Stage 1: Finance vertical slice.
 * Pure deterministic validation functions for transactions, monthly budgets, and fixed payments.
 */

import type {
  Transaction,
  MonthlyBudget,
  FixedPayment,
  TransactionType,
  ExpenseCategory,
  IncomeCategory,
} from '../../types/finance';

import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  isExpenseCategory,
  isIncomeCategory,
} from './constants.ts';

import { isValidDateString, isValidMonthString } from '../../utils/date.ts';
import { isValidPaise, MAX_SAFE_PAISE } from '../../utils/currency.ts';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  sanitized?: T;
}

export interface TransactionInput {
  id?: string;
  amountPaise: number;
  type: TransactionType;
  category: string;
  date: string;
  description: string;
  linkedFixedPaymentId?: string | null;
}

export function validateTransactionInput(
  input: unknown
): ValidationResult<TransactionInput> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Transaction input must be an object'] };
  }

  const raw = input as Partial<TransactionInput>;

  // 1. Amount validation
  if (!isValidPaise(raw.amountPaise) || raw.amountPaise <= 0) {
    errors.push('Transaction amount must be a positive integer greater than zero');
  } else if (raw.amountPaise > MAX_SAFE_PAISE) {
    errors.push('Transaction amount exceeds maximum allowable limit');
  }

  // 2. Type validation
  if (raw.type !== 'expense' && raw.type !== 'income') {
    errors.push("Transaction type must be either 'expense' or 'income'");
  }

  // 3. Category compatibility validation
  if (typeof raw.category !== 'string' || raw.category.trim().length === 0) {
    errors.push('Transaction category is required');
  } else {
    const trimmedCat = raw.category.trim();
    if (raw.type === 'expense' && !isExpenseCategory(trimmedCat)) {
      errors.push(
        `Invalid expense category '${trimmedCat}'. Allowed categories: ${EXPENSE_CATEGORIES.join(', ')}`
      );
    } else if (raw.type === 'income' && !isIncomeCategory(trimmedCat)) {
      errors.push(
        `Invalid income category '${trimmedCat}'. Allowed categories: ${INCOME_CATEGORIES.join(', ')}`
      );
    }
  }

  // 4. Date validation (real calendar date, leap year check, future dates allowed)
  if (typeof raw.date !== 'string' || !isValidDateString(raw.date)) {
    errors.push('Transaction date must be a valid calendar date in YYYY-MM-DD format');
  }

  // 5. Description validation
  if (typeof raw.description !== 'string' || raw.description.trim().length === 0) {
    errors.push('Transaction description cannot be empty');
  } else if (raw.description.trim().length > 255) {
    errors.push('Transaction description cannot exceed 255 characters');
  }

  // 6. Linked commitment validation
  let sanitizedLinkId: string | null = null;
  if (raw.linkedFixedPaymentId !== undefined && raw.linkedFixedPaymentId !== null) {
    if (typeof raw.linkedFixedPaymentId !== 'string' || raw.linkedFixedPaymentId.trim().length === 0) {
      errors.push('Linked commitment ID must be a non-empty string or null');
    } else {
      sanitizedLinkId = raw.linkedFixedPaymentId.trim();
      // Income transactions must NOT link to fixed obligations
      if (raw.type === 'income') {
        errors.push('Income transactions cannot be linked to fixed payment obligations');
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      id: raw.id,
      amountPaise: raw.amountPaise!,
      type: raw.type!,
      category: raw.category!.trim(),
      date: raw.date!.trim(),
      description: raw.description!.trim(),
      linkedFixedPaymentId: sanitizedLinkId,
    },
  };
}

export interface BudgetInput {
  id?: string;
  month: string;
  totalBudgetPaise: number;
  categoryLimitsJson?: string | null;
}

export function validateBudgetInput(input: unknown): ValidationResult<BudgetInput> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Budget input must be an object'] };
  }

  const raw = input as Partial<BudgetInput>;

  // 1. Month validation
  if (typeof raw.month !== 'string' || !isValidMonthString(raw.month)) {
    errors.push('Budget month must be in valid YYYY-MM format');
  }

  // 2. Total budget validation (>= 0; 0 is valid)
  if (!isValidPaise(raw.totalBudgetPaise) || raw.totalBudgetPaise < 0) {
    errors.push('Total budget must be a non-negative integer (greater than or equal to zero)');
  } else if (raw.totalBudgetPaise > MAX_SAFE_PAISE) {
    errors.push('Total budget exceeds maximum allowable limit');
  }

  // 3. Category limits validation (optional)
  let sanitizedCategoryLimits: string | null = null;
  if (raw.categoryLimitsJson !== undefined && raw.categoryLimitsJson !== null) {
    if (typeof raw.categoryLimitsJson !== 'string') {
      errors.push('Category limits must be a valid JSON string or null');
    } else {
      try {
        const parsed = JSON.parse(raw.categoryLimitsJson);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          errors.push('Category limits JSON must represent a key-value object');
        } else {
          for (const [cat, limit] of Object.entries(parsed)) {
            if (!isExpenseCategory(cat)) {
              errors.push(`Invalid expense category '${cat}' in category limits`);
            }
            if (!isValidPaise(limit) || (limit as number) <= 0) {
              errors.push(`Limit for category '${cat}' must be a positive integer greater than zero`);
            }
          }
          sanitizedCategoryLimits = JSON.stringify(parsed);
        }
      } catch {
        errors.push('Category limits must be valid JSON');
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      id: raw.id,
      month: raw.month!.trim(),
      totalBudgetPaise: raw.totalBudgetPaise!,
      categoryLimitsJson: sanitizedCategoryLimits,
    },
  };
}

export interface FixedPaymentInput {
  id?: string;
  name: string;
  category: string;
  expectedAmountPaise: number;
  dueDay: number;
  active?: boolean;
}

export function validateFixedPaymentInput(
  input: unknown
): ValidationResult<FixedPaymentInput> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Fixed payment input must be an object'] };
  }

  const raw = input as Partial<FixedPaymentInput>;

  // 1. Name validation
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('Commitment name is required');
  } else if (raw.name.trim().length > 100) {
    errors.push('Commitment name cannot exceed 100 characters');
  }

  // 2. Category validation
  if (typeof raw.category !== 'string' || !isExpenseCategory(raw.category.trim())) {
    errors.push(`Commitment category must be a valid expense category: ${EXPENSE_CATEGORIES.join(', ')}`);
  }

  // 3. Expected amount validation
  if (!isValidPaise(raw.expectedAmountPaise) || raw.expectedAmountPaise <= 0) {
    errors.push('Expected commitment amount must be a positive integer greater than zero');
  } else if (raw.expectedAmountPaise > MAX_SAFE_PAISE) {
    errors.push('Expected commitment amount exceeds maximum allowable limit');
  }

  // 4. Due day validation (1-31)
  if (!Number.isInteger(raw.dueDay) || (raw.dueDay as number) < 1 || (raw.dueDay as number) > 31) {
    errors.push('Due day must be an integer between 1 and 31');
  }

  // 5. Active flag
  const active = raw.active !== undefined ? Boolean(raw.active) : true;

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      id: raw.id,
      name: raw.name!.trim(),
      category: raw.category!.trim(),
      expectedAmountPaise: raw.expectedAmountPaise!,
      dueDay: raw.dueDay!,
      active,
    },
  };
}
