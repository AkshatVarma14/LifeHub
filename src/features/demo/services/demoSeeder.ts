/**
 * Demo Data Seeder Service for LifeHub.
 * Stage 1: Demo Data Seeder (Slice 8).
 * Idempotent, safe seeding using public module contexts.
 */

import type { FinanceContextValue } from '../../finance/context/types.ts';
import type { CalendarContextValue } from '../../calendar/context/types.ts';
import type { HabitsContextValue } from '../../habits/context/types.ts';
import type { SeedOptions, SeedResult, ModuleSeedResult } from '../types.ts';
import { generateDemoData } from '../data/demoDataGenerator.ts';

export interface SeedContexts {
  finance: Pick<
    FinanceContextValue,
    'monthlyBudget' | 'commitments' | 'transactions' | 'setBudget' | 'addCommitment' | 'addTransaction' | 'refresh'
  >;
  calendar: Pick<CalendarContextValue, 'events' | 'createEvent' | 'refresh'>;
  habits: Pick<
    HabitsContextValue,
    'habits' | 'archivedHabits' | 'isHabitCompletedOnDate' | 'createHabit' | 'recordCompletion' | 'refresh'
  >;
}

/**
 * Seeds demo data into Finance, Calendar, and Habits modules.
 * Strictly respects existing data, avoids duplicate creation, and safely catches partial errors.
 */
export async function seedDemoData(
  contexts: SeedContexts,
  options?: SeedOptions
): Promise<SeedResult> {
  const demoData = generateDemoData(options?.todayDate);

  const result: SeedResult = {
    success: true,
    finance: { created: 0, skipped: 0 },
    calendar: { created: 0, skipped: 0 },
    habits: { created: 0, skipped: 0 },
  };

  // =========================================================================
  // 1. Finance Seeding
  // =========================================================================
  try {
    const { finance } = contexts;

    // A. Monthly Budget
    const hasExistingBudget =
      finance.monthlyBudget !== null &&
      finance.monthlyBudget.month === demoData.referenceMonth;

    if (hasExistingBudget) {
      result.finance.skipped++;
    } else {
      await finance.setBudget(demoData.finance.budget);
      result.finance.created++;
    }

    // B. Fixed Commitments
    const existingCommitmentsByName = new Map(
      finance.commitments.map((c) => [c.name.trim().toLowerCase(), c])
    );

    for (const commitmentInput of demoData.finance.commitments) {
      const key = commitmentInput.name.trim().toLowerCase();
      if (existingCommitmentsByName.has(key)) {
        result.finance.skipped++;
      } else {
        const createdCommitment = await finance.addCommitment(commitmentInput);
        existingCommitmentsByName.set(key, createdCommitment);
        result.finance.created++;
      }
    }

    // C. Transactions
    const rentCommitment = existingCommitmentsByName.get('apartment rent');
    const rentCommitmentId = rentCommitment ? rentCommitment.id : null;
    const transactionsToSeed = demoData.finance.getTransactions(rentCommitmentId);

    for (const txInput of transactionsToSeed) {
      const exists = finance.transactions.some(
        (t) =>
          t.description === txInput.description &&
          t.date === txInput.date &&
          t.amountPaise === txInput.amountPaise
      );

      if (exists) {
        result.finance.skipped++;
      } else {
        await finance.addTransaction(txInput);
        result.finance.created++;
      }
    }
  } catch (err: any) {
    result.finance.error = err.message || 'Failed to seed finance module';
    result.success = false;
  }

  // =========================================================================
  // 2. Calendar Seeding
  // =========================================================================
  try {
    const { calendar } = contexts;

    for (const eventInput of demoData.calendar.events) {
      const exists = calendar.events.some(
        (e) => e.title === eventInput.title && e.startTime === eventInput.startTime
      );

      if (exists) {
        result.calendar.skipped++;
      } else {
        await calendar.createEvent(eventInput);
        result.calendar.created++;
      }
    }
  } catch (err: any) {
    result.calendar.error = err.message || 'Failed to seed calendar module';
    result.success = false;
  }

  // =========================================================================
  // 3. Habits & Streaks Seeding
  // =========================================================================
  try {
    const { habits } = contexts;
    const allExistingHabits = [...habits.habits, ...habits.archivedHabits];
    const existingHabitsByName = new Map(
      allExistingHabits.map((h) => [h.name.trim().toLowerCase(), h])
    );

    for (const habitDef of demoData.habits.definitions) {
      const key = habitDef.habit.name.trim().toLowerCase();
      let habitId: string;

      if (existingHabitsByName.has(key)) {
        habitId = existingHabitsByName.get(key)!.id;
        result.habits.skipped++;
      } else {
        const createdHabit = await habits.createHabit(habitDef.habit);
        habitId = createdHabit.id;
        existingHabitsByName.set(key, createdHabit);
        result.habits.created++;
      }

      // Record completion history
      for (const compDate of habitDef.completionDates) {
        const alreadyCompleted = habits.isHabitCompletedOnDate(habitId, compDate);
        if (alreadyCompleted) {
          result.habits.skipped++;
        } else {
          await habits.recordCompletion({
            habitId,
            completedDate: compDate,
          });
          result.habits.created++;
        }
      }
    }
  } catch (err: any) {
    result.habits.error = err.message || 'Failed to seed habits module';
    result.success = false;
  }

  // =========================================================================
  // 4. Parallel Refresh to sync all stores with latest data
  // =========================================================================
  await Promise.allSettled([
    contexts.finance.refresh(),
    contexts.calendar.refresh(),
    contexts.habits.refresh(),
  ]);

  return result;
}
