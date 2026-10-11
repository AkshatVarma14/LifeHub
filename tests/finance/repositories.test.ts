import test from 'node:test';
import assert from 'node:assert';
import { createTestDatabase } from '../helpers/testDatabase.ts';
import {
  SqliteTransactionRepository,
  SqliteBudgetRepository,
  SqliteFixedPaymentRepository,
} from '../../src/features/finance/repositories/index.ts';

test('Transaction Repository: CRUD operations and constraints', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);

  // 1. Create valid expense transaction
  const createdExpense = await txRepo.create({
    amountPaise: 45000, // ₹450
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-15',
    description: 'Team Lunch',
  });

  assert.strictEqual(typeof createdExpense.id, 'string');
  assert.strictEqual(createdExpense.amountPaise, 45000);
  assert.strictEqual(createdExpense.type, 'expense');
  assert.strictEqual(createdExpense.category, 'Food & Dining');
  assert.strictEqual(createdExpense.date, '2026-10-15');
  assert.strictEqual(createdExpense.description, 'Team Lunch');
  assert.strictEqual(createdExpense.linkedFixedPaymentId, null);

  // 2. Create valid income transaction
  const createdIncome = await txRepo.create({
    amountPaise: 7500000, // ₹75,000
    type: 'income',
    category: 'Salary / Wages',
    date: '2026-10-01',
    description: 'Monthly Salary',
  });

  assert.strictEqual(createdIncome.type, 'income');
  assert.strictEqual(createdIncome.category, 'Salary / Wages');

  // 3. Reject invalid inputs
  await assert.rejects(
    async () => {
      await txRepo.create({
        amountPaise: 0,
        type: 'expense',
        category: 'Food & Dining',
        date: '2026-10-15',
        description: 'Zero',
      });
    },
    /positive integer/i
  );

  await assert.rejects(
    async () => {
      await txRepo.create({
        amountPaise: 1000,
        type: 'expense',
        category: 'Salary / Wages', // Incompatible type/category!
        date: '2026-10-15',
        description: 'Bad Category',
      });
    },
    /Invalid expense category/i
  );

  // 4. Update transaction
  const updated = await txRepo.update(createdExpense.id, {
    amountPaise: 50000, // Updated to ₹500
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-15',
    description: 'Team Lunch with Coffee',
  });

  assert.strictEqual(updated.amountPaise, 50000);
  assert.strictEqual(updated.description, 'Team Lunch with Coffee');

  // 5. Delete transaction
  const deleteResult = await txRepo.delete(createdExpense.id);
  assert.strictEqual(deleteResult, true);
  const fetchAfterDelete = await txRepo.getById(createdExpense.id);
  assert.strictEqual(fetchAfterDelete, null);
});

test('Transaction Repository: Month filtering and date ordering', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);

  // Insert transactions across different months
  await txRepo.create({
    amountPaise: 10000,
    type: 'expense',
    category: 'Transportation',
    date: '2026-09-30', // September
    description: 'Taxi',
  });

  const oct1 = await txRepo.create({
    amountPaise: 20000,
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-05', // October
    description: 'Groceries',
  });

  const oct2 = await txRepo.create({
    amountPaise: 30000,
    type: 'expense',
    category: 'Utilities & Bills',
    date: '2026-10-20', // October (later date)
    description: 'Internet',
  });

  await txRepo.create({
    amountPaise: 40000,
    type: 'expense',
    category: 'Housing',
    date: '2026-11-01', // November
    description: 'Advance',
  });

  // Query October
  const octTransactions = await txRepo.listByMonth('2026-10');
  assert.strictEqual(octTransactions.length, 2);
  // Ordered by date DESC: oct2 (Oct 20) should precede oct1 (Oct 5)
  assert.strictEqual(octTransactions[0].id, oct2.id);
  assert.strictEqual(octTransactions[1].id, oct1.id);
});

test('Transaction Repository: Foreign key enforcement and ON DELETE SET NULL behavior', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  // 1. Create a fixed payment commitment
  const rentCommitment = await fpRepo.create({
    name: 'Apartment Rent',
    category: 'Housing',
    expectedAmountPaise: 1500000, // ₹15,000
    dueDay: 5,
    active: true,
  });

  // 2. Link transaction to the commitment
  const linkedTx = await txRepo.create({
    amountPaise: 1500000,
    type: 'expense',
    category: 'Housing',
    date: '2026-10-05',
    description: 'October Rent Payment',
    linkedFixedPaymentId: rentCommitment.id,
  });

  assert.strictEqual(linkedTx.linkedFixedPaymentId, rentCommitment.id);

  // 3. Linking non-existent commitment throws
  await assert.rejects(
    async () => {
      await txRepo.create({
        amountPaise: 50000,
        type: 'expense',
        category: 'Utilities & Bills',
        date: '2026-10-06',
        description: 'Bill',
        linkedFixedPaymentId: 'non_existent_commitment_id',
      });
    },
    /does not exist/i
  );

  // 4. Delete commitment -> linked transaction's linkedFixedPaymentId must become NULL (ON DELETE SET NULL)
  const deleted = await fpRepo.delete(rentCommitment.id);
  assert.strictEqual(deleted, true);

  const txAfterFpDelete = await txRepo.getById(linkedTx.id);
  assert.ok(txAfterFpDelete !== null);
  assert.strictEqual(
    txAfterFpDelete.linkedFixedPaymentId,
    null,
    'ON DELETE SET NULL must set foreign key to null'
  );
  assert.strictEqual(txAfterFpDelete.amountPaise, 1500000, 'Transaction must not be deleted');

  // 5. Inverse check: deleting a linked transaction must NOT delete its parent commitment
  const wifiCommitment = await fpRepo.create({
    name: 'Home Fiber WiFi',
    category: 'Utilities & Bills',
    expectedAmountPaise: 120000,
    dueDay: 10,
    active: true,
  });

  const wifiTx = await txRepo.create({
    amountPaise: 120000,
    type: 'expense',
    category: 'Utilities & Bills',
    date: '2026-10-10',
    description: 'WiFi Payment',
    linkedFixedPaymentId: wifiCommitment.id,
  });

  const txDeleted = await txRepo.delete(wifiTx.id);
  assert.strictEqual(txDeleted, true);
  assert.strictEqual(await txRepo.getById(wifiTx.id), null);

  const parentStillExists = await fpRepo.getById(wifiCommitment.id);
  assert.ok(parentStillExists !== null, 'Parent commitment must remain intact when linked child transaction is deleted');
  assert.strictEqual(parentStillExists.name, 'Home Fiber WiFi');
});

test('Monthly Budget Repository: CRUD, zero budget preservation, and upsert idempotency', async () => {
  const { executor } = createTestDatabase();
  const budgetRepo = new SqliteBudgetRepository(executor);

  // 1. Missing budget returns null
  const initial = await budgetRepo.getByMonth('2026-10');
  assert.strictEqual(initial, null);

  // 2. Configured zero budget (0 paise) is preserved as a valid distinct budget
  const zeroBudget = await budgetRepo.upsert({
    month: '2026-10',
    totalBudgetPaise: 0,
    categoryLimitsJson: null,
  });

  assert.strictEqual(zeroBudget.month, '2026-10');
  assert.strictEqual(zeroBudget.totalBudgetPaise, 0);

  const fetchedZero = await budgetRepo.getByMonth('2026-10');
  assert.ok(fetchedZero !== null);
  assert.strictEqual(fetchedZero.totalBudgetPaise, 0);

  // 3. Upsert on the same month updates totalBudgetPaise and category limits idempotently
  const limitsJson = JSON.stringify({ Housing: 2000000, 'Food & Dining': 1000000 });
  const updatedBudget = await budgetRepo.upsert({
    month: '2026-10',
    totalBudgetPaise: 5000000, // ₹50,000
    categoryLimitsJson: limitsJson,
  });

  assert.strictEqual(updatedBudget.totalBudgetPaise, 5000000);
  assert.strictEqual(updatedBudget.categoryLimitsJson, limitsJson);

  // Verify only 1 budget row exists for 2026-10
  const allBudgets = await budgetRepo.listAll();
  assert.strictEqual(allBudgets.length, 1);

  // 4. Delete budget
  const deleted = await budgetRepo.deleteByMonth('2026-10');
  assert.strictEqual(deleted, true);
  const afterDelete = await budgetRepo.getByMonth('2026-10');
  assert.strictEqual(afterDelete, null);
});

test('Fixed Payment Repository: CRUD, due day validation, and active status filtering', async () => {
  const { executor } = createTestDatabase();
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  // 1. Create active commitment
  const rent = await fpRepo.create({
    name: 'Rent',
    category: 'Housing',
    expectedAmountPaise: 2000000,
    dueDay: 1,
    active: true,
  });
  assert.strictEqual(rent.active, true);
  assert.strictEqual(rent.dueDay, 1);

  // 2. Create inactive commitment
  const gym = await fpRepo.create({
    name: 'Gym',
    category: 'Personal & Leisure',
    expectedAmountPaise: 200000,
    dueDay: 15,
    active: false,
  });
  assert.strictEqual(gym.active, false);

  // 3. Reject invalid due day (> 31)
  await assert.rejects(
    async () => {
      await fpRepo.create({
        name: 'Bad Day',
        category: 'Housing',
        expectedAmountPaise: 100000,
        dueDay: 32,
      });
    },
    /between 1 and 31/i
  );

  // 4. Filter active vs all
  const all = await fpRepo.listAll();
  assert.strictEqual(all.length, 2);

  const activeOnly = await fpRepo.listActive();
  assert.strictEqual(activeOnly.length, 1);
  assert.strictEqual(activeOnly[0].id, rent.id);

  // 5. Update commitment
  const updatedGym = await fpRepo.update(gym.id, {
    name: 'Gym Reopened',
    category: 'Personal & Leisure',
    expectedAmountPaise: 250000,
    dueDay: 15,
    active: true, // Activated!
  });
  assert.strictEqual(updatedGym.name, 'Gym Reopened');
  assert.strictEqual(updatedGym.active, true);

  const activeAfterUpdate = await fpRepo.listActive();
  assert.strictEqual(activeAfterUpdate.length, 2);
});

test('Transaction Repository: Error handling on update and linked commitment queries', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  // 1. Update non-existent transaction throws
  await assert.rejects(
    async () => {
      await txRepo.update('non_existent_tx_id', {
        amountPaise: 50000,
        type: 'expense',
        category: 'Food & Dining',
        date: '2026-10-10',
        description: 'Ghost',
      });
    },
    /not found/i
  );

  // 2. Update with invalid foreign key throws
  const tx = await txRepo.create({
    amountPaise: 50000,
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-10',
    description: 'Meal',
  });

  await assert.rejects(
    async () => {
      await txRepo.update(tx.id, {
        amountPaise: 50000,
        type: 'expense',
        category: 'Food & Dining',
        date: '2026-10-10',
        description: 'Meal',
        linkedFixedPaymentId: 'invalid_commitment_id',
      });
    },
    /does not exist/i
  );

  // 3. listByLinkedFixedPayment queries
  const c1 = await fpRepo.create({
    name: 'Internet',
    category: 'Utilities & Bills',
    expectedAmountPaise: 100000,
    dueDay: 10,
    active: true,
  });

  await txRepo.update(tx.id, {
    amountPaise: 50000,
    type: 'expense',
    category: 'Utilities & Bills',
    date: '2026-10-10',
    description: 'Internet payment part 1',
    linkedFixedPaymentId: c1.id,
  });

  const linkedList = await txRepo.listByLinkedFixedPayment(c1.id);
  assert.strictEqual(linkedList.length, 1);
  assert.strictEqual(linkedList[0].id, tx.id);

  const emptyList = await txRepo.listByLinkedFixedPayment('non_linked_commitment');
  assert.strictEqual(emptyList.length, 0);
});

test('Repository Edge Cases: Leap year February boundaries and non-existent deletes', async () => {
  const { executor } = createTestDatabase();
  const txRepo = new SqliteTransactionRepository(executor);
  const budgetRepo = new SqliteBudgetRepository(executor);
  const fpRepo = new SqliteFixedPaymentRepository(executor);

  // 1. Leap year 2024 February 29th included in 2024-02 list
  const leapTx = await txRepo.create({
    amountPaise: 150000,
    type: 'expense',
    category: 'Healthcare',
    date: '2024-02-29',
    description: 'Leap Day Health Checkup',
  });

  const febList = await txRepo.listByMonth('2024-02');
  assert.strictEqual(febList.length, 1);
  assert.strictEqual(febList[0].id, leapTx.id);

  // 2. Budget delete on non-existent month returns false
  const budgetDeleted = await budgetRepo.deleteByMonth('2099-01');
  assert.strictEqual(budgetDeleted, false);

  // 3. Commitment update on non-existent id throws
  await assert.rejects(
    async () => {
      await fpRepo.update('non_existent_fp', {
        name: 'Gym',
        category: 'Personal & Leisure',
        expectedAmountPaise: 100000,
        dueDay: 1,
      });
    },
    /not found/i
  );
});
