/**
 * Finance Domain Types for LifeHub.
 * Stage 1: Finance vertical slice.
 * All monetary amounts are stored as integer minor units (paise for INR).
 */

export type TransactionType = 'expense' | 'income';

export type ExpenseCategory =
  | 'Housing'
  | 'Food & Dining'
  | 'Transportation'
  | 'Utilities & Bills'
  | 'Healthcare'
  | 'Education & Work'
  | 'Personal & Leisure'
  | 'Other Expense';

export type IncomeCategory =
  | 'Salary / Wages'
  | 'Stipend / Allowance'
  | 'Freelance'
  | 'Investment / Interest'
  | 'Gift / Other Income';

export type FinanceCategory = ExpenseCategory | IncomeCategory;

export interface Transaction {
  id: string;
  amountPaise: number; // Integer > 0
  type: TransactionType;
  category: FinanceCategory;
  date: string; // YYYY-MM-DD
  description: string;
  linkedFixedPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FixedPayment {
  id: string;
  name: string;
  category: ExpenseCategory;
  expectedAmountPaise: number; // Integer > 0
  dueDay: number; // 1-31
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudget {
  id: string;
  month: string; // YYYY-MM
  totalBudgetPaise: number; // Non-negative integer >= 0 (0 is a valid budget)
  categoryLimitsJson: string | null; // Serialized JSON: Record<string, number> in paise
  createdAt: string;
  updatedAt: string;
}

export interface CommitmentBreakdown {
  commitmentId: string;
  commitmentName: string;
  category: ExpenseCategory;
  expectedAmountPaise: number;
  actualPaidPaise: number;
  isFulfilled: boolean;
  excessPaidPaise: number; // Math.max(0, actualPaidPaise - expectedAmountPaise)
}

export interface CategorySpendingSummary {
  category: string;
  actualSpentPaise: number; // All expense transactions in this category (including linked payments)
  limitPaise: number | null; // Configured limit for category if set
  isOverLimit: boolean;
  remainingPaise: number | null; // limit - spent (negative if over limit)
}

export interface BudgetSummary {
  month: string; // YYYY-MM
  hasConfiguredBudget: boolean; // Distinguishes missing budget from configured zero budget
  totalPlannedBudgetPaise: number | null; // Configured budget (null if not set)
  activeCommitmentsReservedPaise: number; // Total expected amount of active commitments
  actualUsableBudgetPaise: number | null; // planned - commitments (null if no planned budget)
  totalActualSpendingPaise: number; // All expense transactions in month
  eligibleDiscretionarySpendingPaise: number; // Unlinked + inactive + active excess
  remainingUsableBudgetPaise: number | null; // usable - discretionary (negative on overspend)
  totalIncomePaise: number; // Total income in month
  netCashflowPaise: number; // totalIncome - totalActualSpending
  commitmentsBreakdown: CommitmentBreakdown[];
  categoryBreakdown: CategorySpendingSummary[];
}
