import test from 'node:test';
import assert from 'node:assert';
import { calculateHabitStreak } from '../../src/features/habits/streaks.ts';

test('Habits Streaks: Empty history, single completions, and grace day logic', () => {
  const refToday = '2026-10-18';

  // 1. Empty history
  const empty = calculateHabitStreak([], refToday);
  assert.deepStrictEqual(empty, { currentStreak: 0, longestStreak: 0, totalCompletions: 0 });

  // 2. Single completion today
  const todayOnly = calculateHabitStreak(['2026-10-18'], refToday);
  assert.deepStrictEqual(todayOnly, { currentStreak: 1, longestStreak: 1, totalCompletions: 1 });

  // 3. Single completion yesterday (grace day allows streak to stay 1)
  const yesterdayOnly = calculateHabitStreak(['2026-10-17'], refToday);
  assert.deepStrictEqual(yesterdayOnly, { currentStreak: 1, longestStreak: 1, totalCompletions: 1 });

  // 4. Single completion 2 days ago (streak broken)
  const twoDaysAgo = calculateHabitStreak(['2026-10-16'], refToday);
  assert.deepStrictEqual(twoDaysAgo, { currentStreak: 0, longestStreak: 1, totalCompletions: 1 });
});

test('Habits Streaks: Consecutive sequences, gaps, and longest streak preservation', () => {
  const refToday = '2026-10-20';

  // 5 days ending today
  const fiveDays = calculateHabitStreak(
    ['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'],
    refToday
  );
  assert.deepStrictEqual(fiveDays, { currentStreak: 5, longestStreak: 5, totalCompletions: 5 });

  // 5 days in past (longest), gap, then 2 days active
  const withGap = calculateHabitStreak(
    [
      // First streak: 5 days
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
      // Gap: 6th-18th
      // Current streak: 2 days (19th, 20th)
      '2026-10-19', '2026-10-20',
    ],
    refToday
  );
  assert.strictEqual(withGap.currentStreak, 2);
  assert.strictEqual(withGap.longestStreak, 5);
  assert.strictEqual(withGap.totalCompletions, 7);
});

test('Habits Streaks: Month boundaries, year boundaries, and leap year rollover', () => {
  // 1. Month boundary (Oct 30 -> Nov 2)
  const monthBoundary = calculateHabitStreak(
    ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'],
    '2026-11-02'
  );
  assert.strictEqual(monthBoundary.currentStreak, 4);
  assert.strictEqual(monthBoundary.longestStreak, 4);

  // 2. Year boundary (Dec 30 -> Jan 1)
  const yearBoundary = calculateHabitStreak(
    ['2026-12-30', '2026-12-31', '2027-01-01'],
    '2027-01-01'
  );
  assert.strictEqual(yearBoundary.currentStreak, 3);
  assert.strictEqual(yearBoundary.longestStreak, 3);

  // 3. Leap year February 29 (2024 is leap year: Feb 28 -> Feb 29 -> Mar 1)
  const leapYear = calculateHabitStreak(
    ['2024-02-28', '2024-02-29', '2024-03-01'],
    '2024-03-01'
  );
  assert.strictEqual(leapYear.currentStreak, 3);
  assert.strictEqual(leapYear.longestStreak, 3);

  // 4. Non-leap year February (2026 is non-leap year: Feb 28 -> Mar 1 is consecutive)
  const nonLeap = calculateHabitStreak(
    ['2026-02-28', '2026-03-01'],
    '2026-03-01'
  );
  assert.strictEqual(nonLeap.currentStreak, 2);
  assert.strictEqual(nonLeap.longestStreak, 2);
});

test('Habits Streaks: Input deduplication and unordered inputs', () => {
  const refToday = '2026-10-18';
  // Unordered with duplicates
  const unordered = calculateHabitStreak(
    ['2026-10-18', '2026-10-16', '2026-10-17', '2026-10-17', '2026-10-18'],
    refToday
  );
  assert.strictEqual(unordered.currentStreak, 3);
  assert.strictEqual(unordered.longestStreak, 3);
  assert.strictEqual(unordered.totalCompletions, 3);
});

test('Habits Streaks: F-1 Future-dated completion defensive hardening', () => {
  const refToday = '2026-10-18';

  // 1. Today + future completion (today 18th + tomorrow 19th)
  // Current streak must remain 1 (active today)
  const todayAndFuture = calculateHabitStreak(['2026-10-18', '2026-10-19'], refToday);
  assert.strictEqual(todayAndFuture.currentStreak, 1);
  assert.strictEqual(todayAndFuture.longestStreak, 2);
  assert.strictEqual(todayAndFuture.totalCompletions, 2);

  // 2. Yesterday + future completion (yesterday 17th + future 25th)
  // Current streak must remain 1 (grace day preserved)
  const yesterdayAndFuture = calculateHabitStreak(['2026-10-17', '2026-10-25'], refToday);
  assert.strictEqual(yesterdayAndFuture.currentStreak, 1);
  assert.strictEqual(yesterdayAndFuture.longestStreak, 1);
  assert.strictEqual(yesterdayAndFuture.totalCompletions, 2);

  // 3. Only future completions (tomorrow 19th, day after 20th)
  // Current streak must be 0
  const onlyFuture = calculateHabitStreak(['2026-10-19', '2026-10-20'], refToday);
  assert.strictEqual(onlyFuture.currentStreak, 0);
  assert.strictEqual(onlyFuture.longestStreak, 2);
  assert.strictEqual(onlyFuture.totalCompletions, 2);

  // 4. Unordered/duplicate inputs with future dates (16th, 18th, 17th, 18th duplicate, 22nd future)
  const unorderedFuture = calculateHabitStreak(
    ['2026-10-22', '2026-10-16', '2026-10-18', '2026-10-17', '2026-10-18'],
    refToday
  );
  // Eligible dates <= refToday are 16, 17, 18 -> streak of 3 ending today
  assert.strictEqual(unorderedFuture.currentStreak, 3);
  assert.strictEqual(unorderedFuture.longestStreak, 3);
  assert.strictEqual(unorderedFuture.totalCompletions, 4);
});

