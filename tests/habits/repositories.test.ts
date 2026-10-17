import test from 'node:test';
import assert from 'node:assert';
import { createTestDatabase } from '../helpers/testDatabase.ts';
import {
  SqliteHabitRepository,
  SqliteTimerRepository,
} from '../../src/features/habits/repositories/index.ts';

test('Habit Repository: CRUD operations, archiving, and retrieval', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteHabitRepository(executor);

  // 1. Create a habit
  const habit = await repo.create({
    name: 'Drink 2L Water',
    description: 'Track daily hydration',
  });
  assert.ok(habit.id);
  assert.strictEqual(habit.name, 'Drink 2L Water');
  assert.strictEqual(habit.description, 'Track daily hydration');
  assert.strictEqual(habit.isArchived, false);
  assert.ok(habit.createdAt);
  assert.ok(habit.updatedAt);

  // 2. Get by ID
  const retrieved = await repo.getById(habit.id);
  assert.deepStrictEqual(retrieved, habit);

  const missing = await repo.getById('non_existent_id');
  assert.strictEqual(missing, null);

  // 3. Update habit
  const updated = await repo.update(habit.id, {
    name: 'Drink 3L Water',
    description: 'Updated goal',
  });
  assert.strictEqual(updated.name, 'Drink 3L Water');
  assert.strictEqual(updated.description, 'Updated goal');

  // 4. Archive and List
  await repo.archive(habit.id);
  const activeOnly = await repo.list(false);
  assert.strictEqual(activeOnly.length, 0);

  const allHabits = await repo.list(true);
  assert.strictEqual(allHabits.length, 1);
  assert.strictEqual(allHabits[0].isArchived, true);

  // 5. Unarchive
  await repo.unarchive(habit.id);
  const activeAgain = await repo.list(false);
  assert.strictEqual(activeAgain.length, 1);
  assert.strictEqual(activeAgain[0].isArchived, false);

  // 6. Delete
  const deleted = await repo.delete(habit.id);
  assert.strictEqual(deleted, true);
  assert.strictEqual(await repo.getById(habit.id), null);

  const deleteMissing = await repo.delete('non_existent');
  assert.strictEqual(deleteMissing, false);
});

test('Habit Repository: Completion history, duplicate prevention, and date queries', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteHabitRepository(executor);

  const habit = await repo.create({ name: 'Read 20 pages' });

  // 1. Record completion on 2026-10-17
  const comp1 = await repo.recordCompletion({
    habitId: habit.id,
    completedDate: '2026-10-17',
    notes: 'Chapters 1-2',
  });
  assert.ok(comp1.id);
  assert.strictEqual(comp1.habitId, habit.id);
  assert.strictEqual(comp1.completedDate, '2026-10-17');
  assert.strictEqual(comp1.notes, 'Chapters 1-2');

  // 2. Duplicate completion on same date MUST reject
  await assert.rejects(
    async () => {
      await repo.recordCompletion({
        habitId: habit.id,
        completedDate: '2026-10-17',
      });
    },
    /already completed for date '2026-10-17'/i
  );

  // 3. Completion on different date (2026-10-18) succeeds
  await repo.recordCompletion({
    habitId: habit.id,
    completedDate: '2026-10-18',
  });

  // 4. isCompletedOnDate
  assert.strictEqual(await repo.isCompletedOnDate(habit.id, '2026-10-17'), true);
  assert.strictEqual(await repo.isCompletedOnDate(habit.id, '2026-10-18'), true);
  assert.strictEqual(await repo.isCompletedOnDate(habit.id, '2026-10-19'), false);

  // 5. Query completions by date range
  const completionsRange = await repo.getCompletions(habit.id, '2026-10-17', '2026-10-17');
  assert.strictEqual(completionsRange.length, 1);
  assert.strictEqual(completionsRange[0].completedDate, '2026-10-17');

  const allCompletions = await repo.getCompletions(habit.id);
  assert.strictEqual(allCompletions.length, 2);

  // 6. Query completions for a specific date across habits
  const habit2 = await repo.create({ name: 'Stretch 10m' });
  await repo.recordCompletion({
    habitId: habit2.id,
    completedDate: '2026-10-18',
  });

  const completionsOn18th = await repo.getCompletionsForDate('2026-10-18');
  assert.strictEqual(completionsOn18th.length, 2);

  // 7. Remove completion
  const removed = await repo.removeCompletion(habit.id, '2026-10-17');
  assert.strictEqual(removed, true);
  assert.strictEqual(await repo.isCompletedOnDate(habit.id, '2026-10-17'), false);

  // 8. Foreign key validation on completion insert
  await assert.rejects(
    async () => {
      await repo.recordCompletion({
        habitId: 'non_existent_habit_id',
        completedDate: '2026-10-18',
      });
    },
    /does not exist/i
  );

  // 9. Cascade delete: deleting habit cascades and removes completions
  await repo.delete(habit.id);
  const remainingComps = await repo.getCompletions(habit.id);
  assert.strictEqual(remainingComps.length, 0);
});

test('Timer Repository: Session persistence, transitions, and active session lookup', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const habit = await habitRepo.create({ name: 'Study Math' });

  // 1. Create stopwatch session
  const sw = await timerRepo.createSession({
    habitId: habit.id,
    type: 'stopwatch',
    status: 'running',
    startedAt: '2026-10-18T10:00:00.000Z',
    currentSegmentStartedAt: '2026-10-18T10:00:00.000Z',
  });
  assert.ok(sw.id);
  assert.strictEqual(sw.type, 'stopwatch');
  assert.strictEqual(sw.status, 'running');
  assert.strictEqual(sw.accumulatedSeconds, 0);

  // 2. Active session lookup returns sw
  const active1 = await timerRepo.getActiveSession();
  assert.strictEqual(active1?.id, sw.id);

  // 3. Pause session
  const paused = await timerRepo.updateSession(sw.id, {
    status: 'paused',
    accumulatedSeconds: 300,
    currentSegmentStartedAt: null,
  });
  assert.strictEqual(paused.status, 'paused');
  assert.strictEqual(paused.accumulatedSeconds, 300);
  assert.strictEqual(paused.currentSegmentStartedAt, null);

  // Active session still returns sw because status is 'paused'
  const active2 = await timerRepo.getActiveSession();
  assert.strictEqual(active2?.id, sw.id);

  // 4. Complete session
  const completed = await timerRepo.updateSession(sw.id, {
    status: 'completed',
    endedAt: '2026-10-18T10:10:00.000Z',
  });
  assert.strictEqual(completed.status, 'completed');
  assert.strictEqual(completed.endedAt, '2026-10-18T10:10:00.000Z');

  // Active session now returns null
  const active3 = await timerRepo.getActiveSession();
  assert.strictEqual(active3, null);

  // 5. Create countdown session
  const cd = await timerRepo.createSession({
    habitId: habit.id,
    type: 'countdown',
    status: 'running',
    targetDurationSeconds: 1500,
    startedAt: '2026-10-18T11:00:00.000Z',
    currentSegmentStartedAt: '2026-10-18T11:00:00.000Z',
  });
  assert.strictEqual(cd.type, 'countdown');
  assert.strictEqual(cd.targetDurationSeconds, 1500);

  // 6. List sessions by habitId
  const habitSessions = await timerRepo.listSessions(habit.id);
  assert.strictEqual(habitSessions.length, 2);

  // 7. Foreign key behavior: deleting habit sets habit_id to null (ON DELETE SET NULL)
  await habitRepo.delete(habit.id);
  const cdAfterHabitDelete = await timerRepo.getSessionById(cd.id);
  assert.strictEqual(cdAfterHabitDelete?.habitId, null);

  // 8. Delete session
  const deleted = await timerRepo.deleteSession(cd.id);
  assert.strictEqual(deleted, true);
  assert.strictEqual(await timerRepo.getSessionById(cd.id), null);
});

test('Timer Repository: F-2 Single active timer enforcement & F-4 transition integrity', async () => {
  const { executor } = createTestDatabase();
  const timerRepo = new SqliteTimerRepository(executor);

  // 1. First running session succeeds
  const session1 = await timerRepo.createSession({
    type: 'stopwatch',
    status: 'running',
    startedAt: '2026-10-18T10:00:00.000Z',
    currentSegmentStartedAt: '2026-10-18T10:00:00.000Z',
  });
  assert.ok(session1.id);
  assert.strictEqual(session1.status, 'running');

  // 2. Second running session fails
  await assert.rejects(
    async () => {
      await timerRepo.createSession({
        type: 'countdown',
        targetDurationSeconds: 1500,
        status: 'running',
        startedAt: '2026-10-18T10:05:00.000Z',
        currentSegmentStartedAt: '2026-10-18T10:05:00.000Z',
      });
    },
    /An active timer session is already in progress/i
  );

  // 3. Paused + another running session fails:
  // Pause session1
  await timerRepo.updateSession(session1.id, {
    status: 'paused',
    accumulatedSeconds: 300,
    currentSegmentStartedAt: null,
  });

  // Attempting to create running countdown while session1 is paused fails
  await assert.rejects(
    async () => {
      await timerRepo.createSession({
        type: 'countdown',
        targetDurationSeconds: 1200,
        status: 'running',
        startedAt: '2026-10-18T10:10:00.000Z',
        currentSegmentStartedAt: '2026-10-18T10:10:00.000Z',
      });
    },
    /An active timer session is already in progress/i
  );

  // Attempting to create a second paused session also fails
  await assert.rejects(
    async () => {
      await timerRepo.createSession({
        type: 'stopwatch',
        status: 'paused',
        startedAt: '2026-10-18T10:10:00.000Z',
      });
    },
    /An active timer session is already in progress/i
  );

  // 4. Completed/cancelled sessions do not block a new active timer:
  // Complete session1
  await timerRepo.updateSession(session1.id, {
    status: 'completed',
    endedAt: '2026-10-18T10:15:00.000Z',
  });

  // Now creating session2 succeeds
  const session2 = await timerRepo.createSession({
    type: 'countdown',
    targetDurationSeconds: 1800,
    status: 'running',
    startedAt: '2026-10-18T10:20:00.000Z',
    currentSegmentStartedAt: '2026-10-18T10:20:00.000Z',
  });
  assert.ok(session2.id);

  // Cancel session2
  await timerRepo.updateSession(session2.id, {
    status: 'cancelled',
    endedAt: '2026-10-18T10:25:00.000Z',
    currentSegmentStartedAt: null,
  });

  // Now creating session3 succeeds
  const session3 = await timerRepo.createSession({
    type: 'stopwatch',
    status: 'running',
    startedAt: '2026-10-18T10:30:00.000Z',
    currentSegmentStartedAt: '2026-10-18T10:30:00.000Z',
  });
  assert.ok(session3.id);

  // 5. Database-level enforcement works even when repository pre-check logic is bypassed:
  // Direct raw INSERT with 'running' status while session3 is active triggers SQLite unique constraint
  const now = new Date().toISOString();
  await assert.rejects(
    async () => {
      await executor.runAsync(
        `INSERT INTO timer_sessions (
          id, type, status, started_at, target_duration_seconds,
          accumulated_seconds, current_segment_started_at, ended_at, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        'ts_raw_bypass',
        'stopwatch',
        'running',
        now,
        null,
        0,
        now,
        null,
        null,
        now,
        now
      );
    },
    /UNIQUE constraint failed.*idx_timer_sessions_single_active/i
  );

  // Pause session3
  await timerRepo.updateSession(session3.id, {
    status: 'paused',
    currentSegmentStartedAt: null,
  });

  // 6. F-4: updateSession prevents transitioning completed/cancelled sessions back to running/paused
  await assert.rejects(
    async () => {
      await timerRepo.updateSession(session1.id, {
        status: 'running',
        currentSegmentStartedAt: now,
      });
    },
    /Cannot transition timer session from terminal status 'completed'/i
  );

  await assert.rejects(
    async () => {
      await timerRepo.updateSession(session2.id, {
        status: 'paused',
      });
    },
    /Cannot transition timer session from terminal status 'cancelled'/i
  );

  // 7. F-4: updateSession validates timestamps and accumulatedSeconds
  await assert.rejects(
    async () => {
      await timerRepo.updateSession(session3.id, {
        accumulatedSeconds: -10,
      });
    },
    /Accumulated seconds must be a non-negative integer/i
  );

  await assert.rejects(
    async () => {
      await timerRepo.updateSession(session3.id, {
        status: 'completed',
        endedAt: '2026-10-18T08:00:00.000Z', // earlier than startedAt 10:30:00
      });
    },
    /cannot be earlier than session startedAt/i
  );
});

