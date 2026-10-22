import test from 'node:test';
import assert from 'node:assert';
import { createTestDatabase } from '../helpers/testDatabase.ts';
import {
  SqliteHabitRepository,
  SqliteTimerRepository,
} from '../../src/features/habits/repositories/index.ts';
import { HabitsStore } from '../../src/features/habits/context/index.ts';
import {
  validateCountdownDurationMinutes,
} from '../../src/features/habits/utils/timerUi.ts';

test('Timer Controls: Starting stopwatch session with and without habit association', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  const habit = await store.createHabit({ name: 'Study Session' });

  // 1. Start stopwatch linked to habit
  const session1 = await store.startStopwatch(habit.id, 'Reading chapter 4', '2026-10-22T10:00:00.000Z');
  assert.strictEqual(session1.type, 'stopwatch');
  assert.strictEqual(session1.status, 'running');
  assert.strictEqual(session1.habitId, habit.id);
  assert.strictEqual(session1.notes, 'Reading chapter 4');
  assert.strictEqual(store.getState().activeTimer?.id, session1.id);

  // Complete session to free slot
  await store.completeTimer('2026-10-22T10:15:00.000Z');
  assert.strictEqual(store.getState().activeTimer, null);

  // 2. Start stopwatch without habit (general focus)
  const session2 = await store.startStopwatch(null, null, '2026-10-22T11:00:00.000Z');
  assert.strictEqual(session2.type, 'stopwatch');
  assert.strictEqual(session2.habitId, null);
  assert.strictEqual(store.getState().activeTimer?.id, session2.id);
});

test('Timer Controls: Starting countdown session with validated target duration', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  // Validate 25 minutes input
  const val = validateCountdownDurationMinutes(25);
  assert.strictEqual(val.isValid, true);
  assert.strictEqual(val.targetDurationSeconds, 1500);

  const session = await store.startCountdown(
    val.targetDurationSeconds!,
    null,
    'Pomodoro 1',
    '2026-10-22T09:00:00.000Z'
  );

  assert.strictEqual(session.type, 'countdown');
  assert.strictEqual(session.status, 'running');
  assert.strictEqual(session.targetDurationSeconds, 1500);
  assert.strictEqual(session.accumulatedSeconds, 0);
  assert.strictEqual(store.getState().activeTimer?.id, session.id);
});

test('Timer Controls: Lifecycle pause and resume updates accumulated seconds and segment start', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  // Start at 10:00:00
  await store.startStopwatch(null, null, '2026-10-22T10:00:00.000Z');

  // Pause at 10:05:00 (5 mins = 300s elapsed)
  const paused = await store.pauseTimer('2026-10-22T10:05:00.000Z');
  assert.strictEqual(paused.status, 'paused');
  assert.strictEqual(paused.accumulatedSeconds, 300);
  assert.strictEqual(paused.currentSegmentStartedAt, null);
  assert.strictEqual(store.getState().activeTimer?.status, 'paused');
  assert.strictEqual(store.getState().activeTimer?.accumulatedSeconds, 300);

  // Resume at 10:10:00
  const resumed = await store.resumeTimer('2026-10-22T10:10:00.000Z');
  assert.strictEqual(resumed.status, 'running');
  assert.strictEqual(resumed.accumulatedSeconds, 300);
  assert.strictEqual(resumed.currentSegmentStartedAt, '2026-10-22T10:10:00.000Z');
  assert.strictEqual(store.getState().activeTimer?.status, 'running');
});

test('Timer Controls: Completing session caps countdown duration and frees active timer slot', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  // Start 25m (1500s) countdown at 10:00:00
  const session = await store.startCountdown(1500, null, null, '2026-10-22T10:00:00.000Z');

  // Complete at 10:30:00 (30 mins elapsed, 5 mins past target)
  const completed = await store.completeTimer('2026-10-22T10:30:00.000Z');
  assert.strictEqual(completed.status, 'completed');
  // Countdown accumulatedSeconds must be capped at target (1500s)
  assert.strictEqual(completed.accumulatedSeconds, 1500);
  assert.strictEqual(completed.endedAt, '2026-10-22T10:30:00.000Z');

  // Active timer slot is now free
  assert.strictEqual(store.getState().activeTimer, null);
  assert.strictEqual(store.getState().activeTimerCalculatedState, null);

  // Persisted state in repository verifies completed
  const persisted = await timerRepo.getSessionById(session.id);
  assert.strictEqual(persisted?.status, 'completed');
  assert.strictEqual(persisted?.accumulatedSeconds, 1500);
});

test('Timer Controls: Cancelling session marks status cancelled and frees active timer slot', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  const session = await store.startStopwatch(null, null, '2026-10-22T10:00:00.000Z');

  // Cancel at 10:03:00
  const cancelled = await store.cancelTimer('2026-10-22T10:03:00.000Z');
  assert.strictEqual(cancelled.status, 'cancelled');
  assert.strictEqual(cancelled.accumulatedSeconds, 180);
  assert.strictEqual(cancelled.endedAt, '2026-10-22T10:03:00.000Z');

  // Active slot freed
  assert.strictEqual(store.getState().activeTimer, null);

  const persisted = await timerRepo.getSessionById(session.id);
  assert.strictEqual(persisted?.status, 'cancelled');
});

test('Timer Controls: Countdown expiry calculates isExpired without mutating status in SQLite', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  // 10-minute countdown (600s) started at 10:00:00
  const session = await store.startCountdown(600, null, null, '2026-10-22T10:00:00.000Z');

  // Check state at 10:12:00 (12 mins elapsed: expired by 2 mins)
  const calcExpired = store.getCalculatedTimerState('2026-10-22T10:12:00.000Z');
  assert.ok(calcExpired);
  assert.strictEqual(calcExpired.isExpired, true);
  assert.strictEqual(calcExpired.remainingSeconds, 0);
  assert.strictEqual(calcExpired.elapsedSeconds, 720);

  // CRITICAL DOMAIN INVARIANT: Session in persistence and store remains 'running'
  const persistedInDb = await timerRepo.getSessionById(session.id);
  assert.strictEqual(persistedInDb?.status, 'running');
  assert.strictEqual(store.getState().activeTimer?.status, 'running');
});

test('Timer Controls: Single active session invariant prevents overlapping sessions', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  await store.startStopwatch(null, null, '2026-10-22T10:00:00.000Z');

  // Attempting to start another session while one is active throws
  await assert.rejects(
    async () => {
      await store.startStopwatch(null, null);
    },
    /An active timer session is already in progress/i
  );

  await assert.rejects(
    async () => {
      await store.startCountdown(1500, null);
    },
    /An active timer session is already in progress/i
  );
});

test('Timer Controls: Active running and paused sessions are restored on HabitsStore reinitialization', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  // Store 1: Starts a 25m countdown and pauses it at 5m (300s)
  const store1 = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store1.loadData();
  await store1.startCountdown(1500, null, 'Testing restore', '2026-10-22T10:00:00.000Z');
  await store1.pauseTimer('2026-10-22T10:05:00.000Z');

  // Store 2: Simulates app restart / provider remount on same SQLite database
  const store2 = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store2.loadData();

  const restored = store2.getState().activeTimer;
  assert.ok(restored);
  assert.strictEqual(restored.status, 'paused');
  assert.strictEqual(restored.targetDurationSeconds, 1500);
  assert.strictEqual(restored.accumulatedSeconds, 300);
  assert.strictEqual(restored.notes, 'Testing restore');

  const restoredCalc = store2.getState().activeTimerCalculatedState;
  assert.ok(restoredCalc);
  assert.strictEqual(restoredCalc.elapsedSeconds, 300);
  assert.strictEqual(restoredCalc.remainingSeconds, 1200);
});

test('Timer Controls: Concurrent mutation guard prevents overlapping mutations on timer lock', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  // Slow down timerRepo.createSession with a controlled promise
  let resolveSession: () => void;
  const slowPromise = new Promise<void>((r) => {
    resolveSession = r;
  });

  const origCreate = timerRepo.createSession.bind(timerRepo);
  timerRepo.createSession = async (input) => {
    await slowPromise;
    return origCreate(input);
  };

  // 1. First startStopwatch begins and holds the 'timer' mutation lock
  const p1 = store.startStopwatch(null, null, '2026-10-22T10:00:00.000Z');
  assert.strictEqual(store.getState().isMutatingTimer, true);
  assert.strictEqual(store.getState().isMutating, true);

  // 2. Second concurrent timer mutation rejects immediately due to mutation guard
  await assert.rejects(
    async () => {
      await store.pauseTimer();
    },
    /A mutation is already in progress for 'timer'/i
  );

  // 3. Resolve first mutation
  resolveSession!();
  await p1;

  // Mutation lock released
  assert.strictEqual(store.getState().isMutatingTimer, false);
  assert.strictEqual(store.getState().isMutating, false);
});
