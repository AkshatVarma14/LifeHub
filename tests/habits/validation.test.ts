import test from 'node:test';
import assert from 'node:assert';
import type { TimerSession } from '../../src/types/habits.ts';
import {
  validateHabitInput,
  validateCompletionInput,
  validateTimerSessionInput,
  validateUpdateTimerInput,
} from '../../src/features/habits/validation.ts';

test('Habits Validation: validateHabitInput valid cases and sanitization', () => {
  // 1. Minimal valid habit
  const minimal = validateHabitInput({ name: 'Daily Reading' });
  assert.strictEqual(minimal.isValid, true);
  assert.deepStrictEqual(minimal.errors, []);
  assert.strictEqual(minimal.sanitized?.name, 'Daily Reading');
  assert.strictEqual(minimal.sanitized?.description, null);
  assert.strictEqual(minimal.sanitized?.isArchived, false);
  assert.strictEqual(minimal.sanitized?.id, undefined);

  // 2. Full valid habit with whitespace trimming
  const full = validateHabitInput({
    id: 'h_custom_1',
    name: '  Exercise 30m  ',
    description: '  Morning workout or run  ',
    isArchived: true,
  });
  assert.strictEqual(full.isValid, true);
  assert.strictEqual(full.sanitized?.id, 'h_custom_1');
  assert.strictEqual(full.sanitized?.name, 'Exercise 30m');
  assert.strictEqual(full.sanitized?.description, 'Morning workout or run');
  assert.strictEqual(full.sanitized?.isArchived, true);

  // 3. Empty string description becomes null
  const emptyDesc = validateHabitInput({
    name: 'Journaling',
    description: '   ',
  });
  assert.strictEqual(emptyDesc.isValid, true);
  assert.strictEqual(emptyDesc.sanitized?.description, null);
});

test('Habits Validation: validateHabitInput rejection cases', () => {
  // Non-object
  assert.strictEqual(validateHabitInput(null).isValid, false);
  assert.strictEqual(validateHabitInput('string').isValid, false);

  // Missing or empty name
  const noName = validateHabitInput({});
  assert.strictEqual(noName.isValid, false);
  assert.match(noName.errors.join('; '), /name cannot be empty/i);

  const emptyName = validateHabitInput({ name: '   ' });
  assert.strictEqual(emptyName.isValid, false);

  // Name too long (> 100 chars)
  const longName = validateHabitInput({ name: 'A'.repeat(101) });
  assert.strictEqual(longName.isValid, false);
  assert.match(longName.errors.join('; '), /cannot exceed 100 characters/i);

  // Description too long (> 500 chars)
  const longDesc = validateHabitInput({
    name: 'Reading',
    description: 'B'.repeat(501),
  });
  assert.strictEqual(longDesc.isValid, false);
  assert.match(longDesc.errors.join('; '), /cannot exceed 500 characters/i);

  // Invalid isArchived type
  const badArchived = validateHabitInput({
    name: 'Reading',
    isArchived: 'yes' as any,
  });
  assert.strictEqual(badArchived.isValid, false);
  assert.match(badArchived.errors.join('; '), /must be a boolean/i);
});

test('Habits Validation: validateCompletionInput valid cases and defaults', () => {
  // 1. Minimal valid completion
  const minimal = validateCompletionInput({
    habitId: 'h_1',
    completedDate: '2026-10-18',
  });
  assert.strictEqual(minimal.isValid, true);
  assert.strictEqual(minimal.sanitized?.habitId, 'h_1');
  assert.strictEqual(minimal.sanitized?.completedDate, '2026-10-18');
  assert.ok(minimal.sanitized?.completedAt);
  assert.strictEqual(minimal.sanitized?.notes, null);

  // 2. Custom completedAt and notes
  const full = validateCompletionInput({
    habitId: 'h_2',
    completedDate: '2026-10-15',
    completedAt: '2026-10-15T14:30:00.000Z',
    notes: 'Did 10 extra reps',
  });
  assert.strictEqual(full.isValid, true);
  assert.strictEqual(full.sanitized?.completedAt, '2026-10-15T14:30:00.000Z');
  assert.strictEqual(full.sanitized?.notes, 'Did 10 extra reps');
});

test('Habits Validation: validateCompletionInput rejection cases', () => {
  // Missing habitId
  const noHabit = validateCompletionInput({ completedDate: '2026-10-18' });
  assert.strictEqual(noHabit.isValid, false);
  assert.match(noHabit.errors.join('; '), /habit id is required/i);

  // Invalid calendar date
  const badDate = validateCompletionInput({
    habitId: 'h_1',
    completedDate: '2026-02-31',
  });
  assert.strictEqual(badDate.isValid, false);
  assert.match(badDate.errors.join('; '), /invalid completed date/i);

  // Invalid completedAt timestamp
  const badTimestamp = validateCompletionInput({
    habitId: 'h_1',
    completedDate: '2026-10-18',
    completedAt: 'not-a-timestamp',
  });
  assert.strictEqual(badTimestamp.isValid, false);
  assert.match(badTimestamp.errors.join('; '), /invalid completedat timestamp/i);

  // Notes too long
  const longNotes = validateCompletionInput({
    habitId: 'h_1',
    completedDate: '2026-10-18',
    notes: 'N'.repeat(501),
  });
  assert.strictEqual(longNotes.isValid, false);
  assert.match(longNotes.errors.join('; '), /cannot exceed 500 characters/i);
});

test('Habits Validation: validateTimerSessionInput for stopwatch and countdown', () => {
  // 1. Valid stopwatch
  const sw = validateTimerSessionInput({
    type: 'stopwatch',
    habitId: 'h_1',
  });
  assert.strictEqual(sw.isValid, true);
  assert.strictEqual(sw.sanitized?.type, 'stopwatch');
  assert.strictEqual(sw.sanitized?.status, 'running');
  assert.strictEqual(sw.sanitized?.targetDurationSeconds, null);
  assert.strictEqual(sw.sanitized?.accumulatedSeconds, 0);
  assert.ok(sw.sanitized?.currentSegmentStartedAt);

  // 2. Stopwatch with targetDurationSeconds rejected
  const badSw = validateTimerSessionInput({
    type: 'stopwatch',
    targetDurationSeconds: 600,
  });
  assert.strictEqual(badSw.isValid, false);
  assert.match(badSw.errors.join('; '), /target duration must be null for stopwatch/i);

  // 3. Valid countdown
  const cd = validateTimerSessionInput({
    type: 'countdown',
    targetDurationSeconds: 1500, // 25 min pomodoro
    habitId: 'h_study',
  });
  assert.strictEqual(cd.isValid, true);
  assert.strictEqual(cd.sanitized?.type, 'countdown');
  assert.strictEqual(cd.sanitized?.targetDurationSeconds, 1500);

  // 4. Countdown missing targetDurationSeconds rejected
  const cdMissing = validateTimerSessionInput({
    type: 'countdown',
  });
  assert.strictEqual(cdMissing.isValid, false);
  assert.match(cdMissing.errors.join('; '), /countdown target duration must be an integer/i);

  // 5. Countdown targetDurationSeconds <= 0 rejected
  const cdZero = validateTimerSessionInput({
    type: 'countdown',
    targetDurationSeconds: 0,
  });
  assert.strictEqual(cdZero.isValid, false);

  // 6. Countdown targetDurationSeconds > 86400 rejected
  const cdHuge = validateTimerSessionInput({
    type: 'countdown',
    targetDurationSeconds: 86401,
  });
  assert.strictEqual(cdHuge.isValid, false);

  // 7. Invalid timer type rejected
  const badType = validateTimerSessionInput({
    type: 'interval' as any,
  });
  assert.strictEqual(badType.isValid, false);
  assert.match(badType.errors.join('; '), /invalid timer type/i);
});

test('Habits Validation: validateTimerSessionInput chronological and status invariants', () => {
  const T_start = '2026-10-18T10:00:00.000Z';
  const T_earlier = '2026-10-18T09:59:00.000Z';
  const T_later = '2026-10-18T10:15:00.000Z';

  // 1. endedAt earlier than startedAt rejected
  const badEndedAt = validateTimerSessionInput({
    type: 'stopwatch',
    status: 'completed',
    startedAt: T_start,
    endedAt: T_earlier,
  });
  assert.strictEqual(badEndedAt.isValid, false);
  assert.match(badEndedAt.errors.join('; '), /endedat cannot be earlier than startedat/i);

  // 2. currentSegmentStartedAt earlier than startedAt rejected
  const badSegment = validateTimerSessionInput({
    type: 'stopwatch',
    status: 'running',
    startedAt: T_start,
    currentSegmentStartedAt: T_earlier,
  });
  assert.strictEqual(badSegment.isValid, false);
  assert.match(badSegment.errors.join('; '), /currentsegmentstartedat cannot be earlier than startedat/i);

  // 3. running session with endedAt set rejected
  const badRunning = validateTimerSessionInput({
    type: 'stopwatch',
    status: 'running',
    startedAt: T_start,
    endedAt: T_later,
  });
  assert.strictEqual(badRunning.isValid, false);
  assert.match(badRunning.errors.join('; '), /endedat must be null when timer session is running/i);

  // 4. paused session with endedAt set or currentSegmentStartedAt set rejected
  const badPaused1 = validateTimerSessionInput({
    type: 'stopwatch',
    status: 'paused',
    startedAt: T_start,
    endedAt: T_later,
  });
  assert.strictEqual(badPaused1.isValid, false);
  assert.match(badPaused1.errors.join('; '), /endedat must be null when timer session is paused/i);

  const badPaused2 = validateTimerSessionInput({
    type: 'stopwatch',
    status: 'paused',
    startedAt: T_start,
    currentSegmentStartedAt: T_later,
  });
  assert.strictEqual(badPaused2.isValid, false);
  assert.match(badPaused2.errors.join('; '), /currentsegmentstartedat must be null when timer session is paused/i);

  // 5. completed session with non-null currentSegmentStartedAt rejected
  const badCompleted = validateTimerSessionInput({
    type: 'stopwatch',
    status: 'completed',
    startedAt: T_start,
    currentSegmentStartedAt: T_later,
    endedAt: T_later,
  });
  assert.strictEqual(badCompleted.isValid, false);
  assert.match(badCompleted.errors.join('; '), /currentsegmentstartedat must be null when timer session is completed/i);
});

test('Habits Validation: F-4 validateUpdateTimerInput state machine & data integrity', () => {
  const T_start = '2026-10-18T10:00:00.000Z';
  const runningSession: TimerSession = {
    id: 'ts_active',
    habitId: 'h_1',
    type: 'countdown',
    status: 'running',
    startedAt: T_start,
    targetDurationSeconds: 1500,
    accumulatedSeconds: 0,
    currentSegmentStartedAt: T_start,
    endedAt: null,
    notes: null,
    createdAt: T_start,
    updatedAt: T_start,
  };

  const completedSession: TimerSession = {
    id: 'ts_done',
    habitId: 'h_1',
    type: 'countdown',
    status: 'completed',
    startedAt: T_start,
    targetDurationSeconds: 1500,
    accumulatedSeconds: 1500,
    currentSegmentStartedAt: null,
    endedAt: '2026-10-18T10:25:00.000Z',
    notes: 'Done',
    createdAt: T_start,
    updatedAt: T_start,
  };

  const cancelledSession: TimerSession = {
    ...completedSession,
    id: 'ts_cancelled',
    status: 'cancelled',
  };

  // 1. Terminal state transition rejection: completed -> running or paused
  const tryReviveCompleted = validateUpdateTimerInput({ status: 'running' }, completedSession);
  assert.strictEqual(tryReviveCompleted.isValid, false);
  assert.match(tryReviveCompleted.errors.join('; '), /cannot transition timer session from terminal status 'completed'/i);

  const tryReviveCancelled = validateUpdateTimerInput({ status: 'paused' }, cancelledSession);
  assert.strictEqual(tryReviveCancelled.isValid, false);
  assert.match(tryReviveCancelled.errors.join('; '), /cannot transition timer session from terminal status 'cancelled'/i);

  // 2. Modifying timestamps or accumulatedSeconds on terminal session rejected
  const tryMutateTime = validateUpdateTimerInput({ accumulatedSeconds: 500 }, completedSession);
  assert.strictEqual(tryMutateTime.isValid, false);
  assert.match(tryMutateTime.errors.join('; '), /cannot modify accumulatedseconds on terminal session/i);

  // 3. Updating notes on completed session is allowed
  const updateNotes = validateUpdateTimerInput({ notes: 'Updated notes after completion' }, completedSession);
  assert.strictEqual(updateNotes.isValid, true);
  assert.strictEqual(updateNotes.sanitized?.notes, 'Updated notes after completion');

  // 4. Negative accumulatedSeconds rejected
  const badAcc = validateUpdateTimerInput({ accumulatedSeconds: -50 }, runningSession);
  assert.strictEqual(badAcc.isValid, false);
  assert.match(badAcc.errors.join('; '), /accumulated seconds must be a non-negative integer/i);

  // 5. Malformed timestamps rejected
  const badTime = validateUpdateTimerInput({ endedAt: 'not-a-timestamp' }, runningSession);
  assert.strictEqual(badTime.isValid, false);
  assert.match(badTime.errors.join('; '), /invalid endedat timestamp/i);

  // 6. endedAt earlier than startedAt rejected
  const earlyEnded = validateUpdateTimerInput(
    { status: 'completed', endedAt: '2026-10-18T09:00:00.000Z', currentSegmentStartedAt: null },
    runningSession
  );
  assert.strictEqual(earlyEnded.isValid, false);
  assert.match(earlyEnded.errors.join('; '), /cannot be earlier than session startedat/i);

  // 7. Countdown completion with accumulatedSeconds exceeding target rejected
  const overTarget = validateUpdateTimerInput(
    {
      status: 'completed',
      accumulatedSeconds: 1600,
      currentSegmentStartedAt: null,
      endedAt: '2026-10-18T10:30:00.000Z',
    },
    runningSession
  );
  assert.strictEqual(overTarget.isValid, false);
  assert.match(overTarget.errors.join('; '), /cannot exceed countdown target duration/i);

  // 8. Invalid status/timestamp combinations:
  // Transitioning to paused while leaving currentSegmentStartedAt non-null rejected
  const badPause = validateUpdateTimerInput(
    { status: 'paused', currentSegmentStartedAt: T_start },
    runningSession
  );
  assert.strictEqual(badPause.isValid, false);
  assert.match(badPause.errors.join('; '), /currentsegmentstartedat must be null when timer session is paused/i);

  // Transitioning to completed without setting endedAt rejected
  const badCompleteNoEnd = validateUpdateTimerInput(
    { status: 'completed', currentSegmentStartedAt: null },
    runningSession
  );
  assert.strictEqual(badCompleteNoEnd.isValid, false);
  assert.match(badCompleteNoEnd.errors.join('; '), /endedat must be set when timer session is completed/i);

  // 9. Valid pause update succeeds
  const validPause = validateUpdateTimerInput(
    { status: 'paused', accumulatedSeconds: 600, currentSegmentStartedAt: null },
    runningSession
  );
  assert.strictEqual(validPause.isValid, true);
  assert.strictEqual(validPause.sanitized?.status, 'paused');
  assert.strictEqual(validPause.sanitized?.accumulatedSeconds, 600);
  assert.strictEqual(validPause.sanitized?.currentSegmentStartedAt, null);

  // 10. Valid complete update succeeds
  const validComplete = validateUpdateTimerInput(
    {
      status: 'completed',
      accumulatedSeconds: 1500,
      currentSegmentStartedAt: null,
      endedAt: '2026-10-18T10:25:00.000Z',
    },
    runningSession
  );
  assert.strictEqual(validComplete.isValid, true);
  assert.strictEqual(validComplete.sanitized?.status, 'completed');
  assert.strictEqual(validComplete.sanitized?.accumulatedSeconds, 1500);
  assert.strictEqual(validComplete.sanitized?.endedAt, '2026-10-18T10:25:00.000Z');
});

