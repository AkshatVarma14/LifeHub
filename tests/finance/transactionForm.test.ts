import test from 'node:test';
import assert from 'node:assert';

import {
  getInitialTransactionFormData,
  validateAndMapTransactionForm,
} from '../../src/features/finance/utils/transactionForm.ts';
import type { Transaction } from '../../src/types/finance.ts';
import { getCurrentMonthString, getTodayDateString } from '../../src/utils/date.ts';

test('Transaction Form: getInitialTransactionFormData for new and existing transactions', () => {
  const currentMonth = getCurrentMonthString();
  const today = getTodayDateString();

  // 1. New transaction in current month
  const newCurrent = getInitialTransactionFormData(null, currentMonth);
  assert.strictEqual(newCurrent.type, 'expense');
  assert.strictEqual(newCurrent.amount, '');
  assert.strictEqual(newCurrent.category, 'Housing');
  assert.strictEqual(newCurrent.date, today);
  assert.strictEqual(newCurrent.description, '');

  // 2. New transaction in past/future month
  const newPast = getInitialTransactionFormData(null, '2025-06');
  assert.strictEqual(newPast.date, '2025-06-01');

  // 3. Existing transaction pre-filling
  const existing: Transaction = {
    id: 'tx-100',
    amountPaise: 45050, // ₹450.50
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-15',
    description: 'Grocery Shopping',
    linkedFixedPaymentId: null,
    createdAt: '2026-10-15T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  };

  const initialExisting = getInitialTransactionFormData(existing, '2026-10');
  assert.strictEqual(initialExisting.type, 'expense');
  assert.strictEqual(initialExisting.amount, '450.50');
  assert.strictEqual(initialExisting.category, 'Food & Dining');
  assert.strictEqual(initialExisting.date, '2026-10-15');
  assert.strictEqual(initialExisting.description, 'Grocery Shopping');
});

test('Transaction Form: validateAndMapTransactionForm valid cases and description fallback', () => {
  // 1. Valid expense with explicit description
  const validExpense = validateAndMapTransactionForm({
    type: 'expense',
    amount: '1250.75',
    category: 'Transportation',
    date: '2026-10-12',
    description: 'Metro Pass Recharge',
  });

  assert.strictEqual(validExpense.isValid, true);
  assert.ok(validExpense.sanitized);
  assert.strictEqual(validExpense.sanitized.amountPaise, 125075);
  assert.strictEqual(validExpense.sanitized.type, 'expense');
  assert.strictEqual(validExpense.sanitized.category, 'Transportation');
  assert.strictEqual(validExpense.sanitized.description, 'Metro Pass Recharge');

  // 2. Valid expense with empty description -> falls back to category name
  const emptyDescExpense = validateAndMapTransactionForm({
    type: 'expense',
    amount: '500',
    category: 'Food & Dining',
    date: '2026-10-12',
    description: '   ',
  });

  assert.strictEqual(emptyDescExpense.isValid, true);
  assert.ok(emptyDescExpense.sanitized);
  assert.strictEqual(emptyDescExpense.sanitized.description, 'Food & Dining');

  // 3. Valid income
  const validIncome = validateAndMapTransactionForm({
    type: 'income',
    amount: '60000',
    category: 'Salary / Wages',
    date: '2026-10-01',
    description: 'Monthly Salary',
  });

  assert.strictEqual(validIncome.isValid, true);
  assert.ok(validIncome.sanitized);
  assert.strictEqual(validIncome.sanitized.amountPaise, 6000000);
  assert.strictEqual(validIncome.sanitized.type, 'income');
  assert.strictEqual(validIncome.sanitized.category, 'Salary / Wages');
});

test('Transaction Form: validateAndMapTransactionForm rejection cases', () => {
  // 1. Invalid amount (empty, negative, non-numeric, >2 decimals)
  const emptyAmount = validateAndMapTransactionForm({
    type: 'expense',
    amount: '',
    category: 'Housing',
    date: '2026-10-12',
    description: 'Rent',
  });
  assert.strictEqual(emptyAmount.isValid, false);

  const negativeAmount = validateAndMapTransactionForm({
    type: 'expense',
    amount: '-100',
    category: 'Housing',
    date: '2026-10-12',
    description: 'Rent',
  });
  assert.strictEqual(negativeAmount.isValid, false);

  const tripleDecimal = validateAndMapTransactionForm({
    type: 'expense',
    amount: '100.555',
    category: 'Housing',
    date: '2026-10-12',
    description: 'Rent',
  });
  assert.strictEqual(tripleDecimal.isValid, false);

  // 2. Category mismatch (income category on expense type)
  const categoryMismatch = validateAndMapTransactionForm({
    type: 'expense',
    amount: '1000',
    category: 'Salary / Wages', // Income category!
    date: '2026-10-12',
    description: 'Test',
  });
  assert.strictEqual(categoryMismatch.isValid, false);
  assert.ok(categoryMismatch.errors.some((e) => e.includes('Invalid expense category')));

  // 3. Invalid calendar date
  const invalidDate = validateAndMapTransactionForm({
    type: 'expense',
    amount: '1000',
    category: 'Housing',
    date: '2026-02-30', // Feb 30 does not exist
    description: 'Test',
  });
  assert.strictEqual(invalidDate.isValid, false);
  assert.ok(invalidDate.errors.some((e) => e.includes('valid calendar date')));

  // 4. Description length > 255
  const longDesc = validateAndMapTransactionForm({
    type: 'expense',
    amount: '1000',
    category: 'Housing',
    date: '2026-10-12',
    description: 'A'.repeat(256),
  });
  assert.strictEqual(longDesc.isValid, false);
  assert.ok(longDesc.errors.some((e) => e.includes('cannot exceed 255 characters')));
});

test('Transaction Form: linked commitment preservation and reset behavior', () => {
  // 1. Initializing from an existing linked transaction preserves linkedFixedPaymentId
  const linkedTx: Transaction = {
    id: 'tx-200',
    amountPaise: 2500000,
    type: 'expense',
    category: 'Housing',
    date: '2026-10-01',
    description: 'Monthly Apartment Rent',
    linkedFixedPaymentId: 'fp-rent-01',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const initialLinked = getInitialTransactionFormData(linkedTx, '2026-10');
  assert.strictEqual(initialLinked.linkedFixedPaymentId, 'fp-rent-01');

  // 2. Mapping valid expense with linkedFixedPaymentId preserves it in sanitized output
  const mappedLinked = validateAndMapTransactionForm(initialLinked);
  assert.strictEqual(mappedLinked.isValid, true);
  assert.ok(mappedLinked.sanitized);
  assert.strictEqual(mappedLinked.sanitized.linkedFixedPaymentId, 'fp-rent-01');

  // 3. Mapping with type 'income' resets linkedFixedPaymentId to null
  const mappedIncomeWithLink = validateAndMapTransactionForm({
    ...initialLinked,
    type: 'income',
    category: 'Freelance',
  });
  assert.strictEqual(mappedIncomeWithLink.isValid, true);
  assert.ok(mappedIncomeWithLink.sanitized);
  assert.strictEqual(mappedIncomeWithLink.sanitized.linkedFixedPaymentId, null);
});

