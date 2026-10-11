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

test('Finance Store: Deleting nonexistent transaction ID rejects and resets mutation state', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');

  await assert.rejects(
    async () => {
      await store.deleteTransaction('non-existent-tx-id');
    },
    /could not be deleted or was not found/i
  );

  const state = store.getState();
  assert.strictEqual(state.isMutating, false);
  assert.ok(state.error !== null);
  assert.match(state.error.message, /not found/i);
});

test('Finance Store: Post-deletion refresh failure does not report write as failed', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');

  const tx = await store.addTransaction({
    amountPaise: 40000,
    type: 'expense',
    category: 'Personal & Leisure',
    date: '2026-10-10',
    description: 'Movie Ticket',
  });

  assert.strictEqual(store.getState().transactions.length, 1);

  // Force listByMonth to fail on subsequent calls (during post-delete refresh)
  let deleteCalled = false;
  const originalList = txRepo.listByMonth.bind(txRepo);
  txRepo.listByMonth = async (m: string) => {
    if (deleteCalled) {
      throw new Error('Simulated refresh failure after delete');
    }
    return originalList(m);
  };

  deleteCalled = true;

  // deleteTransaction should not throw even if subsequent refresh fails
  await store.deleteTransaction(tx.id);

  // Verify row was deleted in SQLite
  const inDb = await originalList('2026-10');
  assert.strictEqual(inDb.length, 0);

  // Store mutation flag is reset
  assert.strictEqual(store.getState().isMutating, false);
});

test('Finance Store: Deleting linked transaction updates actual spending and commitment fulfillment', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');

  await store.setBudget({
    month: '2026-10',
    totalBudgetPaise: 4000000, // ₹40,000
  });

  const gym = await store.addCommitment({
    name: 'Gym Membership',
    category: 'Healthcare',
    expectedAmountPaise: 200000, // ₹2,000
    dueDay: 10,
    active: true,
  });

  const gymTx = await store.addTransaction({
    amountPaise: 200000,
    type: 'expense',
    category: 'Healthcare',
    date: '2026-10-10',
    description: 'October Gym',
    linkedFixedPaymentId: gym.id,
  });

  let summary = store.getState().summary;
  assert.strictEqual(summary.totalActualSpendingPaise, 200000);
  assert.strictEqual(summary.commitmentsBreakdown[0].actualPaidPaise, 200000);
  assert.strictEqual(summary.commitmentsBreakdown[0].isFulfilled, true);

  // Delete the linked payment transaction
  await store.deleteTransaction(gymTx.id);

  summary = store.getState().summary;
  assert.strictEqual(summary.totalActualSpendingPaise, 0);
  assert.strictEqual(summary.commitmentsBreakdown[0].actualPaidPaise, 0);
  assert.strictEqual(summary.commitmentsBreakdown[0].isFulfilled, false);
  assert.strictEqual(store.getState().transactions.length, 0);

  // Verify parent commitment in fixed_payments is still active and intact
  const parentGym = await fpRepo.getById(gym.id);
  assert.ok(parentGym !== null);
  assert.strictEqual(parentGym.name, 'Gym Membership');
  assert.strictEqual(summary.activeCommitmentsReservedPaise, 200000);
});

test('Finance Store: Setting, updating, clearing, and reloading monthly budget preserves ADR-02 calculations', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');

  // 1. Initial unconfigured state
  assert.strictEqual(store.getState().monthlyBudget, null);
  assert.strictEqual(store.getState().summary.hasConfiguredBudget, false);
  assert.strictEqual(store.getState().summary.totalPlannedBudgetPaise, null);
  assert.strictEqual(store.getState().summary.actualUsableBudgetPaise, null);
  assert.strictEqual(store.getState().summary.remainingUsableBudgetPaise, null);

  // Add an active commitment (₹10,000) and an unlinked expense (₹3,000)
  await store.addCommitment({
    name: 'Broadband',
    category: 'Utilities & Bills',
    expectedAmountPaise: 1000000,
    dueDay: 15,
    active: true,
  });

  await store.addTransaction({
    amountPaise: 300000,
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-05',
    description: 'Groceries',
  });

  // 2. Configure budget to ₹40,000
  await store.setBudget({
    month: '2026-10',
    totalBudgetPaise: 4000000,
  });

  let state = store.getState();
  assert.ok(state.monthlyBudget !== null);
  assert.strictEqual(state.summary.hasConfiguredBudget, true);
  assert.strictEqual(state.summary.totalPlannedBudgetPaise, 4000000);
  assert.strictEqual(state.summary.actualUsableBudgetPaise, 3000000); // 40k - 10k
  assert.strictEqual(state.summary.remainingUsableBudgetPaise, 2700000); // 30k - 3k

  // 3. Update budget to configured zero (₹0.00)
  await store.setBudget({
    month: '2026-10',
    totalBudgetPaise: 0,
  });

  state = store.getState();
  assert.ok(state.monthlyBudget !== null);
  assert.strictEqual(state.summary.hasConfiguredBudget, true);
  assert.strictEqual(state.summary.totalPlannedBudgetPaise, 0);
  assert.strictEqual(state.summary.actualUsableBudgetPaise, -1000000); // 0 - 10k
  assert.strictEqual(state.summary.remainingUsableBudgetPaise, -1300000); // -10k - 3k

  // 4. Persistence check: instantiate a fresh store on same DB
  const reloadedStore = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await reloadedStore.loadMonthData('2026-10');
  const reloadedState = reloadedStore.getState();
  assert.ok(reloadedState.monthlyBudget !== null);
  assert.strictEqual(reloadedState.summary.hasConfiguredBudget, true);
  assert.strictEqual(reloadedState.summary.totalPlannedBudgetPaise, 0);
  assert.strictEqual(reloadedState.summary.actualUsableBudgetPaise, -1000000);

  // 5. Clear budget (delete) -> returns to unconfigured
  await store.deleteBudget('2026-10');

  state = store.getState();
  assert.strictEqual(state.monthlyBudget, null);
  assert.strictEqual(state.summary.hasConfiguredBudget, false);
  assert.strictEqual(state.summary.totalPlannedBudgetPaise, null);
  assert.strictEqual(state.summary.actualUsableBudgetPaise, null);
  assert.strictEqual(state.summary.remainingUsableBudgetPaise, null);

  // 6. Persistence check after deletion
  await reloadedStore.loadMonthData('2026-10');
  assert.strictEqual(reloadedStore.getState().monthlyBudget, null);
  assert.strictEqual(reloadedStore.getState().summary.hasConfiguredBudget, false);
});

test('Finance Store: Budget mutation failure leaves state intact and resets mutation flag', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  const store = new FinanceStore('2026-10', txRepo, budgetRepo, fpRepo);
  await store.loadMonthData('2026-10');

  // Deleting unconfigured budget must reject and reset isMutating
  await assert.rejects(
    async () => {
      await store.deleteBudget('2026-10');
    },
    /could not be deleted or was not found/i
  );

  assert.strictEqual(store.getState().isMutating, false);
  assert.ok(store.getState().error !== null);

  // Setting invalid budget input must reject and reset isMutating
  await assert.rejects(
    async () => {
      await store.setBudget({
        month: 'invalid-month',
        totalBudgetPaise: -500,
      });
    },
    /validation failed/i
  );

  assert.strictEqual(store.getState().isMutating, false);
});

