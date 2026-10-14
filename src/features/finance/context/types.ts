/**
 * Finance State and Context Types for LifeHub.
 * Stage 1: Finance vertical slice.
 */

import type React from 'react';
import type {
  Transaction,
  MonthlyBudget,
  FixedPayment,
  BudgetSummary,
  ExpenseCategory,
} from '../../../types/finance.ts';
import type {
  TransactionInput,
  BudgetInput,
  FixedPaymentInput,
} from '../validation.ts';
import type {
  TransactionRepository,
  BudgetRepository,
  FixedPaymentRepository,
} from '../repositories/types.ts';

export interface FinanceState {
  selectedMonth: string; // Format: YYYY-MM
  isLoading: boolean;
  isMutating: boolean;
  error: Error | null;
  transactions: Transaction[];
  monthlyBudget: MonthlyBudget | null;
  commitments: FixedPayment[];
  summary: BudgetSummary;
}

export interface FinanceContextValue extends FinanceState {
  setSelectedMonth: (month: string) => void;
  refresh: () => Promise<void>;

  // Transaction mutations
  addTransaction: (input: TransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;

  // Budget mutations
  setBudget: (input: BudgetInput) => Promise<MonthlyBudget>;
  deleteBudget: (month: string) => Promise<void>;
  setCategoryLimit: (
    month: string,
    category: ExpenseCategory,
    limitPaise: number
  ) => Promise<MonthlyBudget>;
  clearCategoryLimit: (
    month: string,
    category: ExpenseCategory
  ) => Promise<MonthlyBudget | null>;

  // Commitment mutations
  addCommitment: (input: FixedPaymentInput) => Promise<FixedPayment>;
  updateCommitment: (id: string, input: FixedPaymentInput) => Promise<FixedPayment>;
  deleteCommitment: (id: string) => Promise<void>;
}

export interface FinanceProviderProps {
  children: React.ReactNode;
  initialMonth?: string;
  transactionRepo?: TransactionRepository;
  budgetRepo?: BudgetRepository;
  fixedPaymentRepo?: FixedPaymentRepository;
  store?: import('./FinanceStore.ts').FinanceStore;
}
