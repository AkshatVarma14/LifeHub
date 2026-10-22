/**
 * Daily Dashboard Aggregation and Formatting Helpers for LifeHub.
 * Stage 1: Daily Dashboard (Slice 7).
 * Pure deterministic functions.
 */

import type { BudgetSummary } from '../../../types/finance.ts';
import type { CalendarEvent } from '../../../types/calendar.ts';
import type { Habit, TimerSession, TimerCalculatedState } from '../../../types/habits.ts';
import {
  formatLocalDateKey,
  formatTimeDisplay,
  formatMonthDisplay,
} from '../../../utils/date.ts';
import { formatPaiseToINR } from '../../../utils/currency.ts';
import { formatTimerDuration } from '../../habits/utils/timerUi.ts';

const FULL_WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Formats a local date string (YYYY-MM-DD) into a full greeting header (e.g. 'Thursday, 22 Oct 2026').
 */
export function formatDashboardHeaderDate(dateStr: string): string {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return dateStr;
  }
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) {
    return dateStr;
  }
  const weekday = FULL_WEEKDAY_NAMES[dateObj.getDay()] ?? '';
  const monthShort = MONTH_NAMES_SHORT[dateObj.getMonth()] ?? '';
  return `${weekday}, ${d} ${monthShort} ${y}`;
}

/**
 * Generates an appropriate time-of-day greeting (e.g. 'Good morning', 'Good afternoon', 'Good evening').
 */
export function getDashboardGreeting(hour: number = new Date().getHours()): string {
  if (hour >= 4 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  if (hour >= 17 && hour < 22) {
    return 'Good evening';
  }
  return 'Hello';
}

export type FinanceStatusType = 'unconfigured' | 'zero_budget' | 'within_budget' | 'over_budget';

export interface FinanceSnapshotModel {
  status: FinanceStatusType;
  statusBadgeText: string;
  monthTitle: string;
  remainingAmountText: string;
  isOverBudget: boolean;
  plannedAmountText: string;
  spendingAmountText: string;
  usableAmountText: string;
}

/**
 * Derives a clean presentation model for the Finance dashboard widget.
 * Strictly adheres to the 4 required budget states and preserves ADR-02 non-double-counting semantics.
 */
export function getFinanceSnapshotModel(summary: BudgetSummary | null): FinanceSnapshotModel {
  if (!summary) {
    return {
      status: 'unconfigured',
      statusBadgeText: 'No Data',
      monthTitle: '',
      remainingAmountText: 'No Data',
      isOverBudget: false,
      plannedAmountText: '₹0',
      spendingAmountText: '₹0',
      usableAmountText: '₹0',
    };
  }

  let monthTitle = summary.month;
  try {
    monthTitle = formatMonthDisplay(summary.month);
  } catch {
    monthTitle = summary.month;
  }

  const spendingAmountText = formatPaiseToINR(summary.totalActualSpendingPaise, { showPaise: false });

  // 1. No budget configured for this month
  if (!summary.hasConfiguredBudget || summary.totalPlannedBudgetPaise === null) {
    return {
      status: 'unconfigured',
      statusBadgeText: 'No Budget Set',
      monthTitle,
      remainingAmountText: 'Not configured',
      isOverBudget: false,
      plannedAmountText: 'Not set',
      spendingAmountText,
      usableAmountText: 'Not set',
    };
  }

  const planned = summary.totalPlannedBudgetPaise;
  const plannedAmountText = formatPaiseToINR(planned, { showPaise: false });
  const usable = summary.actualUsableBudgetPaise ?? 0;
  const usableAmountText = formatPaiseToINR(usable, { showPaise: false });
  const remaining = summary.remainingUsableBudgetPaise ?? 0;

  // 2. Configured budget of zero
  if (planned === 0) {
    const isOver = remaining < 0;
    return {
      status: 'zero_budget',
      statusBadgeText: isOver ? 'Over Budget' : 'Zero Budget',
      monthTitle,
      remainingAmountText: isOver
        ? `Over by ${formatPaiseToINR(Math.abs(remaining), { showPaise: false })}`
        : '₹0 remaining',
      isOverBudget: isOver,
      plannedAmountText,
      spendingAmountText,
      usableAmountText,
    };
  }

  // 3. Over budget (remaining usable budget < 0)
  if (remaining < 0) {
    return {
      status: 'over_budget',
      statusBadgeText: 'Over Budget',
      monthTitle,
      remainingAmountText: `Over by ${formatPaiseToINR(Math.abs(remaining), { showPaise: false })}`,
      isOverBudget: true,
      plannedAmountText,
      spendingAmountText,
      usableAmountText,
    };
  }

  // 4. Within budget (remaining usable budget >= 0)
  return {
    status: 'within_budget',
    statusBadgeText: 'On Track',
    monthTitle,
    remainingAmountText: `${formatPaiseToINR(remaining, { showPaise: false })} left`,
    isOverBudget: false,
    plannedAmountText,
    spendingAmountText,
    usableAmountText,
  };
}

export interface HabitsSnapshotModel {
  totalActive: number;
  completedCount: number;
  percentage: number;
  progressText: string;
  hasActiveTimer: boolean;
  timerType: 'stopwatch' | 'countdown' | null;
  timerStatus: 'running' | 'paused' | null;
  habitName: string | null;
  formattedDuration: string;
  isExpired: boolean;
  timerDisplayText: string;
}

/**
 * Derives a clean presentation model for the Habits and Focus Timer dashboard widget.
 */
export function getHabitsSnapshotModel(
  habits: Habit[] = [],
  isHabitCompletedOnDate: (habitId: string, date: string) => boolean,
  todayDate: string,
  activeTimer: TimerSession | null,
  calculatedTimer: TimerCalculatedState | null
): HabitsSnapshotModel {
  const activeHabits = habits.filter((h) => !h.isArchived);
  const totalActive = activeHabits.length;

  let completedCount = 0;
  for (const h of activeHabits) {
    if (isHabitCompletedOnDate(h.id, todayDate)) {
      completedCount++;
    }
  }

  const percentage = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;
  const progressText =
    totalActive > 0
      ? `${completedCount} of ${totalActive} completed (${percentage}%)`
      : 'No active habits';

  if (!activeTimer) {
    return {
      totalActive,
      completedCount,
      percentage,
      progressText,
      hasActiveTimer: false,
      timerType: null,
      timerStatus: null,
      habitName: null,
      formattedDuration: '00:00',
      isExpired: false,
      timerDisplayText: 'No active session',
    };
  }

  // Active timer details
  let habitName: string | null = null;
  if (activeTimer.habitId) {
    const matched = habits.find((h) => h.id === activeTimer.habitId);
    habitName = matched ? matched.name : null;
  }

  const isStopwatch = activeTimer.type === 'stopwatch';
  const elapsed = calculatedTimer?.elapsedSeconds ?? activeTimer.accumulatedSeconds;
  const remaining = calculatedTimer?.remainingSeconds ?? (activeTimer.targetDurationSeconds ? Math.max(0, activeTimer.targetDurationSeconds - elapsed) : null);
  const isExpired = calculatedTimer?.isExpired ?? (activeTimer.targetDurationSeconds !== null && elapsed >= (activeTimer.targetDurationSeconds ?? 0));

  const isRunning = activeTimer.status === 'running';
  const isPaused = activeTimer.status === 'paused';

  let formattedDuration = '00:00';
  let timerDisplayText = '';

  if (isStopwatch) {
    formattedDuration = formatTimerDuration(elapsed);
    timerDisplayText = isRunning ? `Running (${formattedDuration})` : `Paused (${formattedDuration})`;
  } else {
    // Countdown
    formattedDuration = formatTimerDuration(remaining ?? 0);
    if (isExpired) {
      timerDisplayText = 'Target reached! Tap to complete';
    } else {
      timerDisplayText = isRunning
        ? `Running (${formattedDuration} left)`
        : `Paused (${formattedDuration} left)`;
    }
  }

  return {
    totalActive,
    completedCount,
    percentage,
    progressText,
    hasActiveTimer: true,
    timerType: activeTimer.type,
    timerStatus: isRunning ? 'running' : isPaused ? 'paused' : null,
    habitName,
    formattedDuration,
    isExpired,
    timerDisplayText,
  };
}

export interface DashboardEventItem {
  id: string;
  title: string;
  formattedStartTime: string;
  status: 'pending' | 'completed' | 'cancelled';
  category: string;
}

export interface ScheduleSnapshotModel {
  events: DashboardEventItem[];
  totalTodayEvents: number;
}

/**
 * Derives a chronological list of up to `limit` events scheduled for today.
 */
export function getTodayScheduleModel(
  allEvents: CalendarEvent[] = [],
  todayDate: string,
  limit = 3
): ScheduleSnapshotModel {
  // 1. Filter events matching today's local calendar day
  const todayEvents = allEvents.filter((e) => {
    const eventLocalDate = formatLocalDateKey(e.startTime);
    return eventLocalDate === todayDate;
  });

  // 2. Sort chronologically by startTime ASC
  const sorted = [...todayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 3. Limit to the top N items
  const limited = sorted.slice(0, limit).map((e) => ({
    id: e.id,
    title: e.title,
    formattedStartTime: formatTimeDisplay(e.startTime) || 'All day',
    status: e.status,
    category: e.category,
  }));

  return {
    events: limited,
    totalTodayEvents: todayEvents.length,
  };
}
