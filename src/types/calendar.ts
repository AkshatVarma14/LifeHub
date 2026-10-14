/**
 * Calendar Domain Types for LifeHub.
 * Stage 1: Calendar Persistence & Domain Foundation (FR-07).
 * Timestamps are stored as canonical UTC ISO-8601 strings (ending in 'Z').
 */

export type EventStatus = 'pending' | 'completed' | 'cancelled';

export type EventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type EventSource = 'manual' | 'email' | 'system';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // Canonical UTC ISO-8601 string (e.g. 2026-10-15T09:30:00.000Z)
  endTime: string | null; // Canonical UTC ISO-8601 string or null
  category: string;
  location: string | null;
  notes: string | null;
  recurrence: EventRecurrence;
  reminderMinutesBefore: number | null; // Bounded offset in minutes (0 to 43200 = 30 days)
  status: EventStatus;
  source: EventSource; // 'manual' | 'email' | 'system'
  createdAt: string; // Canonical UTC ISO-8601
  updatedAt: string; // Canonical UTC ISO-8601
}

export type Event = CalendarEvent;

export const DEFAULT_CALENDAR_CATEGORIES = [
  'Academic',
  'Work',
  'Personal',
  'Health',
  'Finance',
  'Other',
] as const;

export type DefaultCalendarCategory = (typeof DEFAULT_CALENDAR_CATEGORIES)[number];
