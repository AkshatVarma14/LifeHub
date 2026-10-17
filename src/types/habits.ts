/**
 * Habits and Focus Timer Domain Types for LifeHub.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08, FR-09).
 * All timestamps are stored as canonical UTC ISO-8601 strings (ending in 'Z').
 * Completion dates use 'YYYY-MM-DD' representing local calendar days.
 */

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string; // Canonical UTC ISO-8601
  updatedAt: string; // Canonical UTC ISO-8601
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedDate: string; // Format: YYYY-MM-DD (local calendar day of completion)
  completedAt: string; // Canonical UTC ISO-8601 (exact recording instant)
  notes: string | null;
  createdAt: string; // Canonical UTC ISO-8601
}

export type TimerType = 'stopwatch' | 'countdown';
export type TimerStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export interface TimerSession {
  id: string;
  habitId: string | null;
  type: TimerType;
  status: TimerStatus;
  startedAt: string; // Canonical UTC ISO-8601
  targetDurationSeconds: number | null; // Positive integer for countdown; null for stopwatch
  accumulatedSeconds: number; // Elapsed seconds accumulated across closed running segments
  currentSegmentStartedAt: string | null; // Timestamp when active running segment started; null when paused/ended
  endedAt: string | null; // Canonical UTC ISO-8601 when completed or cancelled
  notes: string | null;
  createdAt: string; // Canonical UTC ISO-8601
  updatedAt: string; // Canonical UTC ISO-8601
}

export interface TimerCalculatedState {
  elapsedSeconds: number;
  remainingSeconds: number | null; // null for stopwatch; integer >= 0 for countdown
  isExpired: boolean; // true if countdown target is reached or exceeded
}

export interface HabitStreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
}
