import test from 'node:test';
import assert from 'node:assert';
import { calculateBudgetSummary } from '../../src/features/finance/calculations.ts';
import type {
  Transaction,
  MonthlyBudget,
  FixedPayment,
} from '../../src/types/finance.ts';

function createTx(params: Partial<Transaction> & { amountPaise: number; type: 'expense' | 'income'; date: string }): Transaction {
  return {
    id: params.id ?? `tx_${Math.random().toString(36).slice(2, 9)}`,
    amountPaise: params.amountPaise,
    type: params.type,
    category: params.category ?? (params.type === 'expense' ? 'Food & Dining' : 'Salary / Wages'),
    date: params.date,
    description: params.description ?? 'Test transaction',
    linkedFixedPaymentId: params.linkedFixedPaymentId ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createCommitment(params: Partial<FixedPayment> & { id: string; expectedAmountPaise: number }): FixedPayment {
  return {
    id: params.id,
    name: params.name ?? 'Test Commitment',
    category: params.category ?? 'Housing',
    expectedAmountPaise: params.expectedAmountPaise,
    dueDay: params.dueDay ?? 5,
    active: params.active ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createBudget(params: Partial<MonthlyBudget> & { month: string; totalBudgetPaise: number }): MonthlyBudget {
  return {
    id: params.id ?? 'b_1',
    month: params.month,
    totalBudgetPaise: params.totalBudgetPaise,
    categoryLimitsJson: params.categoryLimitsJson ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test('Finance Calculations: No budget configured (null)', () => {
  const txs: Transaction[] = [
    createTx({ amountPaise: 50000, type: 'expense', date: '2026-10-05' }), // ₹500
    createTx({ amountPaise: 100000, type: 'income', date: '2026-10-01' }), // ₹1,000
  ];

  const summary = calculateBudgetSummary('2026-10', null, txs, []);

  assert.strictEqual(summary.hasConfiguredBudget, false);
  assert.strictEqual(summary.totalPlannedBudgetPaise, null);
  assert.strictEqual(summary.actualUsableBudgetPaise, null);
  assert.strictEqual(summary.remainingUsableBudgetPaise, null);
  assert.strictEqual(summary.totalActualSpendingPaise, 50000);
  assert.strictEqual(summary.totalIncomePaise, 100000);
  assert.strictEqual(summary.netCashflowPaise, 50000); // 1,000 - 500 = 500
});

test('Finance Calculations: Configured zero budget (0 paise) is distinct from null', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 0 });
  const txs: Transaction[] = [
    createTx({ amountPaise: 25000, type: 'expense', date: '2026-10-05' }), // ₹250
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, []);

  assert.strictEqual(summary.hasConfiguredBudget, true);
  assert.strictEqual(summary.totalPlannedBudgetPaise, 0);
  assert.strictEqual(summary.actualUsableBudgetPaise, 0);
  assert.strictEqual(summary.remainingUsableBudgetPaise, -25000); // -₹250 overspent
  assert.strictEqual(summary.totalActualSpendingPaise, 25000);
});

test('Finance Calculations: Pure discretionary budget without commitments', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 2000000 }); // ₹20,000
  const txs: Transaction[] = [
    createTx({ amountPaise: 400000, type: 'expense', date: '2026-10-02', category: 'Food & Dining' }), // ₹4,000
    createTx({ amountPaise: 150000, type: 'expense', date: '2026-10-15', category: 'Transportation' }), // ₹1,500
    createTx({ amountPaise: 5000000, type: 'income', date: '2026-10-01' }), // ₹50,000
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, []);

  assert.strictEqual(summary.activeCommitmentsReservedPaise, 0);
  assert.strictEqual(summary.actualUsableBudgetPaise, 2000000); // ₹20,000
  assert.strictEqual(summary.totalActualSpendingPaise, 550000); // ₹5,500
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 550000);
  assert.strictEqual(summary.remainingUsableBudgetPaise, 1450000); // ₹14,500
  assert.strictEqual(summary.totalIncomePaise, 5000000); // ₹50,000
  assert.strictEqual(summary.netCashflowPaise, 4450000); // ₹44,500
});

test('Finance Calculations: Unpaid active commitment reserves funds', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 3000000 }); // ₹30,000
  const rent = createCommitment({ id: 'fp_rent', expectedAmountPaise: 1000000, active: true }); // ₹10,000

  // No transactions yet
  const summary = calculateBudgetSummary('2026-10', budget, [], [rent]);

  assert.strictEqual(summary.activeCommitmentsReservedPaise, 1000000); // ₹10,000
  assert.strictEqual(summary.actualUsableBudgetPaise, 2000000); // ₹20,000
  assert.strictEqual(summary.totalActualSpendingPaise, 0);
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 0);
  assert.strictEqual(summary.remainingUsableBudgetPaise, 2000000); // ₹20,000
  assert.strictEqual(summary.commitmentsBreakdown[0].actualPaidPaise, 0);
  assert.strictEqual(summary.commitmentsBreakdown[0].isFulfilled, false);
});

test('Finance Calculations: Single partial payment does NOT double-deduct', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 3000000 }); // ₹30,000
  const rent = createCommitment({ id: 'fp_rent', expectedAmountPaise: 1000000, active: true }); // ₹10,000

  const txs: Transaction[] = [
    createTx({
      amountPaise: 400000, // Partial rent payment ₹4,000 of ₹10,000
      type: 'expense',
      date: '2026-10-05',
      category: 'Housing',
      linkedFixedPaymentId: 'fp_rent',
    }),
    createTx({
      amountPaise: 200000, // Discretionary grocery ₹2,000
      type: 'expense',
      date: '2026-10-06',
      category: 'Food & Dining',
      linkedFixedPaymentId: null,
    }),
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, [rent]);

  assert.strictEqual(summary.activeCommitmentsReservedPaise, 1000000); // ₹10,000
  assert.strictEqual(summary.actualUsableBudgetPaise, 2000000); // ₹20,000
  assert.strictEqual(summary.totalActualSpendingPaise, 600000); // ₹4,000 + ₹2,000 = ₹6,000
  // Crucial ADR-02 check: The ₹4,000 partial payment is covered by the ₹10,000 reservation.
  // It must NOT be added to discretionary spending!
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 200000); // Only grocery ₹2,000
  assert.strictEqual(summary.remainingUsableBudgetPaise, 1800000); // ₹20,000 - ₹2,000 = ₹18,000

  assert.strictEqual(summary.commitmentsBreakdown[0].actualPaidPaise, 400000);
  assert.strictEqual(summary.commitmentsBreakdown[0].isFulfilled, false);
  assert.strictEqual(summary.commitmentsBreakdown[0].excessPaidPaise, 0);
});

test('Finance Calculations: Multiple partial payments do NOT double-deduct', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 3000000 }); // ₹30,000
  const rent = createCommitment({ id: 'fp_rent', expectedAmountPaise: 1000000, active: true }); // ₹10,000

  const txs: Transaction[] = [
    createTx({
      amountPaise: 300000, // Part 1: ₹3,000
      type: 'expense',
      date: '2026-10-02',
      linkedFixedPaymentId: 'fp_rent',
    }),
    createTx({
      amountPaise: 400000, // Part 2: ₹4,000 (total linked = ₹7,000 <= ₹10,000)
      type: 'expense',
      date: '2026-10-10',
      linkedFixedPaymentId: 'fp_rent',
    }),
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, [rent]);

  assert.strictEqual(summary.activeCommitmentsReservedPaise, 1000000);
  assert.strictEqual(summary.actualUsableBudgetPaise, 2000000);
  assert.strictEqual(summary.totalActualSpendingPaise, 700000);
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 0); // No excess!
  assert.strictEqual(summary.remainingUsableBudgetPaise, 2000000); // Entire ₹20,000 usable remains
  assert.strictEqual(summary.commitmentsBreakdown[0].actualPaidPaise, 700000);
  assert.strictEqual(summary.commitmentsBreakdown[0].isFulfilled, false);
});

test('Finance Calculations: Exact commitment payment fulfills obligation without discretionary impact', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 4000000 }); // ₹40,000
  const rent = createCommitment({ id: 'fp_rent', expectedAmountPaise: 1500000, active: true }); // ₹15,000

  const txs: Transaction[] = [
    createTx({
      amountPaise: 1500000, // Exact ₹15,000 payment
      type: 'expense',
      date: '2026-10-05',
      linkedFixedPaymentId: 'fp_rent',
    }),
    createTx({
      amountPaise: 300000, // ₹3,000 unlinked
      type: 'expense',
      date: '2026-10-06',
      linkedFixedPaymentId: null,
    }),
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, [rent]);

  assert.strictEqual(summary.activeCommitmentsReservedPaise, 1500000);
  assert.strictEqual(summary.actualUsableBudgetPaise, 2500000); // ₹25,000
  assert.strictEqual(summary.totalActualSpendingPaise, 1800000); // ₹18,000
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 300000); // ₹3,000
  assert.strictEqual(summary.remainingUsableBudgetPaise, 2200000); // ₹22,000
  assert.strictEqual(summary.commitmentsBreakdown[0].isFulfilled, true);
  assert.strictEqual(summary.commitmentsBreakdown[0].excessPaidPaise, 0);
});

test('Finance Calculations: Excess payment on active commitment counts only excess as discretionary', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 3500000 }); // ₹35,000
  const electricity = createCommitment({
    id: 'fp_elec',
    name: 'Electricity',
    expectedAmountPaise: 200000, // ₹2,000 expected
    active: true,
  });

  const txs: Transaction[] = [
    createTx({
      amountPaise: 280000, // Actual bill was ₹2,800 (excess = ₹800)
      type: 'expense',
      date: '2026-10-08',
      category: 'Utilities & Bills',
      linkedFixedPaymentId: 'fp_elec',
    }),
    createTx({
      amountPaise: 500000, // Unlinked shopping ₹5,000
      type: 'expense',
      date: '2026-10-12',
      category: 'Personal & Leisure',
      linkedFixedPaymentId: null,
    }),
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, [electricity]);

  assert.strictEqual(summary.activeCommitmentsReservedPaise, 200000); // ₹2,000
  assert.strictEqual(summary.actualUsableBudgetPaise, 3300000); // ₹33,000
  assert.strictEqual(summary.totalActualSpendingPaise, 780000); // ₹2,800 + ₹5,000 = ₹7,800

  // Excess = 2,800 - 2,000 = ₹800 (80,000 paise). Total discretionary = 5,000 + 800 = ₹5,800 (580,000 paise)
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 580000);
  assert.strictEqual(summary.remainingUsableBudgetPaise, 2720000); // 33,000 - 5,800 = ₹27,200

  assert.strictEqual(summary.commitmentsBreakdown[0].actualPaidPaise, 280000);
  assert.strictEqual(summary.commitmentsBreakdown[0].isFulfilled, true);
  assert.strictEqual(summary.commitmentsBreakdown[0].excessPaidPaise, 80000);
});

test('Finance Calculations: Inactive commitment with linked payments counts fully as discretionary', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 2000000 }); // ₹20,000
  const gym = createCommitment({
    id: 'fp_gym',
    name: 'Gym Membership',
    expectedAmountPaise: 150000, // ₹1,500 expected
    active: false, // Inactive!
  });

  const txs: Transaction[] = [
    createTx({
      amountPaise: 150000, // Linked to inactive commitment
      type: 'expense',
      date: '2026-10-03',
      linkedFixedPaymentId: 'fp_gym',
    }),
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, [gym]);

  // Inactive commitment reserves ₹0!
  assert.strictEqual(summary.activeCommitmentsReservedPaise, 0);
  assert.strictEqual(summary.actualUsableBudgetPaise, 2000000);
  assert.strictEqual(summary.totalActualSpendingPaise, 150000);

  // Because it had 0 reservation, payment counts fully as discretionary spending
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 150000);
  assert.strictEqual(summary.remainingUsableBudgetPaise, 1850000); // 20,000 - 1,500 = ₹18,500

  // Verify breakdown accurately tracks the paid amount for the inactive commitment
  assert.strictEqual(summary.commitmentsBreakdown[0].actualPaidPaise, 150000);
  assert.strictEqual(summary.commitmentsBreakdown[0].isFulfilled, true);
});

test('Finance Calculations: Unknown or deleted commitment link counts fully as discretionary', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 2000000 }); // ₹20,000
  const txs: Transaction[] = [
    createTx({
      amountPaise: 50000,
      type: 'expense',
      date: '2026-10-04',
      linkedFixedPaymentId: 'fp_deleted_id', // Not in commitments array
    }),
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, []);

  assert.strictEqual(summary.activeCommitmentsReservedPaise, 0);
  assert.strictEqual(summary.actualUsableBudgetPaise, 2000000);
  assert.strictEqual(summary.totalActualSpendingPaise, 50000);
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 50000);
  assert.strictEqual(summary.remainingUsableBudgetPaise, 1950000);
});

test('Finance Calculations: Complex month with multiple active and inactive commitments', () => {
  // Budget ₹50,000
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 5000000 });

  const cRent = createCommitment({ id: 'c_rent', name: 'Rent', expectedAmountPaise: 1500000, active: true }); // ₹15,000 expected
  const cElec = createCommitment({ id: 'c_elec', name: 'Electric', expectedAmountPaise: 200000, active: true }); // ₹2,000 expected
  const cNet = createCommitment({ id: 'c_net', name: 'Internet', expectedAmountPaise: 100000, active: true }); // ₹1,000 expected
  const cSub = createCommitment({ id: 'c_sub', name: 'Old Gym', expectedAmountPaise: 150000, active: false }); // Inactive

  const txs: Transaction[] = [
    createTx({ amountPaise: 1500000, type: 'expense', date: '2026-10-01', linkedFixedPaymentId: 'c_rent' }), // Exact ₹15,000
    createTx({ amountPaise: 250000, type: 'expense', date: '2026-10-05', linkedFixedPaymentId: 'c_elec' }), // ₹2,500 (excess ₹500)
    createTx({ amountPaise: 60000, type: 'expense', date: '2026-10-10', linkedFixedPaymentId: 'c_net' }), // ₹600 partial (₹400 unpaid)
    createTx({ amountPaise: 150000, type: 'expense', date: '2026-10-12', linkedFixedPaymentId: 'c_sub' }), // ₹1,500 inactive
    createTx({ amountPaise: 400000, type: 'expense', date: '2026-10-15', linkedFixedPaymentId: null }), // ₹4,000 unlinked
    createTx({ amountPaise: 8000000, type: 'income', date: '2026-10-01' }), // ₹80,000 income
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, [cRent, cElec, cNet, cSub]);

  // Active reservations: Rent ₹15,000 + Elec ₹2,000 + Net ₹1,000 = ₹18,000
  assert.strictEqual(summary.activeCommitmentsReservedPaise, 1800000);
  // Actual usable budget: ₹50,000 - ₹18,000 = ₹32,000
  assert.strictEqual(summary.actualUsableBudgetPaise, 3200000);
  // Total actual spending: 15,000 + 2,500 + 600 + 1,500 + 4,000 = ₹23,600
  assert.strictEqual(summary.totalActualSpendingPaise, 2360000);

  // Eligible discretionary:
  // - unlinked: ₹4,000
  // - inactive cSub: ₹1,500
  // - cElec excess: ₹500
  // - cRent excess: 0
  // - cNet excess: 0
  // Total discretionary = 4,000 + 1,500 + 500 = ₹6,000
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 600000);

  // Remaining usable budget: ₹32,000 - ₹6,000 = ₹26,000
  assert.strictEqual(summary.remainingUsableBudgetPaise, 2600000);

  // Net cashflow: 80,000 - 23,600 = ₹56,400
  assert.strictEqual(summary.netCashflowPaise, 5640000);
});

test('Finance Calculations: Income does NOT increase planned spending ceiling', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 1000000 }); // ₹10,000 ceiling
  const txs: Transaction[] = [
    createTx({ amountPaise: 800000, type: 'income', date: '2026-10-01' }), // ₹8,000 income
    createTx({ amountPaise: 500000, type: 'expense', date: '2026-10-02' }), // ₹5,000 expense
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, []);

  // Budget ceiling remains ₹10,000; it must NOT become ₹18,000!
  assert.strictEqual(summary.totalPlannedBudgetPaise, 1000000);
  assert.strictEqual(summary.actualUsableBudgetPaise, 1000000);
  assert.strictEqual(summary.remainingUsableBudgetPaise, 500000); // 10,000 - 5,000 = ₹5,000

  // Income reflected in totalIncome and netCashflow
  assert.strictEqual(summary.totalIncomePaise, 800000);
  assert.strictEqual(summary.netCashflowPaise, 300000); // 8,000 - 5,000 = ₹3,000
});

test('Finance Calculations: Overspending preserves negative remaining budget', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 1000000 }); // ₹10,000
  const txs: Transaction[] = [
    createTx({ amountPaise: 1400000, type: 'expense', date: '2026-10-15' }), // ₹14,000 spent
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, []);

  assert.strictEqual(summary.remainingUsableBudgetPaise, -400000); // -₹4,000
  assert.strictEqual(summary.netCashflowPaise, -1400000);
});

test('Finance Calculations: Transactions outside selected month are ignored', () => {
  const budget = createBudget({ month: '2026-10', totalBudgetPaise: 2000000 });
  const txs: Transaction[] = [
    createTx({ amountPaise: 500000, type: 'expense', date: '2026-09-30' }), // September (ignored)
    createTx({ amountPaise: 300000, type: 'expense', date: '2026-10-05' }), // October (counted)
    createTx({ amountPaise: 400000, type: 'expense', date: '2026-11-01' }), // November (ignored)
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, []);

  assert.strictEqual(summary.totalActualSpendingPaise, 300000);
  assert.strictEqual(summary.remainingUsableBudgetPaise, 1700000);
});

test('Finance Calculations: Category limit comparison counts all expenses in category', () => {
  const budget = createBudget({
    month: '2026-10',
    totalBudgetPaise: 5000000,
    categoryLimitsJson: JSON.stringify({
      'Food & Dining': 1000000, // ₹10,000 limit
      'Housing': 1500000, // ₹15,000 limit
    }),
  });

  const rent = createCommitment({ id: 'fp_rent', category: 'Housing', expectedAmountPaise: 1500000 });

  const txs: Transaction[] = [
    createTx({ amountPaise: 1200000, type: 'expense', date: '2026-10-02', category: 'Food & Dining' }), // ₹12,000 (over limit by ₹2,000)
    createTx({ amountPaise: 1500000, type: 'expense', date: '2026-10-05', category: 'Housing', linkedFixedPaymentId: 'fp_rent' }), // ₹15,000 (at limit)
    createTx({ amountPaise: 300000, type: 'expense', date: '2026-10-10', category: 'Transportation' }), // ₹3,000 (no limit set)
  ];

  const summary = calculateBudgetSummary('2026-10', budget, txs, [rent]);

  const foodCat = summary.categoryBreakdown.find((c) => c.category === 'Food & Dining');
  assert.ok(foodCat);
  assert.strictEqual(foodCat.actualSpentPaise, 1200000);
  assert.strictEqual(foodCat.limitPaise, 1000000);
  assert.strictEqual(foodCat.isOverLimit, true);
  assert.strictEqual(foodCat.remainingPaise, -200000); // -₹2,000 over

  const housingCat = summary.categoryBreakdown.find((c) => c.category === 'Housing');
  assert.ok(housingCat);
  assert.strictEqual(housingCat.actualSpentPaise, 1500000);
  assert.strictEqual(housingCat.limitPaise, 1500000);
  assert.strictEqual(housingCat.isOverLimit, false);
  assert.strictEqual(housingCat.remainingPaise, 0);

  const transitCat = summary.categoryBreakdown.find((c) => c.category === 'Transportation');
  assert.ok(transitCat);
  assert.strictEqual(transitCat.actualSpentPaise, 300000);
  assert.strictEqual(transitCat.limitPaise, null);
  assert.strictEqual(transitCat.isOverLimit, false);
  assert.strictEqual(transitCat.remainingPaise, null);
});
