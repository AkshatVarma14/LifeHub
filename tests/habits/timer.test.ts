import test from 'node:test';
import assert from 'node:assert';
import type { TimerSession } from '../../src/types/habits.ts';
import {
  calculateTimerState,
  createStopwatchInput,
  createCountdownInput,
  transitionPause,
  transitionResume,
  transitionComplete,
  transitionCancel,
} from '../../src/features/habits/timer.ts';

test('Timer Domain: Stopwatch elapsed-time calculation from timestamps', () => {
  const T0 = '2026-10-18T10:00:00.000Z';
  const session: TimerSession = {
    id: 'ts_sw_1',
    habitId: null,
    type: 'stopwatch',
    status: 'running',
    startedAt: T0,
    targetDurationSeconds: null,
    accumulatedSeconds: 0,
    currentSegmentStartedAt: T0,
    endedAt: null,
    notes: null,
    createdAt: T0,
    updatedAt: T0,
  };

  // Immediate start: 0s
  const state0 = calculateTimerState(session, T0);
  assert.strictEqual(state0.elapsedSeconds, 0);
  assert.strictEqual(state0.remainingSeconds, null);
  assert.strictEqual(state0.isExpired, false);

  // 45 seconds later
  const state45 = calculateTimerState(session, '2026-10-18T10:00:45.000Z');
  assert.strictEqual(state45.elapsedSeconds, 45);
  assert.strictEqual(state45.remainingSeconds, null);

  // 3600 seconds (1 hour) later
  const state1h = calculateTimerState(session, '2026-10-18T11:00:00.000Z');
  assert.strictEqual(state1h.elapsedSeconds, 3600);
});

test('Timer Domain: Countdown remaining-time and expiration calculation', () => {
  const T0 = '2026-10-18T14:00:00.000Z';
  const session: TimerSession = {
    id: 'ts_cd_1',
    habitId: 'h_focus',
    type: 'countdown',
    status: 'running',
    startedAt: T0,
    targetDurationSeconds: 1500, // 25 minutes pomodoro
    accumulatedSeconds: 0,
    currentSegmentStartedAt: T0,
    endedAt: null,
    notes: null,
    createdAt: T0,
    updatedAt: T0,
  };

  // Immediate: remaining is 1500, elapsed is 0, not expired
  const state0 = calculateTimerState(session, T0);
  assert.strictEqual(state0.elapsedSeconds, 0);
  assert.strictEqual(state0.remainingSeconds, 1500);
  assert.strictEqual(state0.isExpired, false);

  // 500 seconds elapsed (remaining = 1000)
  const state500 = calculateTimerState(session, '2026-10-18T14:08:20.000Z');
  assert.strictEqual(state500.elapsedSeconds, 500);
  assert.strictEqual(state500.remainingSeconds, 1000);
  assert.strictEqual(state500.isExpired, false);

  // Exact target reached at 1500s: remaining is 0, isExpired is true
  const stateExact = calculateTimerState(session, '2026-10-18T14:25:00.000Z');
  assert.strictEqual(stateExact.elapsedSeconds, 1500);
  assert.strictEqual(stateExact.remainingSeconds, 0);
  assert.strictEqual(stateExact.isExpired, true);

  // Exceeded target (e.g. app reopened after 1800s): remaining clamped to 0
  const stateOver = calculateTimerState(session, '2026-10-18T14:30:00.000Z');
  assert.strictEqual(stateOver.elapsedSeconds, 1800);
  assert.strictEqual(stateOver.remainingSeconds, 0);
  assert.strictEqual(stateOver.isExpired, true);
});

test('Timer Domain: Multi-segment pause and resume state transitions', () => {
  const T0 = '2026-10-18T10:00:00.000Z';
  let session: TimerSession = {
    id: 'ts_pause_test',
    habitId: null,
    type: 'stopwatch',
    status: 'running',
    startedAt: T0,
    targetDurationSeconds: null,
    accumulatedSeconds: 0,
    currentSegmentStartedAt: T0,
    endedAt: null,
    notes: null,
    createdAt: T0,
    updatedAt: T0,
  };

  // Run for 120 seconds, then pause at T1 (10:02:00)
  const T1 = '2026-10-18T10:02:00.000Z';
  const pauseUpdates = transitionPause(session, T1);
  assert.strictEqual(pauseUpdates.status, 'paused');
  assert.strictEqual(pauseUpdates.accumulatedSeconds, 120);
  assert.strictEqual(pauseUpdates.currentSegmentStartedAt, null);

  session = {
    ...session,
    ...pauseUpdates,
  };

  // While paused, check elapsed time 10 minutes later (10:12:00). Elapsed must STAY 120!
  const statePaused = calculateTimerState(session, '2026-10-18T10:12:00.000Z');
  assert.strictEqual(statePaused.elapsedSeconds, 120);

  // Resume at T2 (10:15:00)
  const T2 = '2026-10-18T10:15:00.000Z';
  const resumeUpdates = transitionResume(session, T2);
  assert.strictEqual(resumeUpdates.status, 'running');
  assert.strictEqual(resumeUpdates.currentSegmentStartedAt, T2);

  session = {
    ...session,
    ...resumeUpdates,
  };

  // 60 seconds after resume (10:16:00), total elapsed must be 120 + 60 = 180 seconds!
  const stateAfterResume = calculateTimerState(session, '2026-10-18T10:16:00.000Z');
  assert.strictEqual(stateAfterResume.elapsedSeconds, 180);

  // Complete at T3 (10:18:00) -> 180s in segment 2, plus 120s from segment 1 = 300s total!
  const T3 = '2026-10-18T10:18:00.000Z';
  const completeUpdates = transitionComplete(session, T3);
  assert.strictEqual(completeUpdates.status, 'completed');
  assert.strictEqual(completeUpdates.accumulatedSeconds, 300);
  assert.strictEqual(completeUpdates.currentSegmentStartedAt, null);
  assert.strictEqual(completeUpdates.endedAt, T3);
});

test('Timer Domain: Deterministic simulation of app backgrounding and reopening', () => {
  // Scenario: User starts a 20-minute (1200 seconds) study countdown at 09:00:00
  const T_start = '2026-10-18T09:00:00.000Z';
  const sessionInput = createCountdownInput(1200, 'h_study', 'Chapter 4', T_start);

  const session: TimerSession = {
    id: 'ts_bg_sim',
    habitId: sessionInput.habitId!,
    type: 'countdown',
    status: 'running',
    startedAt: sessionInput.startedAt!,
    targetDurationSeconds: sessionInput.targetDurationSeconds!,
    accumulatedSeconds: sessionInput.accumulatedSeconds!,
    currentSegmentStartedAt: sessionInput.currentSegmentStartedAt!,
    endedAt: null,
    notes: sessionInput.notes!,
    createdAt: T_start,
    updatedAt: T_start,
  };

  // 1. App backgrounded immediately. User opens app 7 minutes (420s) later:
  const T_open1 = '2026-10-18T09:07:00.000Z';
  const state1 = calculateTimerState(session, T_open1);
  assert.strictEqual(state1.elapsedSeconds, 420);
  assert.strictEqual(state1.remainingSeconds, 780); // 1200 - 420 = 780s (13 minutes remaining)
  assert.strictEqual(state1.isExpired, false);

  // 2. App backgrounded again. User opens app 25 minutes (1500s) after start:
  const T_open2 = '2026-10-18T09:25:00.000Z';
  const state2 = calculateTimerState(session, T_open2);
  assert.strictEqual(state2.elapsedSeconds, 1500);
  assert.strictEqual(state2.remainingSeconds, 0); // clamped to 0
  assert.strictEqual(state2.isExpired, true);
});

test('Timer Domain: Invalid state transitions throw descriptive errors', () => {
  const T0 = '2026-10-18T10:00:00.000Z';
  const sessionRunning: TimerSession = {
    id: 'ts_running',
    habitId: null,
    type: 'stopwatch',
    status: 'running',
    startedAt: T0,
    targetDurationSeconds: null,
    accumulatedSeconds: 0,
    currentSegmentStartedAt: T0,
    endedAt: null,
    notes: null,
    createdAt: T0,
    updatedAt: T0,
  };

  // Cannot resume already running session
  assert.throws(
    () => transitionResume(sessionRunning),
    /Cannot resume timer session: current status is 'running', expected 'paused'/i
  );

  const sessionPaused: TimerSession = {
    ...sessionRunning,
    status: 'paused',
    currentSegmentStartedAt: null,
    accumulatedSeconds: 60,
  };

  // Cannot pause already paused session
  assert.throws(
    () => transitionPause(sessionPaused),
    /Cannot pause timer session: current status is 'paused', expected 'running'/i
  );

  const sessionCompleted: TimerSession = {
    ...sessionRunning,
    status: 'completed',
    endedAt: T0,
  };

  // Cannot pause, complete, or cancel an already completed session
  assert.throws(
    () => transitionPause(sessionCompleted),
    /Cannot pause timer session/i
  );
  assert.throws(
    () => transitionComplete(sessionCompleted),
    /session is already 'completed'/i
  );
  assert.throws(
    () => transitionCancel(sessionCompleted),
    /session is already 'completed'/i
  );
});

test('Timer Domain: F-3 Countdown expiry vs completed status & duration capping', () => {
  const T0 = '2026-10-18T10:00:00.000Z';
  const targetSeconds = 1500; // 25 min pomodoro

  const countdownSession: TimerSession = {
    id: 'ts_cd_cap_test',
    habitId: 'h_test',
    type: 'countdown',
    status: 'running',
    startedAt: T0,
    targetDurationSeconds: targetSeconds,
    accumulatedSeconds: 0,
    currentSegmentStartedAt: T0,
    endedAt: null,
    notes: null,
    createdAt: T0,
    updatedAt: T0,
  };

  // 1. Countdown completed before target (e.g., at 600s): accumulatedSeconds is 600
  const T_early = '2026-10-18T10:10:00.000Z'; // 10 min
  const earlyComplete = transitionComplete(countdownSession, T_early);
  assert.strictEqual(earlyComplete.status, 'completed');
  assert.strictEqual(earlyComplete.accumulatedSeconds, 600);
  assert.strictEqual(earlyComplete.endedAt, T_early);
  assert.strictEqual(earlyComplete.currentSegmentStartedAt, null);

  // 2. Countdown completed exactly at target (1500s): accumulatedSeconds is 1500
  const T_exact = '2026-10-18T10:25:00.000Z'; // 25 min
  const exactComplete = transitionComplete(countdownSession, T_exact);
  assert.strictEqual(exactComplete.status, 'completed');
  assert.strictEqual(exactComplete.accumulatedSeconds, 1500);
  assert.strictEqual(exactComplete.endedAt, T_exact);

  // 3. Countdown completed long after target (e.g. 4 hours later = 14400s):
  // calculateTimerState shows elapsed = 14400, isExpired = true, remaining = 0
  const T_late = '2026-10-18T14:00:00.000Z'; // 4 hours later
  const stateLate = calculateTimerState(countdownSession, T_late);
  assert.strictEqual(stateLate.elapsedSeconds, 14400);
  assert.strictEqual(stateLate.isExpired, true);
  assert.strictEqual(stateLate.remainingSeconds, 0);

  // But transitionComplete MUST cap accumulatedSeconds at targetDurationSeconds (1500s)!
  const lateComplete = transitionComplete(countdownSession, T_late);
  assert.strictEqual(lateComplete.status, 'completed');
  assert.strictEqual(lateComplete.accumulatedSeconds, 1500, 'Countdown accumulatedSeconds must be capped at targetDurationSeconds');
  assert.strictEqual(lateComplete.endedAt, T_late);

  // 4. Stopwatch completed long after start (e.g. 4 hours later): remains UNCAPPED!
  const stopwatchSession: TimerSession = {
    id: 'ts_sw_uncapped',
    habitId: null,
    type: 'stopwatch',
    status: 'running',
    startedAt: T0,
    targetDurationSeconds: null,
    accumulatedSeconds: 0,
    currentSegmentStartedAt: T0,
    endedAt: null,
    notes: null,
    createdAt: T0,
    updatedAt: T0,
  };

  const swComplete = transitionComplete(stopwatchSession, T_late);
  assert.strictEqual(swComplete.status, 'completed');
  assert.strictEqual(swComplete.accumulatedSeconds, 14400, 'Stopwatch accumulatedSeconds must remain uncapped');
  assert.strictEqual(swComplete.endedAt, T_late);

  // 5. Invalid transition: endedAt earlier than startedAt throws error
  const T_before = '2026-10-18T09:50:00.000Z';
  assert.throws(
    () => transitionComplete(countdownSession, T_before),
    /cannot be earlier than session startedAt/i
  );
  assert.throws(
    () => transitionCancel(countdownSession, T_before),
    /cannot be earlier than session startedAt/i
  );
});

