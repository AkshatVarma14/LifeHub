/**
 * Transaction Form State Mapping and Validation Utilities for LifeHub.
 * Stage 1 Slice 4A.2: Transaction creation and editing.
 * Pure deterministic mapping and validation between form inputs and domain models.
 */

import type {
  Transaction,
  TransactionType,
  ExpenseCategory,
  IncomeCategory,
  FinanceCategory,
} from '../../../types/finance.ts';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  isExpenseCategory,
  isIncomeCategory,
} from '../constants.ts';
import {
  type TransactionInput,
  type ValidationResult,
  validateTransactionInput,
} from '../validation.ts';
import {
  tryParseRupeesToPaise,
  paiseToRupeesString,
} from '../../../utils/currency.ts';
import {
  isValidDateString,
  getCurrentMonthString,
  getTodayDateString,
} from '../../../utils/date.ts';

export interface TransactionFormData {
  type: TransactionType;
  amount: string; // Plain rupee string entered by user, e.g. "450" or "1500.50"
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  linkedFixedPaymentId?: string | null;
}

/**
 * Returns initial form data for creating a new transaction or editing an existing one.
 */
export function getInitialTransactionFormData(
  existing?: Transaction | null,
  selectedMonth?: string
): TransactionFormData {
  if (existing) {
    return {
      type: existing.type,
      amount: paiseToRupeesString(existing.amountPaise),
      category: existing.category,
      date: existing.date,
      description: existing.description,
      linkedFixedPaymentId: existing.linkedFixedPaymentId ?? null,
    };
  }

  // For a new transaction:
  // If viewing the current calendar month, default to today's date.
  // Otherwise, default to the 1st of the selected month (or today if month is invalid).
  const currentMonth = getCurrentMonthString();
  let defaultDate = getTodayDateString();
  if (selectedMonth && selectedMonth !== currentMonth) {
    const candidate = `${selectedMonth}-01`;
    if (isValidDateString(candidate)) {
      defaultDate = candidate;
    }
  }

  return {
    type: 'expense',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    date: defaultDate,
    description: '',
    linkedFixedPaymentId: null,
  };
}

/**
 * Validates and maps form data to a domain TransactionInput.
 *
 * Rules:
 * - Amount is parsed via tryParseRupeesToPaise without floating-point math; must be positive.
 * - Category must match the chosen transaction type (Expense or Income).
 * - Date must be a real calendar date in YYYY-MM-DD format.
 * - Description is optional: if omitted, defaults to the selected category name.
 * - Enforces maximum description length of 255 characters.
 */
export function validateAndMapTransactionForm(
  formData: TransactionFormData
): ValidationResult<TransactionInput> {
  const errors: string[] = [];

  if (!formData || typeof formData !== 'object') {
    return { isValid: false, errors: ['Form data must be an object'] };
  }

  // 1. Amount parsing & validation
  const amountStr = typeof formData.amount === 'string' ? formData.amount.trim() : '';
  const parsedAmount = tryParseRupeesToPaise(amountStr);
  if (!parsedAmount.success || parsedAmount.paise <= 0) {
    errors.push(parsedAmount.error ?? 'Please enter a valid amount greater than zero');
  }

  // 2. Type validation
  if (formData.type !== 'expense' && formData.type !== 'income') {
    errors.push("Transaction type must be 'expense' or 'income'");
  }

  // 3. Category validation matching selected type
  const categoryStr = typeof formData.category === 'string' ? formData.category.trim() : '';
  if (categoryStr.length === 0) {
    errors.push('Category is required');
  } else if (formData.type === 'expense' && !isExpenseCategory(categoryStr)) {
    errors.push(
      `Invalid expense category '${categoryStr}'. Allowed: ${EXPENSE_CATEGORIES.join(', ')}`
    );
  } else if (formData.type === 'income' && !isIncomeCategory(categoryStr)) {
    errors.push(
      `Invalid income category '${categoryStr}'. Allowed: ${INCOME_CATEGORIES.join(', ')}`
    );
  }

  // 4. Date validation
  const dateStr = typeof formData.date === 'string' ? formData.date.trim() : '';
  if (!isValidDateString(dateStr)) {
    errors.push('Date must be a valid calendar date in YYYY-MM-DD format');
  }

  // 5. Description validation with optional fallback to category
  const rawDesc = typeof formData.description === 'string' ? formData.description.trim() : '';
  const finalDescription = rawDesc.length > 0 ? rawDesc : categoryStr;
  if (finalDescription.length > 255) {
    errors.push('Description cannot exceed 255 characters');
  }

  if (errors.length > 0 || !parsedAmount.success) {
    return { isValid: false, errors };
  }

  // 6. Linked commitment preservation (only valid for expense transactions)
  const linkedId =
    formData.type === 'expense' ? (formData.linkedFixedPaymentId ?? null) : null;

  const transactionInput: TransactionInput = {
    amountPaise: parsedAmount.paise,
    type: formData.type,
    category: categoryStr,
    date: dateStr,
    description: finalDescription,
    linkedFixedPaymentId: linkedId,
  };

  // Run through authoritative domain validator
  const domainValidation = validateTransactionInput(transactionInput);
  if (!domainValidation.isValid) {
    return { isValid: false, errors: domainValidation.errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: domainValidation.sanitized,
  };
}
