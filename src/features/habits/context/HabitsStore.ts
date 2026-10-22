/**
 * Habits State Store for LifeHub.
 * Stage 1: Habits Persistence & Timer Domain Foundation (FR-08, FR-09, Slice 6B).
 * Pure TypeScript reactive state container for habits, completions, and focus timers.
 * Enforces:
 * - Deterministic loading and error lifecycles
 * - Stale asynchronous request protection via monotonic request IDs
 * - Fine-grained mutation guards preventing concurrent conflicting operations without global locks
 * - Authoritative persisted state with post-write refresh (write-before-refresh)
 * - Safe error isolation: successful writes are preserved even if post-write refresh fails
 * - Restoration of persisted active timer sessions with deterministic timestamp-based elapsed calculations
 * - Single-active-timer invariant with explicit conflict errors
 * - Countdown expiration distinction: expired calculations do not falsely persist completion
 */

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
import type {
  HabitsStoreState,
  StoreListener,
} from './types.ts';
import {
  calculateTimerState,
  createStopwatchInput,
  createCountdownInput,
  transitionPause,
  transitionResume,
  transitionComplete,
  transitionCancel,
} from '../timer.ts';
import { calculateHabitStreak } from '../streaks.ts';
import {
  getTodayDateString,
  isValidDateString,
} from '../../../utils/date.ts';

export class HabitsStore {
  private state: HabitsStoreState;
  private listeners = new Set<StoreListener>();
  private activeRequestId = 0;
  private timerVersion = 0;
  private activeMutations = new Set<string>();

  private habitRepo: HabitRepository;
  private timerRepo: TimerRepository;

  constructor(
    initialDate: string = getTodayDateString(),
    habitRepo: HabitRepository,
    timerRepo: TimerRepository
  ) {
    const validDate = isValidDateString(initialDate) ? initialDate : getTodayDateString();
    this.habitRepo = habitRepo;
    this.timerRepo = timerRepo;

    this.state = {
      isLoading: true,
      isMutating: false,
      isMutatingTimer: false,
      error: null,
      habits: [],
      archivedHabits: [],
      selectedDate: validDate,
      completionsByHabitId: {},
      completionsForSelectedDate: [],
      streaksByHabitId: {},
      activeTimer: null,
      activeTimerCalculatedState: null,
    };
  }

  getState(): HabitsStoreState {
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

  private updateMutationFlags() {
    const isMutating = this.activeMutations.size > 0;
    const isMutatingTimer = this.activeMutations.has('timer');
    if (this.state.isMutating !== isMutating || this.state.isMutatingTimer !== isMutatingTimer) {
      this.state = {
        ...this.state,
        isMutating,
        isMutatingTimer,
      };
      this.notify();
    }
  }

  private async withMutationGuard<T>(lockKey: string, action: () => Promise<T>): Promise<T> {
    if (this.activeMutations.has(lockKey)) {
      throw new Error(`A mutation is already in progress for '${lockKey}'`);
    }

    this.activeMutations.add(lockKey);
    this.updateMutationFlags();

    try {
      return await action();
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      this.state = {
        ...this.state,
        error: errorObj,
      };
      this.notify();
      throw errorObj;
    } finally {
      this.activeMutations.delete(lockKey);
      this.updateMutationFlags();
    }
  }

  /**
   * Internal helper that fetches the authoritative domain state from SQLite.
   */
  private async fetchAuthoritativeState(referenceDate: string) {
    const allHabits = await this.habitRepo.list(true);
    const activeHabits: Habit[] = [];
    const archivedHabits: Habit[] = [];

    for (const h of allHabits) {
      if (h.isArchived) {
        archivedHabits.push(h);
      } else {
        activeHabits.push(h);
      }
    }

    const completionsByHabitId: Record<string, HabitCompletion[]> = {};
    const streaksByHabitId: Record<string, HabitStreakSummary> = {};

    // Load completions and derive streaks for each habit
    for (const h of allHabits) {
      const completions = await this.habitRepo.getCompletions(h.id);
      completionsByHabitId[h.id] = completions;
      const completedDates = completions.map((c) => c.completedDate);
      streaksByHabitId[h.id] = calculateHabitStreak(completedDates, referenceDate);
    }

    // Load completions specifically for the selected date
    const completionsForSelectedDate = await this.habitRepo.getCompletionsForDate(referenceDate);

    // Restore active timer session (if any exists in running or paused status)
    const activeTimer = await this.timerRepo.getActiveSession();
    const activeTimerCalculatedState = activeTimer ? calculateTimerState(activeTimer) : null;

    return {
      habits: activeHabits,
      archivedHabits,
      completionsByHabitId,
      streaksByHabitId,
      completionsForSelectedDate,
      activeTimer,
      activeTimerCalculatedState,
    };
  }

  /**
   * Loads or refreshes full habits and timer state from persistence.
   * Monotonic request ID protection guarantees stale async responses do not overwrite newer state.
   */
  async loadData(referenceDate?: string): Promise<void> {
    const targetDate = referenceDate && isValidDateString(referenceDate)
      ? referenceDate
      : this.state.selectedDate;

    const requestId = ++this.activeRequestId;
    const capturedTimerVersion = this.timerVersion;

    this.state = {
      ...this.state,
      isLoading: true,
      selectedDate: targetDate,
    };
    this.notify();

    try {
      const data = await this.fetchAuthoritativeState(targetDate);

      // Discard stale responses if a newer request began
      if (requestId !== this.activeRequestId) {
        return;
      }

      // Only update timer state if no timer mutation occurred while this query was in flight
      const shouldUpdateTimer = capturedTimerVersion === this.timerVersion;

      this.state = {
        ...this.state,
        isLoading: false,
        error: null,
        selectedDate: targetDate,
        habits: data.habits,
        archivedHabits: data.archivedHabits,
        completionsByHabitId: data.completionsByHabitId,
        streaksByHabitId: data.streaksByHabitId,
        completionsForSelectedDate: data.completionsForSelectedDate,
        ...(shouldUpdateTimer
          ? {
              activeTimer: data.activeTimer,
              activeTimerCalculatedState: data.activeTimerCalculatedState,
            }
          : {}),
      };
      this.notify();
    } catch (err: any) {
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
   * Refreshes the store data for the currently selected date.
   */
  async refresh(): Promise<void> {
    return this.loadData(this.state.selectedDate);
  }

  /**
   * Changes the selected viewing date and refreshes date-scoped completions and streaks.
   */
  async setSelectedDate(date: string): Promise<void> {
    if (!isValidDateString(date)) {
      throw new Error(`Invalid calendar date '${date}'. Expected format YYYY-MM-DD.`);
    }
    return this.loadData(date);
  }

  /**
   * Safe internal refresh following a successful mutation.
   * If refresh fails, surfaces the error in state.error without reverting the persisted write.
   */
  private async refreshAfterMutation(): Promise<void> {
    const requestId = ++this.activeRequestId;
    const capturedTimerVersion = this.timerVersion;

    try {
      const data = await this.fetchAuthoritativeState(this.state.selectedDate);

      // Discard stale responses if a newer request began
      if (requestId !== this.activeRequestId) {
        return;
      }

      // Only update timer state if no timer mutation occurred while this query was in flight
      const shouldUpdateTimer = capturedTimerVersion === this.timerVersion;

      this.state = {
        ...this.state,
        isLoading: false,
        error: null,
        habits: data.habits,
        archivedHabits: data.archivedHabits,
        completionsByHabitId: data.completionsByHabitId,
        streaksByHabitId: data.streaksByHabitId,
        completionsForSelectedDate: data.completionsForSelectedDate,
        ...(shouldUpdateTimer
          ? {
              activeTimer: data.activeTimer,
              activeTimerCalculatedState: data.activeTimerCalculatedState,
            }
          : {}),
      };
      this.notify();
    } catch (err: any) {
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

  // ==========================================
  // Habit Mutations
  // ==========================================

  async createHabit(input: HabitInput): Promise<Habit> {
    return this.withMutationGuard('habit:create', async () => {
      const created = await this.habitRepo.create(input);
      await this.refreshAfterMutation();
      return created;
    });
  }

  async updateHabit(id: string, input: HabitInput): Promise<Habit> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Habit ID must be a non-empty string');
    }
    return this.withMutationGuard(`habit:${id.trim()}`, async () => {
      const updated = await this.habitRepo.update(id.trim(), input);
      await this.refreshAfterMutation();
      return updated;
    });
  }

  async archiveHabit(id: string): Promise<Habit> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Habit ID must be a non-empty string');
    }
    return this.withMutationGuard(`habit:${id.trim()}`, async () => {
      const archived = await this.habitRepo.archive(id.trim());
      await this.refreshAfterMutation();
      return archived;
    });
  }

  async unarchiveHabit(id: string): Promise<Habit> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Habit ID must be a non-empty string');
    }
    return this.withMutationGuard(`habit:${id.trim()}`, async () => {
      const unarchived = await this.habitRepo.unarchive(id.trim());
      await this.refreshAfterMutation();
      return unarchived;
    });
  }

  async deleteHabit(id: string): Promise<void> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Habit ID must be a non-empty string');
    }
    return this.withMutationGuard(`habit:${id.trim()}`, async () => {
      const deleted = await this.habitRepo.delete(id.trim());
      if (!deleted) {
        throw new Error(`Habit with id '${id.trim()}' could not be deleted or was not found`);
      }
      await this.refreshAfterMutation();
    });
  }

  // ==========================================
  // Completion Mutations & Queries
  // ==========================================

  async recordCompletion(input: CompletionInput): Promise<HabitCompletion> {
    const lockKey = `completion:${input.habitId}:${input.completedDate}`;
    return this.withMutationGuard(lockKey, async () => {
      const comp = await this.habitRepo.recordCompletion(input);
      await this.refreshAfterMutation();
      return comp;
    });
  }

  async removeCompletion(habitId: string, completedDate: string): Promise<boolean> {
    if (!habitId || !completedDate) {
      throw new Error('habitId and completedDate are required to remove a completion');
    }
    const lockKey = `completion:${habitId}:${completedDate}`;
    return this.withMutationGuard(lockKey, async () => {
      const removed = await this.habitRepo.removeCompletion(habitId, completedDate);
      await this.refreshAfterMutation();
      return removed;
    });
  }

  /**
   * Toggles completion for a given habit on a specific date (defaults to selectedDate).
   * Returns true if newly completed, or false if completion was removed.
   */
  async toggleCompletion(habitId: string, completedDate?: string): Promise<boolean> {
    const targetDate = completedDate && isValidDateString(completedDate)
      ? completedDate
      : this.state.selectedDate;

    const isCompleted = this.isHabitCompletedOnDate(habitId, targetDate);
    if (isCompleted) {
      await this.removeCompletion(habitId, targetDate);
      return false;
    } else {
      await this.recordCompletion({
        habitId,
        completedDate: targetDate,
      });
      return true;
    }
  }

  /**
   * Synchronous check against in-memory state to see if a habit has a completion on a specific date.
   */
  isHabitCompletedOnDate(habitId: string, completedDate: string): boolean {
    const completions = this.state.completionsByHabitId[habitId];
    if (!completions || completions.length === 0) {
      return false;
    }
    return completions.some((c) => c.completedDate === completedDate);
  }

  // ==========================================
  // Timer Operations & State Derivations
  // ==========================================

  /**
   * Starts a new stopwatch timer session.
   * Throws if an active timer session (running or paused) is already in progress.
   */
  async startStopwatch(
    habitId?: string | null,
    notes?: string | null,
    nowIso?: string
  ): Promise<TimerSession> {
    return this.withMutationGuard('timer', async () => {
      // Pre-check: single-active-timer invariant
      if (this.state.activeTimer !== null) {
        throw new Error(
          `An active timer session is already in progress (session id: '${this.state.activeTimer.id}', status: '${this.state.activeTimer.status}')`
        );
      }

      const input = createStopwatchInput(habitId, notes, nowIso);
      const session = await this.timerRepo.createSession(input);

      this.timerVersion++;
      this.state = {
        ...this.state,
        activeTimer: session,
        activeTimerCalculatedState: calculateTimerState(session, nowIso),
      };
      this.notify();
      return session;
    });
  }

  /**
   * Starts a new countdown timer session with specified target duration.
   * Throws if an active timer session (running or paused) is already in progress.
   */
  async startCountdown(
    targetDurationSeconds: number,
    habitId?: string | null,
    notes?: string | null,
    nowIso?: string
  ): Promise<TimerSession> {
    return this.withMutationGuard('timer', async () => {
      // Pre-check: single-active-timer invariant
      if (this.state.activeTimer !== null) {
        throw new Error(
          `An active timer session is already in progress (session id: '${this.state.activeTimer.id}', status: '${this.state.activeTimer.status}')`
        );
      }

      const input = createCountdownInput(targetDurationSeconds, habitId, notes, nowIso);
      const session = await this.timerRepo.createSession(input);

      this.timerVersion++;
      this.state = {
        ...this.state,
        activeTimer: session,
        activeTimerCalculatedState: calculateTimerState(session, nowIso),
      };
      this.notify();
      return session;
    });
  }

  /**
   * Pauses the active running timer session.
   * Throws if no active timer exists or if the current timer is not running.
   */
  async pauseTimer(nowIso?: string): Promise<TimerSession> {
    return this.withMutationGuard('timer', async () => {
      if (!this.state.activeTimer) {
        throw new Error('No active timer session to pause');
      }

      const updates = transitionPause(this.state.activeTimer, nowIso);
      const updated = await this.timerRepo.updateSession(this.state.activeTimer.id, updates);

      this.timerVersion++;
      this.state = {
        ...this.state,
        activeTimer: updated,
        activeTimerCalculatedState: calculateTimerState(updated, nowIso),
      };
      this.notify();
      return updated;
    });
  }

  /**
   * Resumes the active paused timer session.
   * Throws if no active timer exists or if the current timer is not paused.
   */
  async resumeTimer(nowIso?: string): Promise<TimerSession> {
    return this.withMutationGuard('timer', async () => {
      if (!this.state.activeTimer) {
        throw new Error('No active timer session to resume');
      }

      const updates = transitionResume(this.state.activeTimer, nowIso);
      const updated = await this.timerRepo.updateSession(this.state.activeTimer.id, updates);

      this.timerVersion++;
      this.state = {
        ...this.state,
        activeTimer: updated,
        activeTimerCalculatedState: calculateTimerState(updated, nowIso),
      };
      this.notify();
      return updated;
    });
  }

  /**
   * Completes the active timer session (from running or paused).
   * Automatically caps countdown accumulatedSeconds at targetDurationSeconds.
   * Frees the active timer slot upon completion.
   */
  async completeTimer(nowIso?: string): Promise<TimerSession> {
    return this.withMutationGuard('timer', async () => {
      if (!this.state.activeTimer) {
        throw new Error('No active timer session to complete');
      }

      const updates = transitionComplete(this.state.activeTimer, nowIso);
      const updated = await this.timerRepo.updateSession(this.state.activeTimer.id, updates);

      this.timerVersion++;
      this.state = {
        ...this.state,
        activeTimer: null,
        activeTimerCalculatedState: null,
      };
      this.notify();
      return updated;
    });
  }

  /**
   * Cancels/aborts the active timer session.
   * Frees the active timer slot upon cancellation.
   */
  async cancelTimer(nowIso?: string): Promise<TimerSession> {
    return this.withMutationGuard('timer', async () => {
      if (!this.state.activeTimer) {
        throw new Error('No active timer session to cancel');
      }

      const updates = transitionCancel(this.state.activeTimer, nowIso);
      const updated = await this.timerRepo.updateSession(this.state.activeTimer.id, updates);

      this.timerVersion++;
      this.state = {
        ...this.state,
        activeTimer: null,
        activeTimerCalculatedState: null,
      };
      this.notify();
      return updated;
    });
  }

  /**
   * Derives and updates the calculated state of the active timer without writing to persistence.
   * Notifies subscribers so UI components can re-render elapsed/remaining progress.
   */
  syncTimerState(nowIso?: string): TimerCalculatedState | null {
    if (!this.state.activeTimer) {
      if (this.state.activeTimerCalculatedState !== null) {
        this.state = { ...this.state, activeTimerCalculatedState: null };
        this.notify();
      }
      return null;
    }

    const calculated = calculateTimerState(this.state.activeTimer, nowIso);
    this.state = {
      ...this.state,
      activeTimerCalculatedState: calculated,
    };
    this.notify();
    return calculated;
  }

  /**
   * Pure deterministic getter returning the calculated state for the active timer at a reference time.
   * Does not mutate store state or notify listeners.
   */
  getCalculatedTimerState(nowIso?: string): TimerCalculatedState | null {
    if (!this.state.activeTimer) {
      return null;
    }
    return calculateTimerState(this.state.activeTimer, nowIso);
  }
}
