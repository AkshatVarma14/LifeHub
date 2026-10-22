import test from 'node:test';
import assert from 'node:assert';
import {
  formatDashboardHeaderDate,
  getDashboardGreeting,
  getFinanceSnapshotModel,
  getHabitsSnapshotModel,
  getTodayScheduleModel,
} from '../../src/features/dashboard/utils/dashboardHelpers.ts';
import type { BudgetSummary } from '../../src/types/finance.ts';
import type { Habit, TimerSession, TimerCalculatedState } from '../../src/types/habits.ts';
import type { CalendarEvent } from '../../src/types/calendar.ts';

test('Dashboard Helpers: Date header and greeting formatting', () => {
  // Full weekday, day, short month, year
  assert.strictEqual(formatDashboardHeaderDate('2026-10-22'), 'Thursday, 22 Oct 2026');
  assert.strictEqual(formatDashboardHeaderDate('2026-01-01'), 'Thursday, 1 Jan 2026');
  assert.strictEqual(formatDashboardHeaderDate('2024-02-29'), 'Thursday, 29 Feb 2024'); // Leap year
  assert.strictEqual(formatDashboardHeaderDate('2025-12-31'), 'Wednesday, 31 Dec 2025');

  // Time-of-day greetings
  assert.strictEqual(getDashboardGreeting(8), 'Good morning');
  assert.strictEqual(getDashboardGreeting(11), 'Good morning');
  assert.strictEqual(getDashboardGreeting(12), 'Good afternoon');
  assert.strictEqual(getDashboardGreeting(15), 'Good afternoon');
  assert.strictEqual(getDashboardGreeting(17), 'Good evening');
  assert.strictEqual(getDashboardGreeting(21), 'Good evening');
  assert.strictEqual(getDashboardGreeting(23), 'Hello');
});

test('Dashboard Helpers: Finance snapshot presentation across 4 required states', () => {
  // 1. No budget configured
  const unconfiguredSummary: BudgetSummary = {
    month: '2026-10',
    hasConfiguredBudget: false,
    totalPlannedBudgetPaise: null,
    activeCommitmentsReservedPaise: 0,
    actualUsableBudgetPaise: null,
    totalActualSpendingPaise: 450000, // ₹4,500 spent without budget
    eligibleDiscretionarySpendingPaise: 450000,
    remainingUsableBudgetPaise: null,
    totalIncomePaise: 0,
    netCashflowPaise: -450000,
    commitmentsBreakdown: [],
    categoryBreakdown: [],
  };

  const modelUnconfigured = getFinanceSnapshotModel(unconfiguredSummary);
  assert.strictEqual(modelUnconfigured.status, 'unconfigured');
  assert.strictEqual(modelUnconfigured.statusBadgeText, 'No Budget Set');
  assert.strictEqual(modelUnconfigured.remainingAmountText, 'Not configured');
  assert.strictEqual(modelUnconfigured.isOverBudget, false);
  assert.strictEqual(modelUnconfigured.spendingAmountText, '₹4,500');

  // 2. Configured budget of zero (zero spending)
  const zeroBudgetClean: BudgetSummary = {
    month: '2026-10',
    hasConfiguredBudget: true,
    totalPlannedBudgetPaise: 0,
    activeCommitmentsReservedPaise: 0,
    actualUsableBudgetPaise: 0,
    totalActualSpendingPaise: 0,
    eligibleDiscretionarySpendingPaise: 0,
    remainingUsableBudgetPaise: 0,
    totalIncomePaise: 0,
    netCashflowPaise: 0,
    commitmentsBreakdown: [],
    categoryBreakdown: [],
  };

  const modelZeroClean = getFinanceSnapshotModel(zeroBudgetClean);
  assert.strictEqual(modelZeroClean.status, 'zero_budget');
  assert.strictEqual(modelZeroClean.statusBadgeText, 'Zero Budget');
  assert.strictEqual(modelZeroClean.remainingAmountText, '₹0 remaining');
  assert.strictEqual(modelZeroClean.isOverBudget, false);

  // 2b. Configured budget of zero with overspending
  const zeroBudgetOver: BudgetSummary = {
    ...zeroBudgetClean,
    totalActualSpendingPaise: 120000, // ₹1,200
    eligibleDiscretionarySpendingPaise: 120000,
    remainingUsableBudgetPaise: -120000,
  };
  const modelZeroOver = getFinanceSnapshotModel(zeroBudgetOver);
  assert.strictEqual(modelZeroOver.status, 'zero_budget');
  assert.strictEqual(modelZeroOver.statusBadgeText, 'Over Budget');
  assert.strictEqual(modelZeroOver.remainingAmountText, 'Over by ₹1,200');
  assert.strictEqual(modelZeroOver.isOverBudget, true);

  // 3. Within budget
  const withinBudgetSummary: BudgetSummary = {
    month: '2026-10',
    hasConfiguredBudget: true,
    totalPlannedBudgetPaise: 5000000, // ₹50,000
    activeCommitmentsReservedPaise: 1500000, // ₹15,000
    actualUsableBudgetPaise: 3500000, // ₹35,000
    totalActualSpendingPaise: 2000000, // ₹20,000
    eligibleDiscretionarySpendingPaise: 2000000,
    remainingUsableBudgetPaise: 1500000, // ₹15,000 left
    totalIncomePaise: 6000000,
    netCashflowPaise: 4000000,
    commitmentsBreakdown: [],
    categoryBreakdown: [],
  };

  const modelWithin = getFinanceSnapshotModel(withinBudgetSummary);
  assert.strictEqual(modelWithin.status, 'within_budget');
  assert.strictEqual(modelWithin.statusBadgeText, 'On Track');
  assert.strictEqual(modelWithin.remainingAmountText, '₹15,000 left');
  assert.strictEqual(modelWithin.isOverBudget, false);
  assert.strictEqual(modelWithin.plannedAmountText, '₹50,000');
  assert.strictEqual(modelWithin.usableAmountText, '₹35,000');

  // 4. Over budget
  const overBudgetSummary: BudgetSummary = {
    ...withinBudgetSummary,
    totalActualSpendingPaise: 4000000,
    eligibleDiscretionarySpendingPaise: 4000000,
    remainingUsableBudgetPaise: -500000, // Over by ₹5,000
  };

  const modelOver = getFinanceSnapshotModel(overBudgetSummary);
  assert.strictEqual(modelOver.status, 'over_budget');
  assert.strictEqual(modelOver.statusBadgeText, 'Over Budget');
  assert.strictEqual(modelOver.remainingAmountText, 'Over by ₹5,000');
  assert.strictEqual(modelOver.isOverBudget, true);

  // Null summary fallback
  const modelNull = getFinanceSnapshotModel(null);
  assert.strictEqual(modelNull.status, 'unconfigured');
  assert.strictEqual(modelNull.remainingAmountText, 'No Data');
});

test('Dashboard Helpers: Habit completion summary and progress tracking', () => {
  const sampleHabits: Habit[] = [
    {
      id: 'h1',
      name: 'Drink Water',
      description: null,
      isArchived: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'h2',
      name: 'Morning Walk',
      description: null,
      isArchived: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'h3',
      name: 'Read 20 Pages',
      description: null,
      isArchived: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'h4',
      name: 'Old Archived Habit',
      description: null,
      isArchived: true, // Should be ignored
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  // 1. Zero active habits
  const zeroModel = getHabitsSnapshotModel([], () => false, '2026-10-22', null, null);
  assert.strictEqual(zeroModel.totalActive, 0);
  assert.strictEqual(zeroModel.completedCount, 0);
  assert.strictEqual(zeroModel.percentage, 0);
  assert.strictEqual(zeroModel.progressText, 'No active habits');

  // 2. Partial completions (1 of 3 active completed)
  const isCompleted1 = (id: string, date: string) => id === 'h1' && date === '2026-10-22';
  const partialModel = getHabitsSnapshotModel(sampleHabits, isCompleted1, '2026-10-22', null, null);
  assert.strictEqual(partialModel.totalActive, 3);
  assert.strictEqual(partialModel.completedCount, 1);
  assert.strictEqual(partialModel.percentage, 33);
  assert.strictEqual(partialModel.progressText, '1 of 3 completed (33%)');

  // 3. Full completions (3 of 3 active completed; archived h4 ignored)
  const isCompletedAll = (id: string) => ['h1', 'h2', 'h3', 'h4'].includes(id);
  const fullModel = getHabitsSnapshotModel(sampleHabits, isCompletedAll, '2026-10-22', null, null);
  assert.strictEqual(fullModel.totalActive, 3);
  assert.strictEqual(fullModel.completedCount, 3);
  assert.strictEqual(fullModel.percentage, 100);
  assert.strictEqual(fullModel.progressText, '3 of 3 completed (100%)');
});

test('Dashboard Helpers: Focus Timer widget presentation for running, paused, expired, and inactive states', () => {
  const habits: Habit[] = [
    {
      id: 'h1',
      name: 'Deep Work',
      description: null,
      isArchived: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];

  // 1. Inactive timer
  const inactiveModel = getHabitsSnapshotModel(habits, () => false, '2026-10-22', null, null);
  assert.strictEqual(inactiveModel.hasActiveTimer, false);
  assert.strictEqual(inactiveModel.timerDisplayText, 'No active session');

  // 2. Running Stopwatch session
  const runningSw: TimerSession = {
    id: 't1',
    habitId: 'h1',
    type: 'stopwatch',
    status: 'running',
    startedAt: '2026-10-22T10:00:00.000Z',
    targetDurationSeconds: null,
    accumulatedSeconds: 320,
    currentSegmentStartedAt: '2026-10-22T10:05:20.000Z',
    endedAt: null,
    notes: null,
    createdAt: '2026-10-22T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z',
  };
  const swCalc: TimerCalculatedState = {
    elapsedSeconds: 320,
    remainingSeconds: null,
    isExpired: false,
  };
  const swModel = getHabitsSnapshotModel(habits, () => false, '2026-10-22', runningSw, swCalc);
  assert.strictEqual(swModel.hasActiveTimer, true);
  assert.strictEqual(swModel.timerType, 'stopwatch');
  assert.strictEqual(swModel.timerStatus, 'running');
  assert.strictEqual(swModel.habitName, 'Deep Work');
  assert.strictEqual(swModel.formattedDuration, '05:20');
  assert.strictEqual(swModel.timerDisplayText, 'Running (05:20)');

  // 3. Paused Stopwatch session
  const pausedSw: TimerSession = {
    ...runningSw,
    status: 'paused',
    currentSegmentStartedAt: null,
  };
  const pausedSwModel = getHabitsSnapshotModel(habits, () => false, '2026-10-22', pausedSw, swCalc);
  assert.strictEqual(pausedSwModel.timerStatus, 'paused');
  assert.strictEqual(pausedSwModel.timerDisplayText, 'Paused (05:20)');

  // 4. Running Countdown session
  const runningCd: TimerSession = {
    id: 't2',
    habitId: null,
    type: 'countdown',
    status: 'running',
    startedAt: '2026-10-22T10:00:00.000Z',
    targetDurationSeconds: 1500, // 25 min
    accumulatedSeconds: 300,
    currentSegmentStartedAt: '2026-10-22T10:05:00.000Z',
    endedAt: null,
    notes: null,
    createdAt: '2026-10-22T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z',
  };
  const cdCalc: TimerCalculatedState = {
    elapsedSeconds: 300,
    remainingSeconds: 1200, // 20 mins left
    isExpired: false,
  };
  const cdModel = getHabitsSnapshotModel(habits, () => false, '2026-10-22', runningCd, cdCalc);
  assert.strictEqual(cdModel.hasActiveTimer, true);
  assert.strictEqual(cdModel.timerType, 'countdown');
  assert.strictEqual(cdModel.formattedDuration, '20:00');
  assert.strictEqual(cdModel.timerDisplayText, 'Running (20:00 left)');

  // 5. Expired Countdown session
  const expiredCalc: TimerCalculatedState = {
    elapsedSeconds: 1510,
    remainingSeconds: 0,
    isExpired: true,
  };
  const expiredModel = getHabitsSnapshotModel(habits, () => false, '2026-10-22', runningCd, expiredCalc);
  assert.strictEqual(expiredModel.isExpired, true);
  assert.strictEqual(expiredModel.formattedDuration, '00:00');
  assert.strictEqual(expiredModel.timerDisplayText, 'Target reached! Tap to complete');
});

test('Dashboard Helpers: Today schedule filtering, chronological ordering, and 3-event limit', () => {
  const sampleEvents: CalendarEvent[] = [
    {
      id: 'e1',
      title: 'Afternoon Lab',
      startTime: '2026-10-22T14:00:00.000Z',
      endTime: '2026-10-22T16:00:00.000Z',
      category: 'Academic',
      location: null,
      notes: null,
      recurrence: 'none',
      reminderMinutesBefore: 15,
      status: 'pending',
      source: 'manual',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'e2',
      title: 'Morning Standup',
      startTime: '2026-10-22T09:30:00.000Z',
      endTime: '2026-10-22T10:00:00.000Z',
      category: 'Work',
      location: null,
      notes: null,
      recurrence: 'none',
      reminderMinutesBefore: null,
      status: 'completed',
      source: 'manual',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'e3',
      title: 'Lunch with Advisor',
      startTime: '2026-10-22T12:30:00.000Z',
      endTime: '2026-10-22T13:30:00.000Z',
      category: 'Personal',
      location: null,
      notes: null,
      recurrence: 'none',
      reminderMinutesBefore: null,
      status: 'pending',
      source: 'manual',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'e4',
      title: 'Evening Study Group',
      startTime: '2026-10-22T18:00:00.000Z',
      endTime: '2026-10-22T20:00:00.000Z',
      category: 'Academic',
      location: null,
      notes: null,
      recurrence: 'none',
      reminderMinutesBefore: null,
      status: 'pending',
      source: 'manual',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'e5',
      title: 'Tomorrow Workshop',
      startTime: '2026-10-23T10:00:00.000Z', // Different date
      endTime: null,
      category: 'Work',
      location: null,
      notes: null,
      recurrence: 'none',
      reminderMinutesBefore: null,
      status: 'pending',
      source: 'manual',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];

  // 1. Empty calendar
  const emptyModel = getTodayScheduleModel([], '2026-10-22');
  assert.strictEqual(emptyModel.totalTodayEvents, 0);
  assert.strictEqual(emptyModel.events.length, 0);

  // 2. Query today (filters e5 out, sorts e2, e3, e1, e4 chronologically, limits to top 3)
  const scheduleModel = getTodayScheduleModel(sampleEvents, '2026-10-22', 3);
  assert.strictEqual(scheduleModel.totalTodayEvents, 4); // 4 events today total
  assert.strictEqual(scheduleModel.events.length, 3); // Capped at 3

  // Chronological order: 09:30 (e2) -> 12:30 (e3) -> 14:00 (e1)
  assert.strictEqual(scheduleModel.events[0].id, 'e2');
  assert.strictEqual(scheduleModel.events[0].title, 'Morning Standup');
  assert.strictEqual(scheduleModel.events[0].status, 'completed');

  assert.strictEqual(scheduleModel.events[1].id, 'e3');
  assert.strictEqual(scheduleModel.events[1].title, 'Lunch with Advisor');

  assert.strictEqual(scheduleModel.events[2].id, 'e1');
  assert.strictEqual(scheduleModel.events[2].title, 'Afternoon Lab');
});
