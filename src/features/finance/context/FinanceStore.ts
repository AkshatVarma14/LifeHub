/**
 * Finance State Store for LifeHub.
 * Stage 1: Finance vertical slice.
 * Pure TypeScript reactive state container for finance operations.
 * Enforces:
 * - Deterministic loading and error lifecycles
 * - Stale asynchronous request protection via monotonic request IDs
 * - Strict write-before-refresh ordering (no optimistic false positives)
 * - Safe error isolation: persisted writes succeed even if post-write refresh encounters an error
 */

import type {
  Transaction,
  MonthlyBudget,
  FixedPayment,
  BudgetSummary,
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
import { calculateBudgetSummary } from '../calculations.ts';
import { getCurrentMonthString, isValidMonthString } from '../../../utils/date.ts';

export interface FinanceStoreState {
  selectedMonth: string;
  isLoading: boolean;
  isMutating: boolean;
  error: Error | null;
  transactions: Transaction[];
  monthlyBudget: MonthlyBudget | null;
  commitments: FixedPayment[];
  summary: BudgetSummary;
}

export type StoreListener = () => void;

export class FinanceStore {
  private state: FinanceStoreState;
  private listeners = new Set<StoreListener>();
  private activeRequestId = 0;

  private txRepo: TransactionRepository;
  private budgetRepo: BudgetRepository;
  private fpRepo: FixedPaymentRepository;

  constructor(
    initialMonth: string = getCurrentMonthString(),
    txRepo: TransactionRepository,
    budgetRepo: BudgetRepository,
    fpRepo: FixedPaymentRepository
  ) {
    const validMonth = isValidMonthString(initialMonth) ? initialMonth : getCurrentMonthString();
    this.txRepo = txRepo;
    this.budgetRepo = budgetRepo;
    this.fpRepo = fpRepo;

    const initialSummary = calculateBudgetSummary(validMonth, null, [], []);

    this.state = {
      selectedMonth: validMonth,
      isLoading: true,
      isMutating: false,
      error: null,
      transactions: [],
      monthlyBudget: null,
      commitments: [],
      summary: initialSummary,
    };
  }

  getState(): FinanceStoreState {
    return this.state;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Loads data for a given month with monotonic request ID protection against race conditions.
   */
  async loadMonthData(month: string): Promise<void> {
    if (!isValidMonthString(month)) {
      throw new Error(`Invalid month string '${month}'. Expected format YYYY-MM.`);
    }

    const requestId = ++this.activeRequestId;
    this.state = { ...this.state, selectedMonth: month, isLoading: true };
    this.notify();

    try {
      const [txList, budget, commitmentList] = await Promise.all([
        this.txRepo.listByMonth(month),
        this.budgetRepo.getByMonth(month),
        this.fpRepo.listAll(),
      ]);

      // If a newer request has started (e.g. rapid month switching), discard this stale result
      if (requestId !== this.activeRequestId) {
        return;
      }

      const summary = calculateBudgetSummary(month, budget, txList, commitmentList);
      this.state = {
        ...this.state,
        selectedMonth: month,
        isLoading: false,
        error: null,
        transactions: txList,
        monthlyBudget: budget,
        commitments: commitmentList,
        summary,
      };
      this.notify();
    } catch (err) {
      if (requestId !== this.activeRequestId) {
        return;
      }
      this.state = {
        ...this.state,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
      this.notify();
    }
  }

  async setSelectedMonth(month: string): Promise<void> {
    if (!isValidMonthString(month)) {
      throw new Error(`Invalid month string '${month}'. Expected format YYYY-MM.`);
    }
    await this.loadMonthData(month);
  }

  async refresh(): Promise<void> {
    await this.loadMonthData(this.state.selectedMonth);
  }

  async addTransaction(input: TransactionInput): Promise<Transaction> {
    this.state = { ...this.state, isMutating: true };
    this.notify();

    let created: Transaction;
    try {
      created = await this.txRepo.create(input);
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    // Persisted write succeeded! Refresh state. If refresh fails, isolate error so write is not reported as failed.
    try {
      await this.loadMonthData(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-transaction-create refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
    return created;
  }

  async updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
    this.state = { ...this.state, isMutating: true };
    this.notify();

    let updated: Transaction;
    try {
      updated = await this.txRepo.update(id, input);
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    try {
      await this.loadMonthData(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-transaction-update refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.state = { ...this.state, isMutating: true };
    this.notify();

    try {
      const deleted = await this.txRepo.delete(id);
      if (!deleted) {
        throw new Error(`Transaction with id '${id}' could not be deleted or was not found`);
      }
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    try {
      await this.loadMonthData(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-transaction-delete refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
  }

  async setBudget(input: BudgetInput): Promise<MonthlyBudget> {
    this.state = { ...this.state, isMutating: true };
    this.notify();

    let saved: MonthlyBudget;
    try {
      saved = await this.budgetRepo.upsert(input);
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    try {
      await this.loadMonthData(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-budget-upsert refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
    return saved;
  }

  async deleteBudget(month: string): Promise<void> {
    this.state = { ...this.state, isMutating: true };
    this.notify();

    try {
      const deleted = await this.budgetRepo.deleteByMonth(month);
      if (!deleted) {
        throw new Error(`Budget for month '${month}' could not be deleted or was not found`);
      }
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    try {
      await this.loadMonthData(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-budget-delete refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
  }

  async addCommitment(input: FixedPaymentInput): Promise<FixedPayment> {
    this.state = { ...this.state, isMutating: true };
    this.notify();

    let created: FixedPayment;
    try {
      created = await this.fpRepo.create(input);
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    try {
      await this.loadMonthData(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-commitment-create refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
    return created;
  }

  async updateCommitment(id: string, input: FixedPaymentInput): Promise<FixedPayment> {
    this.state = { ...this.state, isMutating: true };
    this.notify();

    let updated: FixedPayment;
    try {
      updated = await this.fpRepo.update(id, input);
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    try {
      await this.loadMonthData(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-commitment-update refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
    return updated;
  }

  async deleteCommitment(id: string): Promise<void> {
    this.state = { ...this.state, isMutating: true };
    this.notify();

    try {
      const deleted = await this.fpRepo.delete(id);
      if (!deleted) {
        throw new Error(`Commitment with id '${id}' could not be deleted or was not found`);
      }
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    try {
      await this.loadMonthData(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-commitment-delete refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
  }
}
