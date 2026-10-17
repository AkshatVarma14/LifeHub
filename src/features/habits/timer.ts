/**
 * Timer Domain Calculations and State Transitions for LifeHub.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08, FR-09).
 *
 * Core Principle: Elapsed time and remaining time are derived deterministically
 * from persisted UTC timestamps and accumulated seconds.
 * No reliance on foreground device counters or background timer ticks.
 */

import type {
  TimerSession,
  TimerCalculatedState,
} from '../../types/habits.ts';
import type {
  TimerSessionInput,
  UpdateTimerInput,
} from './validation.ts';
import { normalizeToUtcIso } from '../../utils/date.ts';

/**
 * Calculates the current elapsed and remaining time for a timer session.
 * Fully deterministic: accepts an optional `nowIso` reference timestamp.
 */
export function calculateTimerState(
  session: TimerSession,
  nowIso?: string
): TimerCalculatedState {
  const referenceNowMs = nowIso ? new Date(normalizeToUtcIso(nowIso)).getTime() : Date.now();

  let elapsed = session.accumulatedSeconds;

  if (session.status === 'running' && session.currentSegmentStartedAt) {
    const segmentStartMs = new Date(session.currentSegmentStartedAt).getTime();
    if (!isNaN(segmentStartMs) && referenceNowMs > segmentStartMs) {
      const activeSegmentSeconds = Math.floor((referenceNowMs - segmentStartMs) / 1000);
      elapsed += Math.max(0, activeSegmentSeconds);
    }
  }

  if (session.type === 'stopwatch') {
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: null,
      isExpired: false,
    };
  }

  // Countdown
  const target = session.targetDurationSeconds ?? 0;
  const remaining = Math.max(0, target - elapsed);
  const isExpired = elapsed >= target;

  return {
    elapsedSeconds: elapsed,
    remainingSeconds: remaining,
    isExpired,
  };
}

/**
 * Creates input to start a new stopwatch session.
 */
export function createStopwatchInput(
  habitId?: string | null,
  notes?: string | null,
  nowIso?: string
): TimerSessionInput {
  const startedAt = nowIso ? normalizeToUtcIso(nowIso) : new Date().toISOString();
  return {
    habitId: habitId ?? null,
    type: 'stopwatch',
    status: 'running',
    startedAt,
    targetDurationSeconds: null,
    accumulatedSeconds: 0,
    currentSegmentStartedAt: startedAt,
    endedAt: null,
    notes: notes ?? null,
  };
}

/**
 * Creates input to start a new countdown session.
 */
export function createCountdownInput(
  targetDurationSeconds: number,
  habitId?: string | null,
  notes?: string | null,
  nowIso?: string
): TimerSessionInput {
  const startedAt = nowIso ? normalizeToUtcIso(nowIso) : new Date().toISOString();
  return {
    habitId: habitId ?? null,
    type: 'countdown',
    status: 'running',
    startedAt,
    targetDurationSeconds,
    accumulatedSeconds: 0,
    currentSegmentStartedAt: startedAt,
    endedAt: null,
    notes: notes ?? null,
  };
}

/**
 * Computes updates to transition a running session into 'paused'.
 * Freezes elapsed time by adding active segment duration to accumulatedSeconds.
 * Throws if the session is not currently running.
 */
export function transitionPause(
  session: TimerSession,
  nowIso?: string
): UpdateTimerInput {
  if (session.status !== 'running') {
    throw new Error(`Cannot pause timer session: current status is '${session.status}', expected 'running'`);
  }

  const { elapsedSeconds } = calculateTimerState(session, nowIso);

  return {
    status: 'paused',
    accumulatedSeconds: elapsedSeconds,
    currentSegmentStartedAt: null,
  };
}

/**
 * Computes updates to transition a paused session back into 'running'.
 * Marks currentSegmentStartedAt with the resume timestamp.
 * Throws if the session is not currently paused.
 */
export function transitionResume(
  session: TimerSession,
  nowIso?: string
): UpdateTimerInput {
  if (session.status !== 'paused') {
    throw new Error(`Cannot resume timer session: current status is '${session.status}', expected 'paused'`);
  }

  const resumeTimestamp = nowIso ? normalizeToUtcIso(nowIso) : new Date().toISOString();
  if (resumeTimestamp < session.startedAt) {
    throw new Error(`Resume timestamp '${resumeTimestamp}' cannot be earlier than session startedAt '${session.startedAt}'`);
  }

  return {
    status: 'running',
    currentSegmentStartedAt: resumeTimestamp,
  };
}

/**
 * Computes updates to complete a session (from running or paused).
 * Records endedAt and freezes accumulatedSeconds.
 */
export function transitionComplete(
  session: TimerSession,
  nowIso?: string
): UpdateTimerInput {
  if (session.status === 'completed' || session.status === 'cancelled') {
    throw new Error(`Cannot complete session: session is already '${session.status}'`);
  }

  const endTimestamp = nowIso ? normalizeToUtcIso(nowIso) : new Date().toISOString();
  if (endTimestamp < session.startedAt) {
    throw new Error(`Ended at timestamp '${endTimestamp}' cannot be earlier than session startedAt '${session.startedAt}'`);
  }

  const { elapsedSeconds } = calculateTimerState(session, endTimestamp);

  let finalAccumulated = elapsedSeconds;
  if (
    session.type === 'countdown' &&
    typeof session.targetDurationSeconds === 'number' &&
    session.targetDurationSeconds > 0
  ) {
    finalAccumulated = Math.min(session.targetDurationSeconds, elapsedSeconds);
  }

  return {
    status: 'completed',
    accumulatedSeconds: finalAccumulated,
    currentSegmentStartedAt: null,
    endedAt: endTimestamp,
  };
}

/**
 * Computes updates to cancel/abort a session.
 */
export function transitionCancel(
  session: TimerSession,
  nowIso?: string
): UpdateTimerInput {
  if (session.status === 'completed' || session.status === 'cancelled') {
    throw new Error(`Cannot cancel session: session is already '${session.status}'`);
  }

  const endTimestamp = nowIso ? normalizeToUtcIso(nowIso) : new Date().toISOString();
  if (endTimestamp < session.startedAt) {
    throw new Error(`Ended at timestamp '${endTimestamp}' cannot be earlier than session startedAt '${session.startedAt}'`);
  }

  const { elapsedSeconds } = calculateTimerState(session, endTimestamp);

  return {
    status: 'cancelled',
    accumulatedSeconds: elapsedSeconds,
    currentSegmentStartedAt: null,
    endedAt: endTimestamp,
  };
}
