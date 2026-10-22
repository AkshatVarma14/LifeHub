import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTestDatabase } from '../helpers/testDatabase.ts';
import {
  SqliteHabitRepository,
  SqliteTimerRepository,
} from '../../src/features/habits/repositories/index.ts';
import {
  HabitsStore,
  HabitsProvider,
  useHabits,
} from '../../src/features/habits/context/index.ts';

test('Habits Store: Initial state and async data loading lifecycle', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  // Pre-seed an active habit and an archived habit
  const habitActive = await habitRepo.create({
    name: 'Morning Yoga',
    description: '15 mins daily stretching',
  });
  const habitArchived = await habitRepo.create({
    name: 'Old Habit',
    description: 'To be archived',
  });
  await habitRepo.archive(habitArchived.id);

  // Pre-seed a completion on 2026-10-20
  await habitRepo.recordCompletion({
    habitId: habitActive.id,
    completedDate: '2026-10-20',
    notes: 'Great session',
  });

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);

  // 1. Initial synchronous state before load
  const initial = store.getState();
  assert.strictEqual(initial.selectedDate, '2026-10-20');
  assert.strictEqual(initial.isLoading, true);
  assert.strictEqual(initial.isMutating, false);
  assert.strictEqual(initial.isMutatingTimer, false);
  assert.strictEqual(initial.error, null);
  assert.strictEqual(initial.habits.length, 0);
  assert.strictEqual(initial.archivedHabits.length, 0);
  assert.strictEqual(initial.activeTimer, null);

  // 2. Load data
  let listenerFired = 0;
  store.subscribe(() => {
    listenerFired++;
  });

  await store.loadData('2026-10-20');

  const loaded = store.getState();
  assert.strictEqual(loaded.isLoading, false);
  assert.strictEqual(loaded.error, null);
  assert.strictEqual(loaded.habits.length, 1);
  assert.strictEqual(loaded.habits[0].name, 'Morning Yoga');
  assert.strictEqual(loaded.archivedHabits.length, 1);
  assert.strictEqual(loaded.archivedHabits[0].name, 'Old Habit');

  // Completions and streaks
  assert.strictEqual(loaded.completionsByHabitId[habitActive.id]?.length, 1);
  assert.strictEqual(loaded.completionsForSelectedDate.length, 1);
  assert.strictEqual(loaded.streaksByHabitId[habitActive.id]?.currentStreak, 1);
  assert.strictEqual(loaded.streaksByHabitId[habitActive.id]?.totalCompletions, 1);

  assert.ok(listenerFired > 0, 'Subscribers must be notified upon load completion');
});

test('Habits Store: Habit CRUD, archiving, unarchiving, and deletion with state refresh', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  // 1. Create habit
  const created = await store.createHabit({
    name: 'Read 20 pages',
    description: 'Technical literature',
  });
  assert.ok(created.id);
  assert.strictEqual(created.name, 'Read 20 pages');
  assert.strictEqual(store.getState().habits.length, 1);
  assert.strictEqual(store.getState().habits[0].id, created.id);

  // 2. Update habit
  const updated = await store.updateHabit(created.id, {
    name: 'Read 30 pages',
    description: 'Expanded reading goal',
  });
  assert.strictEqual(updated.name, 'Read 30 pages');
  assert.strictEqual(store.getState().habits[0].name, 'Read 30 pages');

  // 3. Archive habit
  await store.archiveHabit(created.id);
  assert.strictEqual(store.getState().habits.length, 0);
  assert.strictEqual(store.getState().archivedHabits.length, 1);
  assert.strictEqual(store.getState().archivedHabits[0].id, created.id);

  // 4. Unarchive habit
  await store.unarchiveHabit(created.id);
  assert.strictEqual(store.getState().habits.length, 1);
  assert.strictEqual(store.getState().archivedHabits.length, 0);

  // 5. Delete habit
  await store.deleteHabit(created.id);
  assert.strictEqual(store.getState().habits.length, 0);
  assert.strictEqual(store.getState().archivedHabits.length, 0);

  // 6. Invalid input rejects without mutating state
  await assert.rejects(
    async () => {
      await store.createHabit({ name: '   ' });
    },
    /name cannot be empty/i
  );
  assert.strictEqual(store.getState().isMutating, false);
});

test('Habits Store: Completions, date selection, streaks, and toggle behavior', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  const habit = await store.createHabit({ name: 'Drink Water 2L' });

  // 1. Initially not completed on 2026-10-20
  assert.strictEqual(store.isHabitCompletedOnDate(habit.id, '2026-10-20'), false);
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 0);
  assert.strictEqual(store.getState().streaksByHabitId[habit.id]?.currentStreak, 0);

  // 2. Toggle completion on selectedDate (2026-10-20) -> records completion, returns true
  const toggledOn = await store.toggleCompletion(habit.id);
  assert.strictEqual(toggledOn, true);
  assert.strictEqual(store.isHabitCompletedOnDate(habit.id, '2026-10-20'), true);
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 1);
  assert.strictEqual(store.getState().streaksByHabitId[habit.id]?.currentStreak, 1);

  // 3. Toggle completion again on 2026-10-20 -> removes completion, returns false
  const toggledOff = await store.toggleCompletion(habit.id);
  assert.strictEqual(toggledOff, false);
  assert.strictEqual(store.isHabitCompletedOnDate(habit.id, '2026-10-20'), false);
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 0);
  assert.strictEqual(store.getState().streaksByHabitId[habit.id]?.currentStreak, 0);

  // 4. Consecutive completions across multiple dates: Oct 18, 19, 20
  await store.recordCompletion({ habitId: habit.id, completedDate: '2026-10-18' });
  await store.recordCompletion({ habitId: habit.id, completedDate: '2026-10-19' });
  await store.recordCompletion({ habitId: habit.id, completedDate: '2026-10-20' });

  assert.strictEqual(store.getState().streaksByHabitId[habit.id]?.currentStreak, 3);
  assert.strictEqual(store.getState().streaksByHabitId[habit.id]?.longestStreak, 3);
  assert.strictEqual(store.getState().streaksByHabitId[habit.id]?.totalCompletions, 3);

  // 5. Change selected viewing date via setSelectedDate
  await store.setSelectedDate('2026-10-19');
  assert.strictEqual(store.getState().selectedDate, '2026-10-19');
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 1);
  assert.strictEqual(store.getState().completionsForSelectedDate[0].completedDate, '2026-10-19');

  // 6. Duplicate recordCompletion on same date rejects
  await assert.rejects(
    async () => {
      await store.recordCompletion({ habitId: habit.id, completedDate: '2026-10-19' });
    },
    /already completed/i
  );
});

test('Habits Store: Active timer restoration upon startup from persistence', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const T_start = '2026-10-20T10:00:00.000Z';

  // Pre-seed an active running countdown session directly in persistence
  const seededCountdown = await timerRepo.createSession({
    type: 'countdown',
    targetDurationSeconds: 1200,
    status: 'running',
    startedAt: T_start,
    currentSegmentStartedAt: T_start,
  });

  // Instantiate fresh store simulating app launch / refresh
  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  const state = store.getState();
  assert.ok(state.activeTimer);
  assert.strictEqual(state.activeTimer?.id, seededCountdown.id);
  assert.strictEqual(state.activeTimer?.type, 'countdown');
  assert.strictEqual(state.activeTimer?.status, 'running');
  assert.strictEqual(state.activeTimer?.targetDurationSeconds, 1200);

  // Calculated state is automatically derived from timestamps
  assert.ok(state.activeTimerCalculatedState);
  assert.strictEqual(typeof state.activeTimerCalculatedState?.elapsedSeconds, 'number');
  assert.strictEqual(typeof state.activeTimerCalculatedState?.remainingSeconds, 'number');
});

test('Habits Store: Stopwatch flow (start, pause, resume, complete)', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  const T0 = '2026-10-20T10:00:00.000Z';
  const T1 = '2026-10-20T10:05:00.000Z'; // 300s later
  const T2 = '2026-10-20T10:10:00.000Z'; // 300s paused
  const T3 = '2026-10-20T10:15:00.000Z'; // 300s resumed (600s total)

  // 1. Start stopwatch
  const sw = await store.startStopwatch(null, 'Deep work', T0);
  assert.ok(sw.id);
  assert.strictEqual(store.getState().activeTimer?.status, 'running');
  assert.strictEqual(store.getState().activeTimer?.type, 'stopwatch');

  // 2. Pause stopwatch at T1
  const paused = await store.pauseTimer(T1);
  assert.strictEqual(paused.status, 'paused');
  assert.strictEqual(store.getState().activeTimer?.status, 'paused');
  assert.strictEqual(store.getState().activeTimer?.accumulatedSeconds, 300);

  // 3. Resume stopwatch at T2
  const resumed = await store.resumeTimer(T2);
  assert.strictEqual(resumed.status, 'running');
  assert.strictEqual(store.getState().activeTimer?.status, 'running');
  assert.strictEqual(store.getState().activeTimer?.currentSegmentStartedAt, T2);

  // 4. Complete stopwatch at T3 (300s first segment + 300s second segment = 600s)
  const completed = await store.completeTimer(T3);
  assert.strictEqual(completed.status, 'completed');
  assert.strictEqual(completed.accumulatedSeconds, 600);
  assert.strictEqual(completed.endedAt, T3);

  // Active timer slot is now free
  assert.strictEqual(store.getState().activeTimer, null);
  assert.strictEqual(store.getState().activeTimerCalculatedState, null);
});

test('Habits Store: Countdown flow and cancellation', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  const T0 = '2026-10-20T14:00:00.000Z';
  const T1 = '2026-10-20T14:10:00.000Z';

  // 1. Start 25-minute (1500s) countdown
  const cd = await store.startCountdown(1500, null, 'Study', T0);
  assert.strictEqual(cd.type, 'countdown');
  assert.strictEqual(cd.targetDurationSeconds, 1500);
  assert.strictEqual(store.getState().activeTimer?.id, cd.id);

  // 2. Cancel countdown after 10 minutes
  const cancelled = await store.cancelTimer(T1);
  assert.strictEqual(cancelled.status, 'cancelled');
  assert.strictEqual(cancelled.accumulatedSeconds, 600);
  assert.strictEqual(cancelled.endedAt, T1);

  // Active timer slot is now free
  assert.strictEqual(store.getState().activeTimer, null);
  assert.strictEqual(store.getState().activeTimerCalculatedState, null);
});

test('Habits Store: Countdown expiry calculation does NOT persist completed status until explicit completion', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  const T_start = '2026-10-20T09:00:00.000Z';
  const targetSeconds = 1200; // 20 minutes

  // Start 20-minute countdown
  await store.startCountdown(targetSeconds, null, null, T_start);

  // Simulate user opening app 45 minutes after start (2700s elapsed)
  const T_reopen = '2026-10-20T09:45:00.000Z';
  const syncState = store.syncTimerState(T_reopen);

  assert.ok(syncState);
  assert.strictEqual(syncState?.elapsedSeconds, 2700);
  assert.strictEqual(syncState?.remainingSeconds, 0); // clamped to 0
  assert.strictEqual(syncState?.isExpired, true);

  // INVARIANT: In SQLite and in activeTimer state, status MUST STILL BE 'running'
  assert.strictEqual(store.getState().activeTimer?.status, 'running');
  const persistedInDb = await timerRepo.getActiveSession();
  assert.strictEqual(persistedInDb?.status, 'running');

  // When explicit completeTimer is called 45 minutes later, accumulatedSeconds MUST be capped at 1200s!
  const completed = await store.completeTimer(T_reopen);
  assert.strictEqual(completed.status, 'completed');
  assert.strictEqual(completed.accumulatedSeconds, 1200, 'Countdown accumulatedSeconds must be capped at targetDurationSeconds');

  // Verify in DB that it is completed with capped duration
  const persistedCompleted = await timerRepo.getSessionById(completed.id);
  assert.strictEqual(persistedCompleted?.status, 'completed');
  assert.strictEqual(persistedCompleted?.accumulatedSeconds, 1200);
});

test('Habits Store: Single active timer invariant and conflict prevention', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  // 1. Start first timer
  await store.startStopwatch(null, 'First session');
  assert.ok(store.getState().activeTimer);

  // 2. Attempting to start a second stopwatch rejects
  await assert.rejects(
    async () => {
      await store.startStopwatch(null, 'Second session');
    },
    /An active timer session is already in progress/i
  );

  // 3. Attempting to start a countdown while stopwatch is active rejects
  await assert.rejects(
    async () => {
      await store.startCountdown(1500, null, 'Countdown session');
    },
    /An active timer session is already in progress/i
  );

  // 4. Pause first session
  await store.pauseTimer();
  assert.strictEqual(store.getState().activeTimer?.status, 'paused');

  // Attempting to start another session while one is paused still rejects
  await assert.rejects(
    async () => {
      await store.startCountdown(1500);
    },
    /An active timer session is already in progress/i
  );

  // 5. Complete session frees slot
  await store.completeTimer();
  assert.strictEqual(store.getState().activeTimer, null);

  // Now starting countdown succeeds
  const newCd = await store.startCountdown(900);
  assert.strictEqual(newCd.targetDurationSeconds, 900);
});

test('Habits Store: Fine-grained mutation guards and overlapping call protection', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  const habit1 = await store.createHabit({ name: 'Habit 1' });
  const habit2 = await store.createHabit({ name: 'Habit 2' });

  // 1. Mutating habit1 does NOT block mutating habit2
  let delayResolve: () => void = () => {};
  const delayPromise = new Promise<void>((resolve) => {
    delayResolve = resolve;
  });

  // Wrap repo update with a delay on habit1
  const origUpdate = habitRepo.update.bind(habitRepo);
  habitRepo.update = async (id, input) => {
    if (id === habit1.id) {
      await delayPromise;
    }
    return origUpdate(id, input);
  };

  const update1Promise = store.updateHabit(habit1.id, { name: 'Habit 1 Updated' });

  // Verify habit1 is mutating
  assert.strictEqual(store.getState().isMutating, true);

  // Concurrent update on habit2 succeeds without being blocked by habit1!
  const update2 = await store.updateHabit(habit2.id, { name: 'Habit 2 Updated' });
  assert.strictEqual(update2.name, 'Habit 2 Updated');

  // Duplicate concurrent update on habit1 rejects cleanly with guard error
  await assert.rejects(
    async () => {
      await store.updateHabit(habit1.id, { name: 'Conflicting update' });
    },
    /A mutation is already in progress for 'habit:.*'/i
  );

  // Release habit1 update
  delayResolve();
  const update1 = await update1Promise;
  assert.strictEqual(update1.name, 'Habit 1 Updated');

  // Flags reset to false
  assert.strictEqual(store.getState().isMutating, false);
  assert.strictEqual(store.getState().isMutatingTimer, false);
});

test('Habits Store: Stale asynchronous response protection via monotonic request IDs', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);

  // Slow down first list call
  let slowResolve: () => void = () => {};
  const slowPromise = new Promise<void>((resolve) => {
    slowResolve = resolve;
  });

  const origList = habitRepo.list.bind(habitRepo);
  let callCount = 0;
  habitRepo.list = async (includeArchived) => {
    callCount++;
    if (callCount === 1) {
      await slowPromise;
    }
    return origList(includeArchived);
  };

  // Launch request 1 (slow)
  const req1 = store.loadData('2026-10-18');

  // Immediately launch request 2 (fast)
  const req2 = store.loadData('2026-10-25');
  await req2;

  assert.strictEqual(store.getState().selectedDate, '2026-10-25');

  // Let slow request 1 resolve
  slowResolve();
  await req1;

  // Stale request 1 must NOT overwrite selectedDate to 2026-10-18!
  assert.strictEqual(store.getState().selectedDate, '2026-10-25');
});

test('Habits Context: useHabits throws outside HabitsProvider and renders in SSR', () => {
  // 1. Throws outside provider
  assert.throws(
    () => {
      useHabits();
    },
    /useHabits must be used within a HabitsProvider/i
  );

  // 2. Renders with HabitsProvider
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  let capturedDate: string | null = null;
  function TestConsumer() {
    const habits = useHabits();
    capturedDate = habits.selectedDate;
    return React.createElement('div', null, `Date: ${habits.selectedDate}`);
  }

  const html = renderToStaticMarkup(
    React.createElement(
      HabitsProvider,
      {
        initialDate: '2026-10-20',
        habitRepo,
        timerRepo,
      },
      React.createElement(TestConsumer)
    )
  );

  assert.strictEqual(capturedDate, '2026-10-20');
  assert.ok(html.includes('Date: 2026-10-20'));
});

test('Habits Store: Stale in-flight loadData does NOT overwrite newer active timer session', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);

  // Hook habitRepo.list to delay the initial loadData query
  let slowLoadResolve: () => void = () => {};
  const slowLoadPromise = new Promise<void>((resolve) => {
    slowLoadResolve = resolve;
  });

  const origList = habitRepo.list.bind(habitRepo);
  let listCalls = 0;
  habitRepo.list = async (includeArchived) => {
    listCalls++;
    if (listCalls === 1) {
      await slowLoadPromise;
    }
    return origList(includeArchived);
  };

  // Hook timerRepo.getActiveSession to return stale null during loadData
  const origGetActiveSession = timerRepo.getActiveSession.bind(timerRepo);
  let getActiveCalls = 0;
  timerRepo.getActiveSession = async () => {
    getActiveCalls++;
    // Call 1: from createSession (pre-check) -> return actual DB state (null)
    if (getActiveCalls === 1) {
      return origGetActiveSession();
    }
    // Call 2: from loadData's fetchAuthoritativeState -> return stale null (as if queried before startStopwatch)
    if (getActiveCalls === 2) {
      return null;
    }
    return origGetActiveSession();
  };

  // 1. Start slow loadData
  const loadPromise = store.loadData('2026-10-20');
  assert.strictEqual(store.getState().isLoading, true);

  // 2. While loadData is still in flight, user starts a stopwatch
  const T0 = '2026-10-20T10:00:00.000Z';
  const startedSession = await store.startStopwatch(null, 'Focus Session', T0);
  assert.strictEqual(store.getState().activeTimer?.id, startedSession.id);
  assert.strictEqual(store.getState().activeTimer?.status, 'running');

  // 3. Old loadData query finally completes with stale null activeTimer
  slowLoadResolve();
  await loadPromise;

  // INVARIANT: The active timer must NOT have been wiped out / reset to null by the stale loadData!
  const stateAfter = store.getState();
  assert.ok(stateAfter.activeTimer, 'Active timer must not be null');
  assert.strictEqual(stateAfter.activeTimer?.id, startedSession.id);
  assert.strictEqual(stateAfter.activeTimer?.status, 'running');
  assert.strictEqual(stateAfter.isLoading, false);
});

test('Habits Store: Failed mutation write sets state.error, notifies listeners, resets mutation flags, and allows retry', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  let notifications = 0;
  store.subscribe(() => {
    notifications++;
  });

  // Mock habitRepo.create to fail on first attempt
  const origCreate = habitRepo.create.bind(habitRepo);
  let shouldFail = true;
  habitRepo.create = async (input) => {
    if (shouldFail) {
      throw new Error('Database disk I/O error');
    }
    return origCreate(input);
  };

  // 1. Attempt createHabit which fails at the write step
  await assert.rejects(
    async () => {
      await store.createHabit({ name: 'Failing Habit' });
    },
    /Database disk I\/O error/i
  );

  // 2. Assert state.error is populated, isMutating is false, and subscriber was notified
  const stateAfterFail = store.getState();
  assert.strictEqual(stateAfterFail.isMutating, false);
  assert.ok(stateAfterFail.error !== null, 'state.error must be populated on mutation failure');
  assert.match(stateAfterFail.error.message, /Database disk I\/O error/i);
  assert.strictEqual(stateAfterFail.habits.length, 0);
  assert.ok(notifications > 0, 'Subscribers must be notified on mutation error');

  // 3. Retry the same mutation: lock must have been released, allowing successful retry
  shouldFail = false;
  const created = await store.createHabit({ name: 'Retried Habit' });
  assert.ok(created.id);
  assert.strictEqual(created.name, 'Retried Habit');

  const stateAfterRetry = store.getState();
  assert.strictEqual(stateAfterRetry.isMutating, false);
  assert.strictEqual(stateAfterRetry.error, null, 'Successful post-retry refresh clears error');
  assert.strictEqual(stateAfterRetry.habits.length, 1);
  assert.strictEqual(stateAfterRetry.habits[0].name, 'Retried Habit');
});

test('Habits Store: Persisted write succeeds even if post-write refresh fails', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);
  await store.loadData();

  // Force habitRepo.list to fail during post-write refresh
  const origList = habitRepo.list.bind(habitRepo);
  let failList = false;
  habitRepo.list = async (includeArchived) => {
    if (failList) {
      throw new Error('Post-write query network/disk failure');
    }
    return origList(includeArchived);
  };

  failList = true;
  // createHabit should succeed because the database write succeeded!
  const created = await store.createHabit({ name: 'Persisted But Refresh Failed' });
  assert.ok(created.id);
  assert.strictEqual(created.name, 'Persisted But Refresh Failed');

  // The database row must actually exist in SQLite!
  failList = false;
  const inDb = await habitRepo.getById(created.id);
  assert.ok(inDb, 'Habit was successfully persisted in SQLite');
  assert.strictEqual(inDb?.name, 'Persisted But Refresh Failed');

  // State error reflects refresh failure, isMutating is false
  const state = store.getState();
  assert.strictEqual(state.isMutating, false);
  assert.ok(state.error !== null, 'state.error must reflect refresh error');
  assert.match(state.error.message, /Post-write query/i);

  // Subsequent manual refresh recovers state
  await store.refresh();
  assert.strictEqual(store.getState().error, null);
  assert.strictEqual(store.getState().habits.length, 1);
  assert.strictEqual(store.getState().habits[0].name, 'Persisted But Refresh Failed');
});

test('Habits Store: Stale in-flight loadData does NOT overwrite newer habit mutation', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-20', habitRepo, timerRepo);

  // Slow down habitRepo.list on the first call (initial loadData)
  let slowListResolve: () => void = () => {};
  const slowListPromise = new Promise<void>((resolve) => {
    slowListResolve = resolve;
  });

  const origList = habitRepo.list.bind(habitRepo);
  let listCallCount = 0;
  habitRepo.list = async (includeArchived) => {
    listCallCount++;
    if (listCallCount === 1) {
      await slowListPromise;
      return []; // Old load saw 0 habits
    }
    return origList(includeArchived);
  };

  // 1. Trigger slow loadData
  const loadPromise = store.loadData('2026-10-20');

  // 2. Concurrently create a habit (which calls refreshAfterMutation)
  const created = await store.createHabit({ name: 'Morning Journal' });
  assert.ok(created.id);
  assert.strictEqual(store.getState().habits.length, 1);

  // 3. Old loadData completes
  slowListResolve();
  await loadPromise;

  // Stale loadData must NOT overwrite habits with empty array!
  const finalState = store.getState();
  assert.strictEqual(finalState.habits.length, 1);
  assert.strictEqual(finalState.habits[0].name, 'Morning Journal');
});
