/**
 * Focus Timer UI Formatting and Validation Helpers for LifeHub.
 * Stage 1: Focus Timer UI and Controls (Slice 6D).
 * Pure deterministic functions.
 */

import type {
  Habit,
  TimerSession,
  TimerCalculatedState,
} from '../../../types/habits.ts';
import { MAX_COUNTDOWN_SECONDS } from '../validation.ts';

export interface DurationValidationResult {
  isValid: boolean;
  targetDurationSeconds?: number;
  error?: string;
}

/**
 * Formats a duration in seconds into a human-readable digital clock string.
 * Formats:
 * - MM:SS (e.g. "00:00", "05:30", "25:00") when under 1 hour
 * - HH:MM:SS (e.g. "01:05:30", "12:00:00") when 1 hour or more
 * Handles negative or invalid numbers by returning "00:00".
 */
export function formatTimerDuration(totalSeconds: number): string {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds <= 0) {
    return '00:00';
  }

  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

/**
 * Validates a countdown duration provided in minutes (from presets or user input).
 * Must be an integer between 1 and 1440 minutes (24 hours).
 */
export function validateCountdownDurationMinutes(minutesInput: unknown): DurationValidationResult {
  if (minutesInput === undefined || minutesInput === null || minutesInput === '') {
    return {
      isValid: false,
      error: 'Duration in minutes is required',
    };
  }

  let numMinutes: number;
  if (typeof minutesInput === 'number') {
    numMinutes = minutesInput;
  } else if (typeof minutesInput === 'string') {
    const trimmed = minutesInput.trim();
    if (!/^\d+$/.test(trimmed)) {
      return {
        isValid: false,
        error: 'Duration must be a whole positive number of minutes',
      };
    }
    numMinutes = parseInt(trimmed, 10);
  } else {
    return {
      isValid: false,
      error: 'Duration must be a number or numeric string',
    };
  }

  if (isNaN(numMinutes) || !Number.isInteger(numMinutes) || numMinutes <= 0) {
    return {
      isValid: false,
      error: 'Duration must be at least 1 minute',
    };
  }

  const maxMinutes = Math.floor(MAX_COUNTDOWN_SECONDS / 60); // 1440 minutes (24 hours)
  if (numMinutes > maxMinutes) {
    return {
      isValid: false,
      error: `Duration cannot exceed ${maxMinutes} minutes (24 hours)`,
    };
  }

  const targetDurationSeconds = numMinutes * 60;
  return {
    isValid: true,
    targetDurationSeconds,
  };
}

export interface TimerDisplayModel {
  isActive: boolean;
  type: 'stopwatch' | 'countdown' | null;
  status: 'running' | 'paused' | null;
  habitId: string | null;
  habitName: string | null;
  formattedTime: string;
  formattedTarget: string | null;
  isExpired: boolean;
  progressPercent: number | null;
  canPause: boolean;
  canResume: boolean;
  canComplete: boolean;
  canCancel: boolean;
}

/**
 * Derives a clean view model for rendering the focus timer in the UI.
 * Connects the persisted session, timestamp-calculated state, and habits collection.
 */
export function getTimerDisplayModel(
  session: TimerSession | null,
  calculated: TimerCalculatedState | null,
  habits: Habit[] = []
): TimerDisplayModel {
  if (!session) {
    return {
      isActive: false,
      type: null,
      status: null,
      habitId: null,
      habitName: null,
      formattedTime: '00:00',
      formattedTarget: null,
      isExpired: false,
      progressPercent: null,
      canPause: false,
      canResume: false,
      canComplete: false,
      canCancel: false,
    };
  }

  let habitName: string | null = null;
  if (session.habitId) {
    const matched = habits.find((h) => h.id === session.habitId);
    habitName = matched ? matched.name : 'Unknown Habit';
  }

  const isStopwatch = session.type === 'stopwatch';
  const elapsed = calculated?.elapsedSeconds ?? session.accumulatedSeconds;
  const remaining = calculated?.remainingSeconds ?? (session.targetDurationSeconds ? Math.max(0, session.targetDurationSeconds - elapsed) : null);
  const isExpired = calculated?.isExpired ?? (session.targetDurationSeconds !== null && elapsed >= (session.targetDurationSeconds ?? 0));

  let formattedTime = '00:00';
  let formattedTarget: string | null = null;
  let progressPercent: number | null = null;

  if (isStopwatch) {
    formattedTime = formatTimerDuration(elapsed);
  } else {
    // Countdown
    const targetSeconds = session.targetDurationSeconds ?? 0;
    formattedTime = formatTimerDuration(remaining ?? 0);
    formattedTarget = formatTimerDuration(targetSeconds);
    if (targetSeconds > 0) {
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / targetSeconds) * 100)));
    }
  }

  const isRunning = session.status === 'running';
  const isPaused = session.status === 'paused';

  return {
    isActive: true,
    type: session.type,
    status: isRunning ? 'running' : isPaused ? 'paused' : null,
    habitId: session.habitId,
    habitName,
    formattedTime,
    formattedTarget,
    isExpired,
    progressPercent,
    canPause: isRunning,
    canResume: isPaused,
    canComplete: isRunning || isPaused,
    canCancel: isRunning || isPaused,
  };
}
