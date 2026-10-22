import test from 'node:test';
import assert from 'node:assert';
import {
  formatTimerDuration,
  validateCountdownDurationMinutes,
  getTimerDisplayModel,
} from '../../src/features/habits/utils/timerUi.ts';
import type { Habit, TimerSession, TimerCalculatedState } from '../../src/types/habits.ts';

test('Timer UI: formatTimerDuration handles seconds, minutes, hours, and edge cases', () => {
  // Edge cases and negatives
  assert.strictEqual(formatTimerDuration(0), '00:00');
  assert.strictEqual(formatTimerDuration(-10), '00:00');
  assert.strictEqual(formatTimerDuration(NaN), '00:00');

  // Under one minute
  assert.strictEqual(formatTimerDuration(5), '00:05');
  assert.strictEqual(formatTimerDuration(59), '00:59');

  // Minutes and seconds (under 1 hour)
  assert.strictEqual(formatTimerDuration(60), '01:00');
  assert.strictEqual(formatTimerDuration(125), '02:05');
  assert.strictEqual(formatTimerDuration(1500), '25:00'); // Standard 25m Pomodoro
  assert.strictEqual(formatTimerDuration(3599), '59:59');

  // One hour or more (HH:MM:SS format)
  assert.strictEqual(formatTimerDuration(3600), '01:00:00');
  assert.strictEqual(formatTimerDuration(3723), '01:02:03');
  assert.strictEqual(formatTimerDuration(7200), '02:00:00');
  assert.strictEqual(formatTimerDuration(86400), '24:00:00');
});

test('Timer UI: validateCountdownDurationMinutes validates numbers, strings, boundaries, and errors', () => {
  // Valid numeric and string inputs
  const res1 = validateCountdownDurationMinutes(25);
  assert.strictEqual(res1.isValid, true);
  assert.strictEqual(res1.targetDurationSeconds, 1500);

  const res2 = validateCountdownDurationMinutes('15');
  assert.strictEqual(res2.isValid, true);
  assert.strictEqual(res2.targetDurationSeconds, 900);

  const res3 = validateCountdownDurationMinutes(' 60 ');
  assert.strictEqual(res3.isValid, true);
  assert.strictEqual(res3.targetDurationSeconds, 3600);

  // Maximum allowed (1440 minutes = 24 hours = 86400 seconds)
  const resMax = validateCountdownDurationMinutes(1440);
  assert.strictEqual(resMax.isValid, true);
  assert.strictEqual(resMax.targetDurationSeconds, 86400);

  // Invalid empty or nil
  assert.strictEqual(validateCountdownDurationMinutes('').isValid, false);
  assert.strictEqual(validateCountdownDurationMinutes(null).isValid, false);
  assert.strictEqual(validateCountdownDurationMinutes(undefined).isValid, false);

  // Invalid non-integer or negative or zero
  const resZero = validateCountdownDurationMinutes(0);
  assert.strictEqual(resZero.isValid, false);
  assert.match(resZero.error!, /at least 1 minute/i);

  const resNegative = validateCountdownDurationMinutes(-5);
  assert.strictEqual(resNegative.isValid, false);

  const resDecimal = validateCountdownDurationMinutes('25.5');
  assert.strictEqual(resDecimal.isValid, false);
  assert.match(resDecimal.error!, /whole positive number/i);

  const resAlpha = validateCountdownDurationMinutes('abc');
  assert.strictEqual(resAlpha.isValid, false);

  // Exceeds max
  const resOver = validateCountdownDurationMinutes(1441);
  assert.strictEqual(resOver.isValid, false);
  assert.match(resOver.error!, /cannot exceed 1440 minutes/i);
});

test('Timer UI: getTimerDisplayModel derives view model for inactive and active sessions', () => {
  const sampleHabits: Habit[] = [
    {
      id: 'habit-1',
      name: 'Deep Reading',
      description: null,
      isArchived: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];

  // 1. Inactive State (session is null)
  const inactiveModel = getTimerDisplayModel(null, null, sampleHabits);
  assert.strictEqual(inactiveModel.isActive, false);
  assert.strictEqual(inactiveModel.formattedTime, '00:00');
  assert.strictEqual(inactiveModel.canPause, false);
  assert.strictEqual(inactiveModel.canResume, false);
  assert.strictEqual(inactiveModel.canComplete, false);
  assert.strictEqual(inactiveModel.canCancel, false);
  assert.strictEqual(inactiveModel.habitName, null);

  // 2. Active Stopwatch Session (Running)
  const runningStopwatch: TimerSession = {
    id: 'timer-1',
    habitId: 'habit-1',
    type: 'stopwatch',
    status: 'running',
    startedAt: '2026-10-22T10:00:00.000Z',
    targetDurationSeconds: null,
    accumulatedSeconds: 120,
    currentSegmentStartedAt: '2026-10-22T10:02:00.000Z',
    endedAt: null,
    notes: null,
    createdAt: '2026-10-22T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z',
  };
  const stopwatchCalc: TimerCalculatedState = {
    elapsedSeconds: 155, // 2m 35s
    remainingSeconds: null,
    isExpired: false,
  };
  const swModel = getTimerDisplayModel(runningStopwatch, stopwatchCalc, sampleHabits);
  assert.strictEqual(swModel.isActive, true);
  assert.strictEqual(swModel.type, 'stopwatch');
  assert.strictEqual(swModel.status, 'running');
  assert.strictEqual(swModel.habitName, 'Deep Reading');
  assert.strictEqual(swModel.formattedTime, '02:35');
  assert.strictEqual(swModel.canPause, true);
  assert.strictEqual(swModel.canResume, false);
  assert.strictEqual(swModel.canComplete, true);
  assert.strictEqual(swModel.canCancel, true);

  // 3. Paused Stopwatch Session
  const pausedStopwatch: TimerSession = {
    ...runningStopwatch,
    status: 'paused',
    currentSegmentStartedAt: null,
  };
  const pausedSwModel = getTimerDisplayModel(pausedStopwatch, stopwatchCalc, sampleHabits);
  assert.strictEqual(pausedSwModel.status, 'paused');
  assert.strictEqual(pausedSwModel.canPause, false);
  assert.strictEqual(pausedSwModel.canResume, true);

  // 4. Active Countdown Session (Running, with progress)
  const runningCountdown: TimerSession = {
    id: 'timer-2',
    habitId: null, // General focus
    type: 'countdown',
    status: 'running',
    startedAt: '2026-10-22T10:00:00.000Z',
    targetDurationSeconds: 1500, // 25 mins
    accumulatedSeconds: 300,
    currentSegmentStartedAt: '2026-10-22T10:05:00.000Z',
    endedAt: null,
    notes: 'Pomodoro block',
    createdAt: '2026-10-22T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z',
  };
  const countdownCalc: TimerCalculatedState = {
    elapsedSeconds: 300,
    remainingSeconds: 1200, // 20m remaining
    isExpired: false,
  };
  const cdModel = getTimerDisplayModel(runningCountdown, countdownCalc, sampleHabits);
  assert.strictEqual(cdModel.isActive, true);
  assert.strictEqual(cdModel.type, 'countdown');
  assert.strictEqual(cdModel.habitName, null);
  assert.strictEqual(cdModel.formattedTime, '20:00'); // Remaining time
  assert.strictEqual(cdModel.formattedTarget, '25:00');
  assert.strictEqual(cdModel.progressPercent, 20); // 300 / 1500 = 20%
  assert.strictEqual(cdModel.isExpired, false);

  // 5. Expired Countdown Session (Target reached)
  const expiredCalc: TimerCalculatedState = {
    elapsedSeconds: 1510,
    remainingSeconds: 0,
    isExpired: true,
  };
  const expiredModel = getTimerDisplayModel(runningCountdown, expiredCalc, sampleHabits);
  assert.strictEqual(expiredModel.isExpired, true);
  assert.strictEqual(expiredModel.formattedTime, '00:00');
  assert.strictEqual(expiredModel.progressPercent, 100);
  assert.strictEqual(expiredModel.canComplete, true);
});
