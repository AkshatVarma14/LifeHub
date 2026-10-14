/**
 * Finance React Context and Provider for LifeHub.
 * Stage 1: Finance vertical slice.
 * Connects FinanceStore to React tree using React 19's standard useSyncExternalStore.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { BudgetSummary } from '../../../types/finance.ts';
import type {
  FinanceContextValue,
  FinanceProviderProps,
} from './types.ts';
import {
  SqliteTransactionRepository,
  SqliteBudgetRepository,
  SqliteFixedPaymentRepository,
} from '../repositories/index.ts';
import { FinanceStore } from './FinanceStore.ts';
import { getCurrentMonthString } from '../../../utils/date.ts';

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({
  children,
  initialMonth,
  transactionRepo: txRepoProp,
  budgetRepo: budgetRepoProp,
  fixedPaymentRepo: fpRepoProp,
  store: storeProp,
}: FinanceProviderProps) {
  // 1. Stable store instance
  const store = useMemo(() => {
    if (storeProp) {
      return storeProp;
    }
    const txRepo = txRepoProp ?? new SqliteTransactionRepository();
    const budgetRepo = budgetRepoProp ?? new SqliteBudgetRepository();
    const fpRepo = fpRepoProp ?? new SqliteFixedPaymentRepository();
    return new FinanceStore(initialMonth ?? getCurrentMonthString(), txRepo, budgetRepo, fpRepo);
  }, [storeProp, initialMonth, txRepoProp, budgetRepoProp, fpRepoProp]);

  // 2. Subscribe to reactive store
  const state = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getState(),
    () => store.getState()
  );

  // 3. Trigger initial month data load on mount or store change
  useEffect(() => {
    store.loadMonthData(state.selectedMonth);
  }, [store]);

  // 4. Stable context value bundling state and store actions
  const contextValue = useMemo<FinanceContextValue>(
    () => ({
      ...state,
      setSelectedMonth: (month: string) => {
        store.setSelectedMonth(month);
      },
      refresh: () => store.refresh(),
      addTransaction: (input) => store.addTransaction(input),
      updateTransaction: (id, input) => store.updateTransaction(id, input),
      deleteTransaction: (id) => store.deleteTransaction(id),
      setBudget: (input) => store.setBudget(input),
      deleteBudget: (month) => store.deleteBudget(month),
      setCategoryLimit: (month, category, limitPaise) =>
        store.setCategoryLimit(month, category, limitPaise),
      clearCategoryLimit: (month, category) =>
        store.clearCategoryLimit(month, category),
      addCommitment: (input) => store.addCommitment(input),
      updateCommitment: (id, input) => store.updateCommitment(id, input),
      deleteCommitment: (id) => store.deleteCommitment(id),
    }),
    [state, store]
  );

  return React.createElement(FinanceContext.Provider, { value: contextValue }, children);
}

/**
 * Primary custom hook to access the complete Finance state and operations.
 */
export function useFinance(): FinanceContextValue {
  let context: FinanceContextValue | null = null;
  try {
    context = useContext(FinanceContext);
  } catch {
    throw new Error('useFinance must be used within a FinanceProvider');
  }

  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}

/**
 * Convenience hook to retrieve budget summary and loading state.
 */
export function useBudgetSummary(): {
  summary: BudgetSummary;
  isLoading: boolean;
  error: Error | null;
} {
  const { summary, isLoading, error } = useFinance();
  return { summary, isLoading, error };
}
