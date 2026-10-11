/**
 * Category Spending Presentation and Progress Helpers for LifeHub.
 * Stage 1 Slice 4C.1: Read-only Category Spending Reporting.
 * Pure deterministic formatting and progress calculation helpers for category spending.
 */

import type { CategorySpendingSummary } from '../../../types/finance.ts';
import { formatPaiseToINR } from '../../../utils/currency.ts';

export interface CategorySpendingProgress {
  /** Clamped integer percentage between 0 and 100 for visual progress bars */
  clampedPercent: number;
  /** True if actual spending exceeded the configured limit (> 100%) */
  isOverLimit: boolean;
}

export interface CategorySpendingStatusInfo {
  statusText: string;
  limitText: string;
  isOverLimit: boolean;
  hasLimit: boolean;
  overAmountPaise: number;
  remainingAmountPaise: number;
}

/**
 * Calculates visual progress percentage with division-by-zero protection and clamping.
 * Returns null if limitPaise is null (no limit configured).
 */
export function calculateCategoryProgress(
  actualSpentPaise: number,
  limitPaise: number | null
): CategorySpendingProgress | null {
  if (limitPaise === null) {
    return null;
  }

  // Defensive guard for non-positive limit (division by zero protection)
  if (limitPaise <= 0) {
    return {
      clampedPercent: actualSpentPaise > 0 ? 100 : 0,
      isOverLimit: actualSpentPaise > 0,
    };
  }

  if (actualSpentPaise <= 0) {
    return {
      clampedPercent: 0,
      isOverLimit: false,
    };
  }

  const rawPercent = (actualSpentPaise / limitPaise) * 100;
  const clampedPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));
  const isOverLimit = actualSpentPaise > limitPaise;

  return {
    clampedPercent,
    isOverLimit,
  };
}

/**
 * Formats readable status text, limit text, and over/remaining amounts for a category breakdown item.
 */
export function formatCategorySpendingStatus(
  item: CategorySpendingSummary
): CategorySpendingStatusInfo {
  if (item.limitPaise === null) {
    return {
      statusText: 'No limit set',
      limitText: 'No limit set',
      isOverLimit: false,
      hasLimit: false,
      overAmountPaise: 0,
      remainingAmountPaise: 0,
    };
  }

  const limitText = `Limit: ${formatPaiseToINR(item.limitPaise)}`;

  if (item.isOverLimit) {
    // If over limit, remainingPaise is negative
    const overAmountPaise =
      item.remainingPaise !== null
        ? Math.abs(item.remainingPaise)
        : Math.max(0, item.actualSpentPaise - item.limitPaise);

    return {
      statusText: `Over by ${formatPaiseToINR(overAmountPaise)}`,
      limitText,
      isOverLimit: true,
      hasLimit: true,
      overAmountPaise,
      remainingAmountPaise: 0,
    };
  }

  const remainingAmountPaise =
    item.remainingPaise !== null
      ? Math.max(0, item.remainingPaise)
      : Math.max(0, item.limitPaise - item.actualSpentPaise);

  return {
    statusText: `${formatPaiseToINR(remainingAmountPaise)} left`,
    limitText,
    isOverLimit: false,
    hasLimit: true,
    overAmountPaise: 0,
    remainingAmountPaise,
  };
}
