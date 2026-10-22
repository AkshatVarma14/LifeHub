import test from 'node:test';
import assert from 'node:assert';
import {
  generateDemoData,
  createLocalIso,
} from '../../src/features/demo/data/demoDataGenerator.ts';
import { seedDemoData, type SeedContexts } from '../../src/features/demo/services/demoSeeder.ts';
import { calculateBudgetSummary } from '../../src/features/finance/calculations.ts';
import { calculateHabitStreak } from '../../src/features/habits/streaks.ts';
import { getTodayScheduleModel } from '../../src/features/dashboard/utils/dashboardHelpers.ts';
import { formatLocalDateKey } from '../../src/utils/date.ts';
import type {
  Transaction,
  MonthlyBudget,
  FixedPayment,
} from '../../src/types/finance.ts';
import type { CalendarEvent } from '../../src/types/calendar.ts';
import type { Habit, HabitCompletion } from '../../src/types/habits.ts';
import { validateTransactionInput, validateBudgetInput, validateFixedPaymentInput } from '../../src/features/finance/validation.ts';
import { validateEventInput } from '../../src/features/calendar/validation.ts';
import { validateHabitInput, validateCompletionInput } from '../../src/features/habits/validation.ts';

function createMockContexts(): {
  contexts: SeedContexts;
  state: {
    monthlyBudget: MonthlyBudget | null;
    commitments: FixedPayment[];
    transactions: Transaction[];
    events: CalendarEvent[];
    habits: Habit[];
    archivedHabits: Habit[];
    completions: HabitCompletion[];
    refreshCalls: { finance: number; calendar: number; habits: number };
  };
} {
  let nextId = 1;

  const state = {
    monthlyBudget: null as MonthlyBudget | null,
    commitments: [] as FixedPayment[],
    transactions: [] as Transaction[],
    events: [] as CalendarEvent[],
    habits: [] as Habit[],
    archivedHabits: [] as Habit[],
    completions: [] as HabitCompletion[],
    refreshCalls: { finance: 0, calendar: 0, habits: 0 },
  };

  const contexts: SeedContexts = {
    finance: {
      get monthlyBudget() {
        return state.monthlyBudget;
      },
      get commitments() {
        return state.commitments;
      },
      get transactions() {
        return state.transactions;
      },
      async setBudget(input) {
        const val = validateBudgetInput(input);
        if (!val.isValid || !val.sanitized) {
          throw new Error(val.errors.join('; '));
        }
        const created: MonthlyBudget = {
          id: `b_${nextId++}`,
          month: val.sanitized.month,
          totalBudgetPaise: val.sanitized.totalBudgetPaise,
          categoryLimitsJson: val.sanitized.categoryLimitsJson ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.monthlyBudget = created;
        return created;
      },
      async addCommitment(input) {
        const val = validateFixedPaymentInput(input);
        if (!val.isValid || !val.sanitized) {
          throw new Error(val.errors.join('; '));
        }
        const created: FixedPayment = {
          id: `c_${nextId++}`,
          name: val.sanitized.name,
          category: val.sanitized.category as any,
          expectedAmountPaise: val.sanitized.expectedAmountPaise,
          dueDay: val.sanitized.dueDay,
          active: val.sanitized.active,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.commitments.push(created);
        return created;
      },
      async addTransaction(input) {
        const val = validateTransactionInput(input);
        if (!val.isValid || !val.sanitized) {
          throw new Error(val.errors.join('; '));
        }
        const created: Transaction = {
          id: `t_${nextId++}`,
          amountPaise: val.sanitized.amountPaise,
          type: val.sanitized.type,
          category: val.sanitized.category,
          date: val.sanitized.date,
          description: val.sanitized.description,
          linkedFixedPaymentId: val.sanitized.linkedFixedPaymentId ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.transactions.push(created);
        return created;
      },
      async refresh() {
        state.refreshCalls.finance++;
      },
    },

    calendar: {
      get events() {
        return state.events;
      },
      async createEvent(input) {
        const val = validateEventInput(input);
        if (!val.isValid || !val.sanitized) {
          throw new Error(val.errors.join('; '));
        }
        const created: CalendarEvent = {
          id: `e_${nextId++}`,
          title: val.sanitized.title,
          startTime: val.sanitized.startTime,
          endTime: val.sanitized.endTime ?? null,
          category: val.sanitized.category,
          location: val.sanitized.location ?? null,
          notes: val.sanitized.notes ?? null,
          recurrence: val.sanitized.recurrence ?? 'none',
          reminderMinutesBefore: val.sanitized.reminderMinutesBefore ?? null,
          status: val.sanitized.status ?? 'pending',
          source: val.sanitized.source ?? 'manual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.events.push(created);
        return created;
      },
      async refresh() {
        state.refreshCalls.calendar++;
      },
    },

    habits: {
      get habits() {
        return state.habits;
      },
      get archivedHabits() {
        return state.archivedHabits;
      },
      isHabitCompletedOnDate(habitId, completedDate) {
        return state.completions.some(
          (c) => c.habitId === habitId && c.completedDate === completedDate
        );
      },
      async createHabit(input) {
        const val = validateHabitInput(input);
        if (!val.isValid || !val.sanitized) {
          throw new Error(val.errors.join('; '));
        }
        const created: Habit = {
          id: `h_${nextId++}`,
          name: val.sanitized.name,
          description: val.sanitized.description ?? null,
          isArchived: val.sanitized.isArchived,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (created.isArchived) {
          state.archivedHabits.push(created);
        } else {
          state.habits.push(created);
        }
        return created;
      },
      async recordCompletion(input) {
        const val = validateCompletionInput(input);
        if (!val.isValid || !val.sanitized) {
          throw new Error(val.errors.join('; '));
        }
        const created: HabitCompletion = {
          id: `hc_${nextId++}`,
          habitId: val.sanitized.habitId,
          completedDate: val.sanitized.completedDate,
          completedAt: val.sanitized.completedAt,
          notes: null,
          createdAt: new Date().toISOString(),
        };
        state.completions.push(created);
        return created;
      },
      async refresh() {
        state.refreshCalls.habits++;
      },
    },
  };

  return { contexts, state };
}

test('Demo Seeder: Empty database initial seeding', async () => {
  const { contexts, state } = createMockContexts();
  const testDate = '2026-10-22';

  const result = await seedDemoData(contexts, { todayDate: testDate });

  // 1. Success flag
  assert.strictEqual(result.success, true);

  // 2. Finance counts: 1 budget + 2 commitments + 5 transactions = 8 items
  assert.strictEqual(result.finance.created, 8);
  assert.strictEqual(result.finance.skipped, 0);
  assert.strictEqual(state.monthlyBudget?.month, '2026-10');
  assert.strictEqual(state.commitments.length, 2);
  assert.strictEqual(state.transactions.length, 5);

  // 3. Calendar counts: 4 events (3 today, 1 tomorrow)
  assert.strictEqual(result.calendar.created, 4);
  assert.strictEqual(result.calendar.skipped, 0);
  assert.strictEqual(state.events.length, 4);

  // 4. Habits counts: 4 habits + 9 completions = 13 items
  assert.strictEqual(result.habits.created, 13);
  assert.strictEqual(result.habits.skipped, 0);
  assert.strictEqual(state.habits.length, 4);
  assert.strictEqual(state.completions.length, 9);

  // 5. Context refreshes invoked
  assert.strictEqual(state.refreshCalls.finance, 1);
  assert.strictEqual(state.refreshCalls.calendar, 1);
  assert.strictEqual(state.refreshCalls.habits, 1);
});

test('Demo Seeder: Repeat invocation is completely idempotent with zero duplicates', async () => {
  const { contexts, state } = createMockContexts();
  const testDate = '2026-10-22';

  // First seed
  const firstResult = await seedDemoData(contexts, { todayDate: testDate });
  assert.strictEqual(firstResult.success, true);
  assert.strictEqual(firstResult.finance.created, 8);
  assert.strictEqual(firstResult.calendar.created, 4);
  assert.strictEqual(firstResult.habits.created, 13);

  const initialTxCount = state.transactions.length;
  const initialEventCount = state.events.length;
  const initialHabitCount = state.habits.length;
  const initialCompCount = state.completions.length;

  // Second seed (repeat attempt)
  const secondResult = await seedDemoData(contexts, { todayDate: testDate });
  assert.strictEqual(secondResult.success, true);

  // Zero new creations; all items skipped
  assert.strictEqual(secondResult.finance.created, 0);
  assert.strictEqual(secondResult.finance.skipped, 8);

  assert.strictEqual(secondResult.calendar.created, 0);
  assert.strictEqual(secondResult.calendar.skipped, 4);

  assert.strictEqual(secondResult.habits.created, 0);
  assert.strictEqual(secondResult.habits.skipped, 13);

  // Total counts in store remained identical
  assert.strictEqual(state.transactions.length, initialTxCount);
  assert.strictEqual(state.events.length, initialEventCount);
  assert.strictEqual(state.habits.length, initialHabitCount);
  assert.strictEqual(state.completions.length, initialCompCount);
});

test('Demo Seeder: Existing user data preservation', async () => {
  const { contexts, state } = createMockContexts();
  const testDate = '2026-10-22';

  // 1. User sets custom budget and transactions prior to demo seeding
  await contexts.finance.setBudget({
    month: '2026-10',
    totalBudgetPaise: 6000000, // Custom user budget: ₹60,000
  });

  await contexts.finance.addTransaction({
    description: 'User Personal Laptop Repair',
    amountPaise: 250000,
    type: 'expense',
    category: 'Other Expense',
    date: '2026-10-10',
  });

  // 2. User creates a custom personal habit
  await contexts.habits.createHabit({
    name: 'Practice Guitar',
    description: '30 mins chord progressions',
  });

  // 3. User creates a personal event
  await contexts.calendar.createEvent({
    title: 'Dentist Appointment',
    startTime: createLocalIso('2026-10-22', 16, 0),
    endTime: createLocalIso('2026-10-22', 17, 0),
    category: 'Health',
  });

  // Run demo seeder
  const result = await seedDemoData(contexts, { todayDate: testDate });
  assert.strictEqual(result.success, true);

  // User's custom budget is preserved (demo budget skipped)
  assert.strictEqual(state.monthlyBudget?.totalBudgetPaise, 6000000);
  assert.strictEqual(result.finance.skipped >= 1, true); // budget skipped

  // User's laptop transaction is preserved
  assert.strictEqual(
    state.transactions.some((t) => t.description === 'User Personal Laptop Repair'),
    true
  );

  // User's guitar habit is preserved alongside demo habits
  assert.strictEqual(
    state.habits.some((h) => h.name === 'Practice Guitar'),
    true
  );

  // User's dentist event is preserved alongside demo events
  assert.strictEqual(
    state.events.some((e) => e.title === 'Dentist Appointment'),
    true
  );
  assert.strictEqual(state.events.length, 5); // 1 user + 4 demo
});

test('Demo Seeder: ADR-02 non-double-counting verification with seeded finance data', async () => {
  const { contexts, state } = createMockContexts();
  const testDate = '2026-10-22';

  await seedDemoData(contexts, { todayDate: testDate });

  // Calculate summary using production budget engine
  const summary = calculateBudgetSummary(
    '2026-10',
    state.monthlyBudget,
    state.transactions,
    state.commitments
  );

  // Planned budget: ₹45,000 (4500000)
  assert.strictEqual(summary.totalPlannedBudgetPaise, 4500000);

  // Commitments reserved: Rent (1800000) + WiFi (120000) = 1920000 (₹19,200)
  assert.strictEqual(summary.activeCommitmentsReservedPaise, 1920000);

  // Usable budget: 4500000 - 1920000 = 2580000 (₹25,800)
  assert.strictEqual(summary.actualUsableBudgetPaise, 2580000);

  // Total actual spending:
  // Rent (1800000) + Groceries (320000) + Metro (85000) + Books (145000) = 2350000 (₹23,500)
  assert.strictEqual(summary.totalActualSpendingPaise, 2350000);

  // Eligible discretionary spending: only Groceries + Metro + Books = 550000 (₹5,500)
  // Rent transaction linked to commitment is NOT counted in discretionary!
  assert.strictEqual(summary.eligibleDiscretionarySpendingPaise, 550000);

  // Remaining usable budget = Usable (2580000) - Discretionary (550000) = 2030000 (₹20,300)
  assert.strictEqual(summary.remainingUsableBudgetPaise, 2030000);
  assert.strictEqual(summary.remainingUsableBudgetPaise! > 0, true);

  // Income = 5000000 (₹50,000)
  assert.strictEqual(summary.totalIncomePaise, 5000000);
});

test('Demo Seeder: Calendar demo events and today schedule presentation', async () => {
  const { contexts, state } = createMockContexts();
  const testDate = '2026-10-22';

  await seedDemoData(contexts, { todayDate: testDate });

  // Verify formatLocalDateKey on seeded start times matches todayDate for the 3 today events
  const todayEvents = state.events.filter(
    (e) => formatLocalDateKey(e.startTime) === testDate
  );
  assert.strictEqual(todayEvents.length, 3);

  // Verify dashboard snapshot limit and ordering
  const scheduleModel = getTodayScheduleModel(state.events, testDate, 3);
  assert.strictEqual(scheduleModel.totalTodayEvents, 3);
  assert.strictEqual(scheduleModel.events.length, 3);

  // Sorted chronologically: 09:30 Lecture -> 14:00 Sync -> 18:00 Gym
  assert.strictEqual(scheduleModel.events[0].title, 'Software Engineering Lecture');
  assert.strictEqual(scheduleModel.events[1].title, 'PBL Project Team Sync');
  assert.strictEqual(scheduleModel.events[2].title, 'Gym & Cardio Workout');
});

test('Demo Seeder: Habit completion streaks and daily progress calculation', async () => {
  const { contexts, state } = createMockContexts();
  const testDate = '2026-10-22';

  await seedDemoData(contexts, { todayDate: testDate });

  // Find Morning 20-Min Run
  const runHabit = state.habits.find((h) => h.name === 'Morning 20-Min Run');
  assert.ok(runHabit);

  const runCompletions = state.completions
    .filter((c) => c.habitId === runHabit.id)
    .map((c) => c.completedDate);

  // Completed for 5 consecutive days ending today
  assert.strictEqual(runCompletions.length, 5);
  const runStreak = calculateHabitStreak(runCompletions, testDate);
  assert.strictEqual(runStreak.currentStreak, 5);
  assert.strictEqual(runStreak.longestStreak, 5);
  assert.strictEqual(runStreak.totalCompletions, 5);

  // Find Evening Meditation (completed yesterday, not yet today -> streak 1)
  const medHabit = state.habits.find((h) => h.name === 'Evening Meditation');
  assert.ok(medHabit);
  const medCompletions = state.completions
    .filter((c) => c.habitId === medHabit.id)
    .map((c) => c.completedDate);
  const medStreak = calculateHabitStreak(medCompletions, testDate);
  assert.strictEqual(medStreak.currentStreak, 1);

  // Today completion ratio across active habits: 3 out of 4 (75%)
  const completedTodayCount = state.habits.filter((h) =>
    contexts.habits.isHabitCompletedOnDate(h.id, testDate)
  ).length;
  assert.strictEqual(completedTodayCount, 3);
  assert.strictEqual(Math.round((completedTodayCount / state.habits.length) * 100), 75);
});

test('Demo Seeder: Partial failure isolation when a single module throws', async () => {
  const { contexts, state } = createMockContexts();
  const testDate = '2026-10-22';

  // Force Calendar createEvent to throw an unexpected error
  contexts.calendar.createEvent = async () => {
    throw new Error('Database disk full');
  };

  const result = await seedDemoData(contexts, { todayDate: testDate });

  // Overall success false due to calendar failure
  assert.strictEqual(result.success, false);

  // Finance succeeded completely
  assert.strictEqual(result.finance.created, 8);
  assert.strictEqual(result.finance.error, undefined);

  // Calendar failed with error captured
  assert.strictEqual(result.calendar.created, 0);
  assert.strictEqual(result.calendar.error, 'Database disk full');

  // Habits still proceeded and succeeded!
  assert.strictEqual(result.habits.created, 13);
  assert.strictEqual(result.habits.error, undefined);

  // Refreshes still executed
  assert.strictEqual(state.refreshCalls.finance, 1);
  assert.strictEqual(state.refreshCalls.habits, 1);
});
