/**
 * Finance Category Constants for LifeHub.
 * Stage 1: Finance vertical slice.
 * Expense categories (8) and Income categories (5) are strictly maintained and validated.
 */

import type { ExpenseCategory, IncomeCategory, FinanceCategory } from '../../types/finance';

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'Housing',
  'Food & Dining',
  'Transportation',
  'Utilities & Bills',
  'Healthcare',
  'Education & Work',
  'Personal & Leisure',
  'Other Expense',
] as const;

export const INCOME_CATEGORIES: readonly IncomeCategory[] = [
  'Salary / Wages',
  'Stipend / Allowance',
  'Freelance',
  'Investment / Interest',
  'Gift / Other Income',
] as const;

export function isExpenseCategory(category: string): category is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(category);
}

export function isIncomeCategory(category: string): category is IncomeCategory {
  return (INCOME_CATEGORIES as readonly string[]).includes(category);
}

export function isFinanceCategory(category: string): category is FinanceCategory {
  return isExpenseCategory(category) || isIncomeCategory(category);
}
