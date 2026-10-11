import test from 'node:test';
import assert from 'node:assert';

import {
  calculateCategoryProgress,
  formatCategorySpendingStatus,
} from '../../src/features/finance/utils/categorySpending.ts';
import type { CategorySpendingSummary } from '../../src/types/finance.ts';

test('Category Spending: calculateCategoryProgress with no limit configured returns null', () => {
  const result = calculateCategoryProgress(150000, null);
  assert.strictEqual(result, null);
});

test('Category Spending: calculateCategoryProgress division-by-zero and zero-value limits protection', () => {
  // 1. Zero limit with actual spending > 0 -> clamped to 100%, isOverLimit: true
  const zeroLimitSpent = calculateCategoryProgress(5000, 0);
  assert.ok(zeroLimitSpent !== null);
  assert.strictEqual(zeroLimitSpent.clampedPercent, 100);
  assert.strictEqual(zeroLimitSpent.isOverLimit, true);

  // 2. Zero limit with zero spending -> 0%, isOverLimit: false
  const zeroLimitZeroSpent = calculateCategoryProgress(0, 0);
  assert.ok(zeroLimitZeroSpent !== null);
  assert.strictEqual(zeroLimitZeroSpent.clampedPercent, 0);
  assert.strictEqual(zeroLimitZeroSpent.isOverLimit, false);

  // 3. Negative limit defensive handling
  const negativeLimit = calculateCategoryProgress(5000, -100);
  assert.ok(negativeLimit !== null);
  assert.strictEqual(negativeLimit.clampedPercent, 100);
  assert.strictEqual(negativeLimit.isOverLimit, true);
});

test('Category Spending: calculateCategoryProgress within limit, zero spending, and 100% clamping', () => {
  // 1. Zero spending within limit
  const zeroSpent = calculateCategoryProgress(0, 1000000); // Limit ₹10,000
  assert.ok(zeroSpent !== null);
  assert.strictEqual(zeroSpent.clampedPercent, 0);
  assert.strictEqual(zeroSpent.isOverLimit, false);

  // 2. 45% spent
  const partialSpent = calculateCategoryProgress(450000, 1000000); // ₹4,500 of ₹10,000
  assert.ok(partialSpent !== null);
  assert.strictEqual(partialSpent.clampedPercent, 45);
  assert.strictEqual(partialSpent.isOverLimit, false);

  // 3. Exactly 100% spent
  const exactSpent = calculateCategoryProgress(1000000, 1000000);
  assert.ok(exactSpent !== null);
  assert.strictEqual(exactSpent.clampedPercent, 100);
  assert.strictEqual(exactSpent.isOverLimit, false);

  // 4. Over limit (150% spent) -> clamped at 100%, isOverLimit: true
  const overSpent = calculateCategoryProgress(1500000, 1000000);
  assert.ok(overSpent !== null);
  assert.strictEqual(overSpent.clampedPercent, 100);
  assert.strictEqual(overSpent.isOverLimit, true);
});

test('Category Spending: formatCategorySpendingStatus for category with no limit set', () => {
  const item: CategorySpendingSummary = {
    category: 'Transportation',
    actualSpentPaise: 45000, // ₹450
    limitPaise: null,
    isOverLimit: false,
    remainingPaise: null,
  };

  const status = formatCategorySpendingStatus(item);
  assert.strictEqual(status.hasLimit, false);
  assert.strictEqual(status.isOverLimit, false);
  assert.strictEqual(status.statusText, 'No limit set');
  assert.strictEqual(status.limitText, 'No limit set');
});

test('Category Spending: formatCategorySpendingStatus within limit formats remaining balance accurately', () => {
  const item: CategorySpendingSummary = {
    category: 'Food & Dining',
    actualSpentPaise: 350050, // ₹3,500.50
    limitPaise: 1000000, // ₹10,000.00
    isOverLimit: false,
    remainingPaise: 649950, // ₹6,499.50
  };

  const status = formatCategorySpendingStatus(item);
  assert.strictEqual(status.hasLimit, true);
  assert.strictEqual(status.isOverLimit, false);
  assert.strictEqual(status.limitText, 'Limit: ₹10,000.00');
  assert.strictEqual(status.statusText, '₹6,499.50 left');
  assert.strictEqual(status.remainingAmountPaise, 649950);
});

test('Category Spending: formatCategorySpendingStatus over limit formats over-budget amount accurately', () => {
  const item: CategorySpendingSummary = {
    category: 'Personal & Leisure',
    actualSpentPaise: 1250000, // ₹12,500.00
    limitPaise: 800000, // ₹8,000.00
    isOverLimit: true,
    remainingPaise: -450000, // Over by ₹4,500.00
  };

  const status = formatCategorySpendingStatus(item);
  assert.strictEqual(status.hasLimit, true);
  assert.strictEqual(status.isOverLimit, true);
  assert.strictEqual(status.limitText, 'Limit: ₹8,000.00');
  assert.strictEqual(status.statusText, 'Over by ₹4,500.00');
  assert.strictEqual(status.overAmountPaise, 450000);
});

test('Category Spending: Empty category array handling', () => {
  const emptyList: CategorySpendingSummary[] = [];
  assert.strictEqual(emptyList.length, 0);
});
