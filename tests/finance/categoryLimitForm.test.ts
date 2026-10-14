import test from 'node:test';
import assert from 'node:assert';

import {
  getInitialCategoryLimitFormData,
  validateCategoryLimitAmount,
} from '../../src/features/finance/utils/categoryLimitForm.ts';
import { MAX_SAFE_PAISE } from '../../src/utils/currency.ts';

test('Category Limit Form: getInitialCategoryLimitFormData defaults and formatting', () => {
  // 1. Completely unconfigured
  const initialDefault = getInitialCategoryLimitFormData();
  assert.strictEqual(initialDefault.category, 'Housing');
  assert.strictEqual(initialDefault.amount, '');

  // 2. Specific category with no limit set
  const initialUnset = getInitialCategoryLimitFormData('Food & Dining', null);
  assert.strictEqual(initialUnset.category, 'Food & Dining');
  assert.strictEqual(initialUnset.amount, '');

  // 3. Category with configured zero limit (0 paise)
  const initialZero = getInitialCategoryLimitFormData('Transportation', 0);
  assert.strictEqual(initialZero.category, 'Transportation');
  assert.strictEqual(initialZero.amount, '0.00');

  // 4. Category with positive limit
  const initialPositive = getInitialCategoryLimitFormData('Healthcare', 1500000); // ₹15,000.00
  assert.strictEqual(initialPositive.category, 'Healthcare');
  assert.strictEqual(initialPositive.amount, '15000.00');

  // 5. Category with fractional paise
  const initialFraction = getInitialCategoryLimitFormData('Personal & Leisure', 350050); // ₹3,500.50
  assert.strictEqual(initialFraction.category, 'Personal & Leisure');
  assert.strictEqual(initialFraction.amount, '3500.50');
});

test('Category Limit Form: validateCategoryLimitAmount valid cases', () => {
  // 1. Standard whole rupee amount
  const wholeResult = validateCategoryLimitAmount('12000');
  assert.strictEqual(wholeResult.isValid, true);
  assert.strictEqual(wholeResult.paise, 1200000);

  // 2. Decimal rupee amount
  const decResult = validateCategoryLimitAmount('450.75');
  assert.strictEqual(decResult.isValid, true);
  assert.strictEqual(decResult.paise, 45075);

  // 3. Amount with symbol and commas
  const symbolResult = validateCategoryLimitAmount('₹10,500.00');
  assert.strictEqual(symbolResult.isValid, true);
  assert.strictEqual(symbolResult.paise, 1050000);

  // 4. Configured zero limits
  const zeroResult = validateCategoryLimitAmount('0');
  assert.strictEqual(zeroResult.isValid, true);
  assert.strictEqual(zeroResult.paise, 0);

  const zeroDecimalResult = validateCategoryLimitAmount('0.00');
  assert.strictEqual(zeroDecimalResult.isValid, true);
  assert.strictEqual(zeroDecimalResult.paise, 0);

  // 5. Safe integer boundary
  const maxSafeRupees = (MAX_SAFE_PAISE / 100).toString();
  const maxResult = validateCategoryLimitAmount(maxSafeRupees);
  assert.strictEqual(maxResult.isValid, true);
  assert.strictEqual(maxResult.paise, MAX_SAFE_PAISE);
});

test('Category Limit Form: validateCategoryLimitAmount invalid and boundary rejection cases', () => {
  // 1. Empty or whitespace
  assert.strictEqual(validateCategoryLimitAmount('').isValid, false);
  assert.strictEqual(validateCategoryLimitAmount('   ').isValid, false);
  assert.strictEqual(validateCategoryLimitAmount(null as unknown as string).isValid, false);

  // 2. Negative amounts
  const negResult = validateCategoryLimitAmount('-100');
  assert.strictEqual(negResult.isValid, false);
  assert.match(negResult.error ?? '', /negative/i);

  const negDecResult = validateCategoryLimitAmount('-0.50');
  assert.strictEqual(negDecResult.isValid, false);
  assert.match(negDecResult.error ?? '', /negative/i);

  // 3. Over-precision (> 2 decimal places)
  const overPrecResult = validateCategoryLimitAmount('10.555');
  assert.strictEqual(overPrecResult.isValid, false);
  assert.match(overPrecResult.error ?? '', /cannot have more than 2 decimal places/i);

  // 4. Non-numeric input
  const nonNumResult = validateCategoryLimitAmount('invalid');
  assert.strictEqual(nonNumResult.isValid, false);
  assert.match(nonNumResult.error ?? '', /invalid/i);

  // 5. Exceeding MAX_SAFE_PAISE
  const overMaxResult = validateCategoryLimitAmount('1000000000001');
  assert.strictEqual(overMaxResult.isValid, false);
  assert.match(overMaxResult.error ?? '', /exceeds maximum/i);
});
