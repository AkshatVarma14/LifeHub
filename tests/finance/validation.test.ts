import test from 'node:test';
import assert from 'node:assert';
import {
  validateTransactionInput,
  validateBudgetInput,
  validateFixedPaymentInput,
} from '../../src/features/finance/validation.ts';

test('Finance Validation: validateTransactionInput valid cases', () => {
  // Valid expense
  const expenseResult = validateTransactionInput({
    amountPaise: 50000,
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-12',
    description: 'Groceries at supermarket',
  });
  assert.strictEqual(expenseResult.isValid, true);
  assert.strictEqual(expenseResult.errors.length, 0);
  assert.strictEqual(expenseResult.sanitized?.amountPaise, 50000);
  assert.strictEqual(expenseResult.sanitized?.category, 'Food & Dining');

  // Valid income
  const incomeResult = validateTransactionInput({
    amountPaise: 15000000,
    type: 'income',
    category: 'Salary / Wages',
    date: '2026-10-01',
    description: 'Monthly salary',
  });
  assert.strictEqual(incomeResult.isValid, true);
  assert.strictEqual(incomeResult.sanitized?.type, 'income');

  // Valid linked expense
  const linkedResult = validateTransactionInput({
    amountPaise: 1500000,
    type: 'expense',
    category: 'Housing',
    date: '2026-10-05',
    description: 'Rent payment',
    linkedFixedPaymentId: 'fp_rent_1',
  });
  assert.strictEqual(linkedResult.isValid, true);
  assert.strictEqual(linkedResult.sanitized?.linkedFixedPaymentId, 'fp_rent_1');
});

test('Finance Validation: validateTransactionInput invalid cases', () => {
  // Amount <= 0
  const zeroResult = validateTransactionInput({
    amountPaise: 0,
    type: 'expense',
    category: 'Food & Dining',
    date: '2026-10-12',
    description: 'Test',
  });
  assert.strictEqual(zeroResult.isValid, false);
  assert.match(zeroResult.errors[0], /positive integer/i);

  // Incompatible category with type (Income category for expense transaction)
  const wrongCatResult = validateTransactionInput({
    amountPaise: 1000,
    type: 'expense',
    category: 'Salary / Wages', // Income category!
    date: '2026-10-12',
    description: 'Test',
  });
  assert.strictEqual(wrongCatResult.isValid, false);
  assert.match(wrongCatResult.errors[0], /Invalid expense category/i);

  // Incompatible category with type (Expense category for income transaction)
  const wrongIncomeCatResult = validateTransactionInput({
    amountPaise: 1000,
    type: 'income',
    category: 'Food & Dining', // Expense category!
    date: '2026-10-12',
    description: 'Test',
  });
  assert.strictEqual(wrongIncomeCatResult.isValid, false);
  assert.match(wrongIncomeCatResult.errors[0], /Invalid income category/i);

  // Income cannot have linked fixed payment obligation
  const linkedIncomeResult = validateTransactionInput({
    amountPaise: 10000,
    type: 'income',
    category: 'Freelance',
    date: '2026-10-12',
    description: 'Client payment',
    linkedFixedPaymentId: 'fp_rent_1',
  });
  assert.strictEqual(linkedIncomeResult.isValid, false);
  assert.match(linkedIncomeResult.errors[0], /Income transactions cannot be linked/i);

  // Invalid date (April 31)
  const badDateResult = validateTransactionInput({
    amountPaise: 1000,
    type: 'expense',
    category: 'Transportation',
    date: '2026-04-31',
    description: 'Bus ticket',
  });
  assert.strictEqual(badDateResult.isValid, false);
  assert.match(badDateResult.errors[0], /valid calendar date/i);

  // Non-integer floating point paise
  const floatPaiseResult = validateTransactionInput({
    amountPaise: 100.5,
    type: 'expense',
    category: 'Transportation',
    date: '2026-10-12',
    description: 'Bus',
  });
  assert.strictEqual(floatPaiseResult.isValid, false);
  assert.match(floatPaiseResult.errors[0], /positive integer/i);

  // Description length boundaries: 255 chars is allowed, 256 chars is rejected
  const exactly255Desc = 'A'.repeat(255);
  const validLengthResult = validateTransactionInput({
    amountPaise: 1000,
    type: 'expense',
    category: 'Transportation',
    date: '2026-10-12',
    description: exactly255Desc,
  });
  assert.strictEqual(validLengthResult.isValid, true);
  assert.strictEqual(validLengthResult.sanitized?.description.length, 255);

  const over255Desc = 'A'.repeat(256);
  const overLengthResult = validateTransactionInput({
    amountPaise: 1000,
    type: 'expense',
    category: 'Transportation',
    date: '2026-10-12',
    description: over255Desc,
  });
  assert.strictEqual(overLengthResult.isValid, false);
  assert.match(overLengthResult.errors[0], /cannot exceed 255 characters/i);
});

test('Finance Validation: validateBudgetInput valid and invalid cases', () => {
  // Valid budget (positive)
  const validResult = validateBudgetInput({
    month: '2026-10',
    totalBudgetPaise: 5000000,
    categoryLimitsJson: JSON.stringify({ 'Food & Dining': 1500000 }),
  });
  assert.strictEqual(validResult.isValid, true);
  assert.strictEqual(validResult.sanitized?.totalBudgetPaise, 5000000);

  // Configured zero budget is VALID (totalBudgetPaise: 0)
  const zeroBudgetResult = validateBudgetInput({
    month: '2026-10',
    totalBudgetPaise: 0,
  });
  assert.strictEqual(zeroBudgetResult.isValid, true);
  assert.strictEqual(zeroBudgetResult.sanitized?.totalBudgetPaise, 0);

  // Negative budget is INVALID
  const negBudgetResult = validateBudgetInput({
    month: '2026-10',
    totalBudgetPaise: -500,
  });
  assert.strictEqual(negBudgetResult.isValid, false);
  assert.match(negBudgetResult.errors[0], /non-negative integer/i);

  // Invalid month
  const badMonthResult = validateBudgetInput({
    month: '2026-13',
    totalBudgetPaise: 10000,
  });
  assert.strictEqual(badMonthResult.isValid, false);
  assert.match(badMonthResult.errors[0], /valid YYYY-MM format/i);

  // Malformed JSON string in category limits
  const malformedJsonResult = validateBudgetInput({
    month: '2026-10',
    totalBudgetPaise: 10000,
    categoryLimitsJson: '{ not valid json',
  });
  assert.strictEqual(malformedJsonResult.isValid, false);
  assert.match(malformedJsonResult.errors[0], /valid JSON/i);
});

test('Finance Validation: validateFixedPaymentInput valid and invalid cases', () => {
  // Valid commitment
  const validResult = validateFixedPaymentInput({
    name: 'Broadband Internet',
    category: 'Utilities & Bills',
    expectedAmountPaise: 120000,
    dueDay: 15,
    active: true,
  });
  assert.strictEqual(validResult.isValid, true);
  assert.strictEqual(validResult.sanitized?.name, 'Broadband Internet');
  assert.strictEqual(validResult.sanitized?.dueDay, 15);

  // Name length boundary: 100 chars allowed, 101 chars rejected
  const name100 = 'A'.repeat(100);
  const validNameResult = validateFixedPaymentInput({
    name: name100,
    category: 'Housing',
    expectedAmountPaise: 1000,
    dueDay: 1,
  });
  assert.strictEqual(validNameResult.isValid, true);
  assert.strictEqual(validNameResult.sanitized?.name.length, 100);

  const name101 = 'A'.repeat(101);
  const overNameResult = validateFixedPaymentInput({
    name: name101,
    category: 'Housing',
    expectedAmountPaise: 1000,
    dueDay: 1,
  });
  assert.strictEqual(overNameResult.isValid, false);
  assert.match(overNameResult.errors[0], /cannot exceed 100 characters/i);

  // Invalid due day (< 1 or > 31)
  const badDayResult = validateFixedPaymentInput({
    name: 'Rent',
    category: 'Housing',
    expectedAmountPaise: 1500000,
    dueDay: 32,
  });
  assert.strictEqual(badDayResult.isValid, false);
  assert.match(badDayResult.errors[0], /integer between 1 and 31/i);

  // Invalid expected amount (<= 0)
  const zeroAmountResult = validateFixedPaymentInput({
    name: 'Rent',
    category: 'Housing',
    expectedAmountPaise: 0,
    dueDay: 5,
  });
  assert.strictEqual(zeroAmountResult.isValid, false);
  assert.match(zeroAmountResult.errors[0], /positive integer/i);
});
