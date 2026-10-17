/**
 * Calendar State and Context Types for LifeHub.
 * Stage 1: Calendar Persistence & State Management (FR-07, Slice 5B).
 */

import type React from 'react';
import type { CalendarEvent, EventStatus } from '../../../types/calendar.ts';
import type { EventRepository } from '../repositories/types.ts';

export interface CalendarState {
  selectedMonth: string; // Format: YYYY-MM
  isLoading: boolean;
  isMutating: boolean;
  error: Error | null;
  events: CalendarEvent[];
}

export type CalendarStoreState = CalendarState;
export type StoreListener = () => void;

export interface CalendarContextValue extends CalendarState {
  setSelectedMonth: (month: string) => void;
  loadMonth: (month: string) => Promise<void>;
  selectMonth: (month: string) => Promise<void>;
  updateEventStatus: (id: string, status: EventStatus) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface CalendarProviderProps {
  children: React.ReactNode;
  initialMonth?: string;
  eventRepo?: EventRepository;
  store?: import('./CalendarStore.ts').CalendarStore;
}
