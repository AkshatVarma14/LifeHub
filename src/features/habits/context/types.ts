/**
 * Habits and Timer State and Context Types for LifeHub.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08, FR-09, Slice 6B).
 */

import type React from 'react';
import type {
  Habit,
  HabitCompletion,
  TimerSession,
  TimerCalculatedState,
  HabitStreakSummary,
} from '../../../types/habits.ts';
import type {
  HabitInput,
  CompletionInput,
} from '../validation.ts';
import type {
  HabitRepository,
  TimerRepository,
} from '../repositories/types.ts';

export interface HabitsStoreState {
  isLoading: boolean;
  isMutating: boolean;
  isMutatingTimer: boolean;
  error: Error | null;

  // Habits collections
  habits: Habit[]; // Active habits (!isArchived)
  archivedHabits: Habit[]; // Archived habits (isArchived)

  // Completions & Streaks
  selectedDate: string; // Format: YYYY-MM-DD
  completionsByHabitId: Record<string, HabitCompletion[]>;
  completionsForSelectedDate: HabitCompletion[];
  streaksByHabitId: Record<string, HabitStreakSummary>;

  // Active Timer Session & Calculated State
  activeTimer: TimerSession | null;
  activeTimerCalculatedState: TimerCalculatedState | null;
}

export type StoreListener = () => void;

export interface HabitsContextValue extends HabitsStoreState {
  // Navigation / Date selection & Refresh
  setSelectedDate: (date: string) => Promise<void>;
  refresh: () => Promise<void>;

  // Habit mutations
  createHabit: (input: HabitInput) => Promise<Habit>;
  updateHabit: (id: string, input: HabitInput) => Promise<Habit>;
  archiveHabit: (id: string) => Promise<Habit>;
  unarchiveHabit: (id: string) => Promise<Habit>;
  deleteHabit: (id: string) => Promise<void>;

  // Completion mutations & queries
  recordCompletion: (input: CompletionInput) => Promise<HabitCompletion>;
  removeCompletion: (habitId: string, completedDate: string) => Promise<boolean>;
  toggleCompletion: (habitId: string, completedDate?: string) => Promise<boolean>;
  isHabitCompletedOnDate: (habitId: string, completedDate: string) => boolean;

  // Timer mutations & queries
  startStopwatch: (habitId?: string | null, notes?: string | null, nowIso?: string) => Promise<TimerSession>;
  startCountdown: (targetDurationSeconds: number, habitId?: string | null, notes?: string | null, nowIso?: string) => Promise<TimerSession>;
  pauseTimer: (nowIso?: string) => Promise<TimerSession>;
  resumeTimer: (nowIso?: string) => Promise<TimerSession>;
  completeTimer: (nowIso?: string) => Promise<TimerSession>;
  cancelTimer: (nowIso?: string) => Promise<TimerSession>;
  syncTimerState: (nowIso?: string) => TimerCalculatedState | null;
  getCalculatedTimerState: (nowIso?: string) => TimerCalculatedState | null;
}

export interface HabitsProviderProps {
  children: React.ReactNode;
  initialDate?: string;
  habitRepo?: HabitRepository;
  timerRepo?: TimerRepository;
  store?: import('./HabitsStore.ts').HabitsStore;
}
