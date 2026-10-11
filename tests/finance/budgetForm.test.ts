import test from 'node:test';
import assert from 'node:assert';

import {
  getInitialBudgetFormData,
  validateAndMapBudgetForm,
} from '../../src/features/finance/utils/budgetForm.ts';
import type { MonthlyBudget } from '../../src/types/finance.ts';
import { MAX_SAFE_PAISE } from '../../src/utils/currency.ts';

test('Budget Form: getInitialBudgetFormData for unconfigured and configured budgets', () => {
  // 1. Unconfigured budget (null)
  const unconfigured = getInitialBudgetFormData(null);
  assert.strictEqual(unconfigured.amount, '');

  // 2. Unconfigured budget (undefined)
  const undefinedBudget = getInitialBudgetFormData(undefined);
  assert.strictEqual(undefinedBudget.amount, '');

  // 3. Configured zero budget (0 paise)
  const zeroBudget: MonthlyBudget = {
    id: 'budget-zero',
    month: '2026-10',
    totalBudgetPaise: 0,
    categoryLimitsJson: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
  const initialZero = getInitialBudgetFormData(zeroBudget);
  assert.strictEqual(initialZero.amount, '0.00');

  // 4. Configured positive budget (₹45,000.50)
  const positiveBudget: MonthlyBudget = {
    id: 'budget-pos',
    month: '2026-10',
    totalBudgetPaise: 4500050,
    categoryLimitsJson: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
  const initialPos = getInitialBudgetFormData(positiveBudget);
  assert.strictEqual(initialPos.amount, '45000.50');
});

test('Budget Form: validateAndMapBudgetForm valid inputs and categoryLimits preservation', () => {
  // 1. Valid positive amount
  const validPos = validateAndMapBudgetForm({ amount: '50000' }, '2026-10');
  assert.strictEqual(validPos.isValid, true);
  assert.ok(validPos.sanitized);
  assert.strictEqual(validPos.sanitized.month, '2026-10');
  assert.strictEqual(validPos.sanitized.totalBudgetPaise, 5000000);
  assert.strictEqual(validPos.sanitized.categoryLimitsJson, null);

  // 2. Valid with commas and currency prefix
  const validFormatted = validateAndMapBudgetForm({ amount: '₹1,50,000.50' }, '2026-10');
  assert.strictEqual(validFormatted.isValid, true);
  assert.ok(validFormatted.sanitized);
  assert.strictEqual(validFormatted.sanitized.totalBudgetPaise, 15000050);

  // 3. Valid zero amount (both "0" and "0.00")
  const validZero = validateAndMapBudgetForm({ amount: '0' }, '2026-10');
  assert.strictEqual(validZero.isValid, true);
  assert.ok(validZero.sanitized);
  assert.strictEqual(validZero.sanitized.totalBudgetPaise, 0);

  const validZeroDec = validateAndMapBudgetForm({ amount: '0.00' }, '2026-10');
  assert.strictEqual(validZeroDec.isValid, true);
  assert.ok(validZeroDec.sanitized);
  assert.strictEqual(validZeroDec.sanitized.totalBudgetPaise, 0);

  // 4. Preserves existing category limits JSON
  const existingCatLimits = JSON.stringify({ Housing: 2000000, Healthcare: 500000 });
  const withCatLimits = validateAndMapBudgetForm(
    { amount: '60000' },
    '2026-10',
    existingCatLimits
  );
  assert.strictEqual(withCatLimits.isValid, true);
  assert.ok(withCatLimits.sanitized);
  assert.strictEqual(withCatLimits.sanitized.categoryLimitsJson, existingCatLimits);
  assert.strictEqual(withCatLimits.sanitized.totalBudgetPaise, 6000000);
});

test('Budget Form: validateAndMapBudgetForm rejection cases', () => {
  // 1. Empty or whitespace amount
  const emptyRes = validateAndMapBudgetForm({ amount: '' }, '2026-10');
  assert.strictEqual(emptyRes.isValid, false);
  assert.match(emptyRes.errors[0], /please enter a budget amount/i);

  const whitespaceRes = validateAndMapBudgetForm({ amount: '   ' }, '2026-10');
  assert.strictEqual(whitespaceRes.isValid, false);
  assert.match(whitespaceRes.errors[0], /please enter a budget amount/i);

  // 2. Negative amount
  const negativeRes = validateAndMapBudgetForm({ amount: '-500' }, '2026-10');
  assert.strictEqual(negativeRes.isValid, false);
  assert.match(negativeRes.errors[0], /negative/i);

  // 3. Non-numeric
  const nonNumericRes = validateAndMapBudgetForm({ amount: 'fifty-thousand' }, '2026-10');
  assert.strictEqual(nonNumericRes.isValid, false);
  assert.match(nonNumericRes.errors[0], /invalid numeric format/i);

  // 4. More than 2 decimal places
  const overPrecisionRes = validateAndMapBudgetForm({ amount: '100.555' }, '2026-10');
  assert.strictEqual(overPrecisionRes.isValid, false);
  assert.match(overPrecisionRes.errors[0], /more than 2 decimal places/i);

  // 5. Exceeding MAX_SAFE_PAISE
  const excessiveRes = validateAndMapBudgetForm({ amount: '20000000000' }, '2026-10');
  assert.strictEqual(excessiveRes.isValid, false);
  assert.match(excessiveRes.errors[0], /exceed/i);

  // 6. Invalid target month
  const invalidMonthRes = validateAndMapBudgetForm({ amount: '1000' }, '2026-13');
  assert.strictEqual(invalidMonthRes.isValid, false);
  assert.match(invalidMonthRes.errors[0], /valid yyyy-mm format/i);
});
