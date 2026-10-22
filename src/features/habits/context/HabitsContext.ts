/**
 * Habits and Timer React Context and Provider for LifeHub.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08, FR-09, Slice 6B).
 * Connects HabitsStore to React tree using React 19's standard useSyncExternalStore.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { HabitsContextValue, HabitsProviderProps } from './types.ts';
import {
  SqliteHabitRepository,
  SqliteTimerRepository,
} from '../repositories/index.ts';
import { HabitsStore } from './HabitsStore.ts';
import { getTodayDateString } from '../../../utils/date.ts';

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({
  children,
  initialDate,
  habitRepo: habitRepoProp,
  timerRepo: timerRepoProp,
  store: storeProp,
}: HabitsProviderProps) {
  // 1. Stable store instance
  const store = useMemo(() => {
    if (storeProp) {
      return storeProp;
    }
    const hRepo = habitRepoProp ?? new SqliteHabitRepository();
    const tRepo = timerRepoProp ?? new SqliteTimerRepository();
    return new HabitsStore(initialDate ?? getTodayDateString(), hRepo, tRepo);
  }, [storeProp, initialDate, habitRepoProp, timerRepoProp]);

  // 2. Subscribe to reactive store using useSyncExternalStore
  const state = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getState(),
    () => store.getState()
  );

  // 3. Trigger initial habits and active timer load on mount or store change
  useEffect(() => {
    store.loadData(state.selectedDate);
  }, [store]);

  // 4. Stable context value bundling state and store actions
  const contextValue = useMemo<HabitsContextValue>(
    () => ({
      ...state,
      setSelectedDate: (date: string) => store.setSelectedDate(date),
      refresh: () => store.refresh(),

      // Habit operations
      createHabit: (input) => store.createHabit(input),
      updateHabit: (id, input) => store.updateHabit(id, input),
      archiveHabit: (id) => store.archiveHabit(id),
      unarchiveHabit: (id) => store.unarchiveHabit(id),
      deleteHabit: (id) => store.deleteHabit(id),

      // Completion operations
      recordCompletion: (input) => store.recordCompletion(input),
      removeCompletion: (habitId, completedDate) => store.removeCompletion(habitId, completedDate),
      toggleCompletion: (habitId, completedDate) => store.toggleCompletion(habitId, completedDate),
      isHabitCompletedOnDate: (habitId, completedDate) => store.isHabitCompletedOnDate(habitId, completedDate),

      // Timer operations
      startStopwatch: (habitId, notes, nowIso) => store.startStopwatch(habitId, notes, nowIso),
      startCountdown: (targetDurationSeconds, habitId, notes, nowIso) =>
        store.startCountdown(targetDurationSeconds, habitId, notes, nowIso),
      pauseTimer: (nowIso) => store.pauseTimer(nowIso),
      resumeTimer: (nowIso) => store.resumeTimer(nowIso),
      completeTimer: (nowIso) => store.completeTimer(nowIso),
      cancelTimer: (nowIso) => store.cancelTimer(nowIso),
      syncTimerState: (nowIso) => store.syncTimerState(nowIso),
      getCalculatedTimerState: (nowIso) => store.getCalculatedTimerState(nowIso),
    }),
    [state, store]
  );

  return React.createElement(HabitsContext.Provider, { value: contextValue }, children);
}

/**
 * Primary custom hook to access the complete Habits and Timer state and operations.
 */
export function useHabits(): HabitsContextValue {
  let context: HabitsContextValue | null = null;
  try {
    context = useContext(HabitsContext);
  } catch {
    throw new Error('useHabits must be used within a HabitsProvider');
  }

  if (!context) {
    throw new Error('useHabits must be used within a HabitsProvider');
  }
  return context;
}
