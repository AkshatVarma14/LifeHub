import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FinanceProvider,
  useFinance,
  useBudgetSummary,
} from '../../src/features/finance/context/FinanceContext.ts';
import { FinanceStore } from '../../src/features/finance/context/FinanceStore.ts';
import { createTestDatabase } from '../helpers/testDatabase.ts';
import {
  SqliteTransactionRepository,
  SqliteBudgetRepository,
  SqliteFixedPaymentRepository,
} from '../../src/features/finance/repositories/index.ts';

test('Finance Context: useFinance and useBudgetSummary throw outside FinanceProvider', () => {
  assert.throws(
    () => {
      useFinance();
    },
    /useFinance must be used within a FinanceProvider/i,
    'useFinance must throw when accessed outside provider'
  );

  assert.throws(
    () => {
      useBudgetSummary();
    },
    /useFinance must be used within a FinanceProvider/i,
    'useBudgetSummary must throw when accessed outside provider'
  );
});

test('Finance Context: FinanceProvider renders children and exposes context via SSR', () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  let capturedMonth: string | null = null;
  function TestConsumer() {
    const finance = useFinance();
    capturedMonth = finance.selectedMonth;
    return React.createElement('div', null, `Month: ${finance.selectedMonth}`);
  }

  const html = renderToStaticMarkup(
    React.createElement(
      FinanceProvider,
      {
        initialMonth: '2026-10',
        transactionRepo: txRepo,
        budgetRepo: budgetRepo,
        fixedPaymentRepo: fpRepo,
      },
      React.createElement(TestConsumer)
    )
  );

  assert.strictEqual(capturedMonth, '2026-10');
  assert.ok(html.includes('Month: 2026-10'));
});

test('Finance Store: Initial state and async data loading lifecycle', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  // Pre-seed some data in SQLite
  await budgetRepo.upsert({ month: '2026-10', totalBudgetPaise: 5000000 });
  await txRepo.create({
    amountPaise: 300000,
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-02',
    description: 'Groceries',
  });

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);

  // 1. Initial synchronous state before load
  const initial = store.getState();
  assert.strictEqual(initial.selectedMonth, '2026-10');
  assert.strictEqual(initial.isLoading, true);
  assert.strictEqual(initial.isMutating, false);
  assert.strictEqual(initial.error, null);
  assert.strictEqual(initial.transactions.length, 0);

  // 2. Load month data
  let listenerFired = 0;
  store.subscribe(() => {
    listenerFired++;
  });

  await store.loadMonthData('2026-10');

  const loaded = store.getState();
  assert.strictEqual(loaded.isLoading, false);
  assert.strictEqual(loaded.error, null);
  assert.strictEqual(loaded.monthlyBudget?.totalBudgetPaise, 5000000);
  assert.strictEqual(loaded.transactions.length, 1);
  assert.strictEqual(loaded.transactions[0].amountPaise, 300000);
  assert.strictEqual(loaded.summary.totalActualSpendingPaise, 300000);
  assert.ok(listenerFired > 0, 'Subscribers must be notified upon load completion');
});

test('Finance Store: Selected month change transitions state and queries new month', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  // Seed October (budget 50k) and November (budget 60k)
  await budgetRepo.upsert({ month: '2026-10', totalBudgetPaise: 5000000 });
  await budgetRepo.upsert({ month: '2026-11', totalBudgetPaise: 6000000 });

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');
  assert.strictEqual(store.getState().monthlyBudget?.totalBudgetPaise, 5000000);

  // Switch to November
  await store.setSelectedMonth('2026-11');
  const novState = store.getState();
  assert.strictEqual(novState.selectedMonth, '2026-11');
  assert.strictEqual(novState.monthlyBudget?.totalBudgetPaise, 6000000);

  // Reject malformed month
  await assert.rejects(
    async () => {
      await store.setSelectedMonth('invalid-month');
    },
    /Invalid month string/i
  );
});

test('Finance Store: Stale request ID discards older out-of-order month loads', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  await budgetRepo.upsert({ month: '2026-10', totalBudgetPaise: 1000000 });
  await budgetRepo.upsert({ month: '2026-11', totalBudgetPaise: 2000000 });

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);

  // Custom delay simulation on budgetRepo
  const originalGetByMonth = budgetRepo.getByMonth.bind(budgetRepo);
  budgetRepo.getByMonth = async (m: string) => {
    if (m === '2026-10') {
      // Artificially delay October
      await new Promise((r) => setTimeout(r, 60));
    }
    return originalGetByMonth(m);
  };

  // Launch slow October load, immediately followed by fast November load
  const slowOct = store.loadMonthData('2026-10');
  const fastNov = store.loadMonthData('2026-11');

  await Promise.all([slowOct, fastNov]);

  // November must remain active; slow October load must have been discarded!
  const finalState = store.getState();
  assert.strictEqual(finalState.selectedMonth, '2026-11');
  assert.strictEqual(finalState.monthlyBudget?.totalBudgetPaise, 2000000);
});

test('Finance Store: Mutation write failure propagates error and does not mutate state', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');

  // Attempt invalid write
  let writeFailed = false;
  try {
    await store.addTransaction({
      amountPaise: -100, // Invalid
      type: 'expense',
      category: 'Housing',
      date: '2026-10-01',
      description: 'Bad',
    });
  } catch (err) {
    writeFailed = true;
  }

  assert.strictEqual(writeFailed, true);
  const state = store.getState();
  assert.strictEqual(state.isMutating, false);
  assert.ok(state.error !== null);
  assert.strictEqual(state.transactions.length, 0);
});

test('Finance Store: Persisted write succeeds even if subsequent refresh fails', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');

  // Make listByMonth fail during the post-write refresh
  let createCalled = false;
  const originalList = txRepo.listByMonth.bind(txRepo);
  txRepo.listByMonth = async (m: string) => {
    if (createCalled) {
      throw new Error('Simulated refresh database error');
    }
    return originalList(m);
  };

  createCalled = true;

  // The write itself should succeed and return the created transaction
  const created = await store.addTransaction({
    amountPaise: 50000,
    type: 'expense',
    category: 'Transportation',
    date: '2026-10-04',
    description: 'Bus Pass',
  });

  assert.strictEqual(created.amountPaise, 50000);
  assert.strictEqual(created.description, 'Bus Pass');

  // Verify write was actually persisted in SQLite
  const inDb = await originalList('2026-10');
  assert.strictEqual(inDb.length, 1);
  assert.strictEqual(inDb[0].id, created.id);

  // Store isMutating reset to false
  assert.strictEqual(store.getState().isMutating, false);
});

test('Finance Store: Full CRUD mutations update state and enforce ADR-02 calculations', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');

  // 1. Set budget
  const budget = await store.setBudget({
    month: '2026-10',
    totalBudgetPaise: 5000000, // ₹50,000
    categoryLimitsJson: JSON.stringify({ Housing: 2000000 }),
  });
  assert.strictEqual(budget.totalBudgetPaise, 5000000);
  assert.strictEqual(store.getState().monthlyBudget?.totalBudgetPaise, 5000000);

  // 2. Add commitment
  const rent = await store.addCommitment({
    name: 'Rent',
    category: 'Housing',
    expectedAmountPaise: 1500000, // ₹15,000
    dueDay: 1,
    active: true,
  });
  assert.strictEqual(store.getState().commitments.length, 1);

  // 3. Add actual transaction paying the rent
  const rentTx = await store.addTransaction({
    amountPaise: 1500000,
    type: 'expense',
    category: 'Housing',
    date: '2026-10-01',
    description: 'October Rent',
    linkedFixedPaymentId: rent.id,
  });
  assert.strictEqual(rentTx.linkedFixedPaymentId, rent.id);

  // 4. Add discretionary expense
  const foodTx = await store.addTransaction({
    amountPaise: 500000, // ₹5,000
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-03',
    description: 'Groceries',
    linkedFixedPaymentId: null,
  });

  // Verify ADR-02 calculations in state summary
  const summary = store.getState().summary;
  assert.strictEqual(summary.totalPlannedBudgetPaise, 5000000); // ₹50,000
  assert.strictEqual(summary.activeCommitmentsReservedPaise, 1500000); // ₹15,000
  assert.strictEqual(summary.actualUsableBudgetPaise, 3500000); // ₹35,000
  assert.strictEqual(summary.totalActualSpendingPaise, 2000000); // ₹20,000
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 500000); // Only groceries ₹5,000!
  assert.strictEqual(summary.remainingUsableBudgetPaise, 3000000); // ₹30,000

  // 5. Update transaction
  const updatedFood = await store.updateTransaction(foodTx.id, {
    amountPaise: 600000, // Updated to ₹6,000
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-03',
    description: 'Groceries & Household',
  });
  assert.strictEqual(updatedFood.amountPaise, 600000);
  assert.strictEqual(store.getState().summary.eligibleDiscretionarySpendingPaise, 600000);

  // 6. Delete transaction
  await store.deleteTransaction(foodTx.id);
  assert.strictEqual(store.getState().transactions.length, 1); // Only rent remains

  // 7. Update commitment
  const updatedRent = await store.updateCommitment(rent.id, {
    name: 'Rent (New Rate)',
    category: 'Housing',
    expectedAmountPaise: 1600000,
    dueDay: 1,
    active: true,
  });
  assert.strictEqual(updatedRent.expectedAmountPaise, 1600000);

  // 8. Delete commitment -> ON DELETE SET NULL triggers on rentTx
  await store.deleteCommitment(rent.id);
  assert.strictEqual(store.getState().commitments.length, 0);
  const remainingTx = store.getState().transactions[0];
  assert.strictEqual(remainingTx.linkedFixedPaymentId, null);

  // 9. Delete budget
  await store.deleteBudget('2026-10');
  assert.strictEqual(store.getState().monthlyBudget, null);
  assert.strictEqual(store.getState().summary.hasConfiguredBudget, false);
});
