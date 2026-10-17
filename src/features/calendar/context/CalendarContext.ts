/**
 * Calendar React Context and Provider for LifeHub.
 * Stage 1: Calendar Persistence & State Management (FR-07, Slice 5B).
 * Connects CalendarStore to React tree using React 19's standard useSyncExternalStore.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { CalendarContextValue, CalendarProviderProps } from './types.ts';
import { SqliteEventRepository } from '../repositories/index.ts';
import { CalendarStore } from './CalendarStore.ts';
import { getCurrentMonthString } from '../../../utils/date.ts';

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({
  children,
  initialMonth,
  eventRepo: repoProp,
  store: storeProp,
}: CalendarProviderProps) {
  // 1. Stable store instance
  const store = useMemo(() => {
    if (storeProp) {
      return storeProp;
    }
    const repo = repoProp ?? new SqliteEventRepository();
    return new CalendarStore(initialMonth ?? getCurrentMonthString(), repo);
  }, [storeProp, initialMonth, repoProp]);

  // 2. Subscribe to reactive store
  const state = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getState(),
    () => store.getState()
  );

  // 3. Trigger initial month data load on mount or store change
  useEffect(() => {
    store.loadMonth(state.selectedMonth);
  }, [store]);

  // 4. Stable context value bundling state and store actions
  const contextValue = useMemo<CalendarContextValue>(
    () => ({
      ...state,
      setSelectedMonth: (month: string) => {
        store.setSelectedMonth(month);
      },
      loadMonth: (month: string) => store.loadMonth(month),
      selectMonth: (month: string) => store.selectMonth(month),
      createEvent: (input) => store.createEvent(input),
      updateEvent: (id, input) => store.updateEvent(id, input),
      updateEventStatus: (id, status) => store.updateEventStatus(id, status),
      deleteEvent: (id) => store.deleteEvent(id),
      refresh: () => store.refresh(),
    }),
    [state, store]
  );

  return React.createElement(CalendarContext.Provider, { value: contextValue }, children);
}

/**
 * Primary custom hook to access the complete Calendar state and operations.
 */
export function useCalendar(): CalendarContextValue {
  let context: CalendarContextValue | null = null;
  try {
    context = useContext(CalendarContext);
  } catch {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }

  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}
