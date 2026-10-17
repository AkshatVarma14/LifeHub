/**
 * Habit Streak and Completion Summary Calculations for LifeHub.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08).
 * Pure deterministic calculation functions.
 */

import type { HabitStreakSummary } from '../../types/habits.ts';
import { isValidDateString, getTodayDateString } from '../../utils/date.ts';

const MS_PER_DAY = 86400000;

function dateStringToEpochDay(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/**
 * Calculates current streak, longest streak, and total completions for a habit
 * given an array of completion date strings (YYYY-MM-DD).
 *
 * Current streak rule:
 * - A streak is considered active if completed today (referenceDate) OR yesterday.
 * - This allows users to retain their active streak before logging today's completion.
 * - If not completed today or yesterday, current streak is 0.
 *
 * @param completedDates Array of completion dates in YYYY-MM-DD format
 * @param referenceDate Optional reference calendar date (defaults to today's local date)
 */
export function calculateHabitStreak(
  completedDates: string[],
  referenceDate?: string
): HabitStreakSummary {
  const refDateStr = referenceDate && isValidDateString(referenceDate)
    ? referenceDate
    : getTodayDateString();

  // Deduplicate and filter valid dates
  const uniqueDateStrings = Array.from(
    new Set(completedDates.filter((d) => typeof d === 'string' && isValidDateString(d)))
  );

  if (uniqueDateStrings.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
    };
  }

  // Convert to epoch days and sort ascending
  const sortedEpochDays = uniqueDateStrings
    .map(dateStringToEpochDay)
    .sort((a, b) => a - b);

  // 1. Longest streak calculation
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < sortedEpochDays.length; i++) {
    const prev = sortedEpochDays[i - 1];
    const curr = sortedEpochDays[i];

    if (curr === prev + 1) {
      tempStreak += 1;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 1;
    }
  }

  // 2. Current streak calculation
  const refDay = dateStringToEpochDay(refDateStr);
  const eligibleCurrentDays = sortedEpochDays.filter((day) => day <= refDay);

  let currentStreak = 0;

  if (eligibleCurrentDays.length > 0) {
    const lastEligibleDay = eligibleCurrentDays[eligibleCurrentDays.length - 1];

    // Streak is alive only if the latest eligible completion was today or yesterday
    if (lastEligibleDay === refDay || lastEligibleDay === refDay - 1) {
      currentStreak = 1;
      let expectedPrecedingDay = lastEligibleDay - 1;

      for (let i = eligibleCurrentDays.length - 2; i >= 0; i--) {
        const day = eligibleCurrentDays[i];
        if (day === expectedPrecedingDay) {
          currentStreak += 1;
          expectedPrecedingDay -= 1;
        } else {
          break;
        }
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalCompletions: uniqueDateStrings.length,
  };
}
