/**
 * Calendar State Store for LifeHub.
 * Stage 1: Calendar Persistence & State Management (FR-07, Slice 5B).
 * Pure TypeScript reactive state container for calendar events.
 * Enforces:
 * - Deterministic loading and error lifecycles
 * - Stale asynchronous request protection via monotonic request IDs
 * - Authoritative persisted state with post-write refresh
 * - Mutation state guards against confusing concurrent mutations
 * - Safe error isolation: persisted writes succeed even if post-write refresh encounters an error
 */

import type { CalendarEvent, EventStatus } from '../../../types/calendar.ts';
import type { EventInput } from '../validation.ts';
import type { EventRepository } from '../repositories/types.ts';
import type { CalendarStoreState, StoreListener } from './types.ts';
import {
  getCurrentMonthString,
  isValidMonthString,
  extractMonthFromDate,
  formatLocalDateKey,
} from '../../../utils/date.ts';

const VALID_STATUSES: readonly EventStatus[] = ['pending', 'completed', 'cancelled'];

export class CalendarStore {
  private state: CalendarStoreState;
  private listeners = new Set<StoreListener>();
  private activeRequestId = 0;
  private eventRepo: EventRepository;

  constructor(
    initialMonth: string = getCurrentMonthString(),
    eventRepo: EventRepository
  ) {
    const validMonth = isValidMonthString(initialMonth) ? initialMonth : getCurrentMonthString();
    this.eventRepo = eventRepo;

    this.state = {
      selectedMonth: validMonth,
      isLoading: true,
      isMutating: false,
      error: null,
      events: [],
    };
  }

  getState(): CalendarStoreState {
    return this.state;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Loads events for a given month with monotonic request ID protection against race conditions.
   */
  async loadMonth(month: string): Promise<void> {
    if (!isValidMonthString(month)) {
      throw new Error(`Invalid month string '${month}'. Expected format YYYY-MM.`);
    }

    const requestId = ++this.activeRequestId;
    this.state = { ...this.state, selectedMonth: month, isLoading: true };
    this.notify();

    try {
      const events = await this.eventRepo.getByMonth(month);

      // If a newer request has started (e.g. rapid month switching), discard this stale result
      if (requestId !== this.activeRequestId) {
        return;
      }

      this.state = {
        ...this.state,
        selectedMonth: month,
        isLoading: false,
        error: null,
        events,
      };
      this.notify();
    } catch (err) {
      if (requestId !== this.activeRequestId) {
        return;
      }
      this.state = {
        ...this.state,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
      this.notify();
    }
  }

  /**
   * Alias for loadMonth to maintain consistency with FinanceStore conventions.
   */
  async loadMonthData(month: string): Promise<void> {
    return this.loadMonth(month);
  }

  async selectMonth(month: string): Promise<void> {
    return this.loadMonth(month);
  }

  async setSelectedMonth(month: string): Promise<void> {
    return this.loadMonth(month);
  }

  async refresh(): Promise<void> {
    await this.loadMonth(this.state.selectedMonth);
  }

  async createEvent(input: EventInput): Promise<CalendarEvent> {
    if (this.state.isMutating) {
      throw new Error('A calendar mutation is already in progress. Please wait.');
    }

    this.state = { ...this.state, isMutating: true };
    this.notify();

    let created: CalendarEvent;
    try {
      created = await this.eventRepo.create(input);
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    // Determine target month to navigate to if event created in another month
    let targetMonth = this.state.selectedMonth;
    try {
      const localDateKey = formatLocalDateKey(created.startTime);
      const eventMonth = extractMonthFromDate(localDateKey);
      if (isValidMonthString(eventMonth)) {
        targetMonth = eventMonth;
      }
    } catch {
      // Fallback to currently selected month
    }

    try {
      await this.loadMonth(targetMonth);
    } catch (refreshErr) {
      console.warn('Post-event-create refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }

    return created;
  }

  async updateEvent(id: string, input: EventInput): Promise<CalendarEvent> {
    if (this.state.isMutating) {
      throw new Error('A calendar mutation is already in progress. Please wait.');
    }

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Event ID must be a non-empty string');
    }

    this.state = { ...this.state, isMutating: true };
    this.notify();

    let updated: CalendarEvent;
    try {
      updated = await this.eventRepo.update(id.trim(), input);
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    // Determine target month to refresh/navigate to
    let targetMonth = this.state.selectedMonth;
    try {
      const localDateKey = formatLocalDateKey(updated.startTime);
      const eventMonth = extractMonthFromDate(localDateKey);
      if (isValidMonthString(eventMonth)) {
        targetMonth = eventMonth;
      }
    } catch {
      // Fallback to currently selected month
    }

    try {
      await this.loadMonth(targetMonth);
    } catch (refreshErr) {
      console.warn('Post-event-update refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }

    return updated;
  }

  async updateEventStatus(id: string, status: EventStatus): Promise<CalendarEvent> {
    if (this.state.isMutating) {
      throw new Error('A calendar mutation is already in progress. Please wait.');
    }

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Event ID must be a non-empty string');
    }

    if (!VALID_STATUSES.includes(status)) {
      throw new Error(
        `Invalid status '${status}'. Allowed values: ${VALID_STATUSES.join(', ')}`
      );
    }

    this.state = { ...this.state, isMutating: true };
    this.notify();

    let updated: CalendarEvent;
    try {
      updated = await this.eventRepo.updateStatus(id.trim(), status);
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    // Persisted write succeeded! Refresh state. If refresh fails, isolate error so write is not reported as failed.
    try {
      await this.loadMonth(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-event-update refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }

    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    if (this.state.isMutating) {
      throw new Error('A calendar mutation is already in progress. Please wait.');
    }

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Event ID must be a non-empty string');
    }

    this.state = { ...this.state, isMutating: true };
    this.notify();

    try {
      const deleted = await this.eventRepo.delete(id.trim());
      if (!deleted) {
        throw new Error(`Event with id '${id}' could not be deleted or was not found`);
      }
    } catch (writeErr) {
      const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
      this.state = { ...this.state, isMutating: false, error: err };
      this.notify();
      throw err;
    }

    try {
      await this.loadMonth(this.state.selectedMonth);
    } catch (refreshErr) {
      console.warn('Post-event-delete refresh failed:', refreshErr);
    } finally {
      this.state = { ...this.state, isMutating: false };
      this.notify();
    }
  }
}
