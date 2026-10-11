/**
 * Finance Calculation Engine for LifeHub.
 * Stage 1: Finance vertical slice.
 * Pure deterministic calculations with integer paise.
 * Zero dependencies on SQLite, React, navigation, or UI.
 * Implements ADR-02 double-counting prevention.
 */

import type {
  Transaction,
  MonthlyBudget,
  FixedPayment,
  BudgetSummary,
  CommitmentBreakdown,
  CategorySpendingSummary,
} from '../../types/finance.ts';

/**
 * Calculates a complete, deterministic budget summary for a given month (YYYY-MM).
 *
 * Business Rules & ADR-02 Compliance:
 * 1. Total Planned Budget is the spending ceiling (or null if unconfigured).
 * 2. Active Fixed Commitments reserve their expected amount for the month.
 * 3. Actual Usable Budget = Total Planned Budget - Active Commitments Reserved.
 * 4. Total Actual Spending = sum of ALL actual expense transactions in the month.
 * 5. Eligible Discretionary Spending = unlinked expenses + inactive linked expenses + excess payments on active commitments.
 * 6. Remaining Usable Budget = Actual Usable Budget - Eligible Discretionary Spending.
 * 7. Linked payments up to expected commitment amount do NOT double-deduct from Usable Budget.
 * 8. Income transactions contribute to income and net cashflow, but NEVER increase planned spending ceiling.
 * 9. Missing budget (null) is strictly distinguished from configured zero budget (0).
 * 10. Negative remaining values are preserved when overspending occurs.
 */
export function calculateBudgetSummary(
  month: string,
  budget: MonthlyBudget | null,
  transactions: Transaction[],
  commitments: FixedPayment[]
): BudgetSummary {
  // 1. Filter transactions to selected month (YYYY-MM)
  const monthTransactions = transactions.filter((tx) => tx.date.startsWith(`${month}-`));
  const monthExpenses = monthTransactions.filter((tx) => tx.type === 'expense');
  const monthIncomes = monthTransactions.filter((tx) => tx.type === 'income');

  // 2. Aggregate income and total actual expense spending
  let totalIncomePaise = 0;
  for (const tx of monthIncomes) {
    totalIncomePaise += tx.amountPaise;
  }

  let totalActualSpendingPaise = 0;
  for (const tx of monthExpenses) {
    totalActualSpendingPaise += tx.amountPaise;
  }

  // 3. Net Cashflow = Income - Total Actual Spending
  const netCashflowPaise = totalIncomePaise - totalActualSpendingPaise;

  // 4. Partition active and inactive commitments
  const activeCommitments: FixedPayment[] = [];
  const commitmentMap = new Map<string, FixedPayment>();

  for (const c of commitments) {
    commitmentMap.set(c.id, c);
    if (c.active) {
      activeCommitments.push(c);
    }
  }

  let activeCommitmentsReservedPaise = 0;
  for (const c of activeCommitments) {
    activeCommitmentsReservedPaise += c.expectedAmountPaise;
  }

  // 5. Aggregate linked payments per commitment
  const linkedPaymentsByCommitment = new Map<string, number>();
  let unlinkedExpensesPaise = 0;
  let unknownLinkedExpensesPaise = 0;

  for (const tx of monthExpenses) {
    if (!tx.linkedFixedPaymentId) {
      unlinkedExpensesPaise += tx.amountPaise;
    } else if (commitmentMap.has(tx.linkedFixedPaymentId)) {
      const current = linkedPaymentsByCommitment.get(tx.linkedFixedPaymentId) ?? 0;
      linkedPaymentsByCommitment.set(tx.linkedFixedPaymentId, current + tx.amountPaise);
    } else {
      // Linked to an unknown or deleted commitment ID: counts fully as discretionary
      unknownLinkedExpensesPaise += tx.amountPaise;
    }
  }

  // 6. Calculate Commitment Breakdowns and Excess Discretionary Spending
  const commitmentsBreakdown: CommitmentBreakdown[] = [];
  let activeCommitmentsExcessPaise = 0;
  let inactiveCommitmentsPaidPaise = 0;

  for (const c of commitments) {
    const actualPaid = linkedPaymentsByCommitment.get(c.id) ?? 0;
    const isFulfilled = actualPaid >= c.expectedAmountPaise;
    const excess = Math.max(0, actualPaid - c.expectedAmountPaise);

    commitmentsBreakdown.push({
      commitmentId: c.id,
      commitmentName: c.name,
      category: c.category,
      expectedAmountPaise: c.expectedAmountPaise,
      actualPaidPaise: actualPaid,
      isFulfilled,
      excessPaidPaise: excess,
    });

    if (c.active) {
      activeCommitmentsExcessPaise += excess;
    } else {
      // Inactive commitments have ₹0 reserved budget; all linked payments count fully as discretionary
      inactiveCommitmentsPaidPaise += actualPaid;
    }
  }

  // 7. Eligible Discretionary Spending
  const eligibleDiscretionarySpendingPaise =
    unlinkedExpensesPaise + unknownLinkedExpensesPaise + inactiveCommitmentsPaidPaise + activeCommitmentsExcessPaise;

  // 8. Planned Budget & Usable Budget metrics
  const hasConfiguredBudget = budget !== null;
  const totalPlannedBudgetPaise = hasConfiguredBudget ? budget.totalBudgetPaise : null;

  let actualUsableBudgetPaise: number | null = null;
  let remainingUsableBudgetPaise: number | null = null;

  if (hasConfiguredBudget && totalPlannedBudgetPaise !== null) {
    actualUsableBudgetPaise = totalPlannedBudgetPaise - activeCommitmentsReservedPaise;
    remainingUsableBudgetPaise = actualUsableBudgetPaise - eligibleDiscretionarySpendingPaise;
  }

  // 9. Category Summary Data (comparing actual category spending against configured limits)
  // Per Decision 7: counts all expense transactions in their categories (including linked payments)
  const categorySpentMap = new Map<string, number>();
  for (const tx of monthExpenses) {
    const current = categorySpentMap.get(tx.category) ?? 0;
    categorySpentMap.set(tx.category, current + tx.amountPaise);
  }

  const categoryLimits: Record<string, number> = {};
  if (budget?.categoryLimitsJson) {
    try {
      const parsed = JSON.parse(budget.categoryLimitsJson);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        Object.assign(categoryLimits, parsed);
      }
    } catch {
      // Ignored if invalid JSON; categoryLimits remains empty
    }
  }

  const allCategories = new Set<string>([
    ...Object.keys(categoryLimits),
    ...categorySpentMap.keys(),
  ]);

  const categoryBreakdown: CategorySpendingSummary[] = [];
  for (const cat of Array.from(allCategories).sort()) {
    const actualSpentPaise = categorySpentMap.get(cat) ?? 0;
    const limitPaise = categoryLimits[cat] !== undefined ? categoryLimits[cat] : null;
    const isOverLimit = limitPaise !== null ? actualSpentPaise > limitPaise : false;
    const remainingPaise = limitPaise !== null ? limitPaise - actualSpentPaise : null;

    categoryBreakdown.push({
      category: cat,
      actualSpentPaise,
      limitPaise,
      isOverLimit,
      remainingPaise,
    });
  }

  return {
    month,
    hasConfiguredBudget,
    totalPlannedBudgetPaise,
    activeCommitmentsReservedPaise,
    actualUsableBudgetPaise,
    totalActualSpendingPaise,
    eligibleDiscretionarySpendingPaise,
    remainingUsableBudgetPaise,
    totalIncomePaise,
    netCashflowPaise,
    commitmentsBreakdown,
    categoryBreakdown,
  };
}
