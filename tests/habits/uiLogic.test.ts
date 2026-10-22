import test from 'node:test';
import assert from 'node:assert';
import { createTestDatabase } from '../helpers/testDatabase.ts';
import {
  SqliteHabitRepository,
  SqliteTimerRepository,
} from '../../src/features/habits/repositories/index.ts';
import {
  HabitsStore,
} from '../../src/features/habits/context/index.ts';
import {
  getInitialHabitFormData,
  validateAndMapHabitForm,
} from '../../src/features/habits/utils/habitForm.ts';
import {
  getTodayDateString,
  getPreviousDateString,
  getNextDateString,
  formatDateDisplay,
} from '../../src/utils/date.ts';

test('Habits UI Logic: Loading and empty states lifecycle', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);

  // 1. Initial pre-load state: loading is true, collections empty
  assert.strictEqual(store.getState().isLoading, true);
  assert.strictEqual(store.getState().habits.length, 0);
  assert.strictEqual(store.getState().archivedHabits.length, 0);

  // 2. Data load completes with zero habits: empty state is active
  await store.loadData('2026-10-22');
  const loadedState = store.getState();
  assert.strictEqual(loadedState.isLoading, false);
  assert.strictEqual(loadedState.habits.length, 0);
  assert.strictEqual(loadedState.archivedHabits.length, 0);
  assert.strictEqual(loadedState.error, null);
});

test('Habits UI Logic: Creating a habit via form validation and store', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  // 1. Initial form state
  const initialForm = getInitialHabitFormData();
  assert.strictEqual(initialForm.name, '');
  assert.strictEqual(initialForm.description, '');

  // 2. Validate empty submission rejects
  const invalidRes = validateAndMapHabitForm({ name: '   ', description: '' });
  assert.strictEqual(invalidRes.isValid, false);
  assert.ok(invalidRes.errors.length > 0);

  // 3. Valid form maps and creates habit in store
  const validRes = validateAndMapHabitForm({
    name: 'Morning Hydration',
    description: 'Drink 500ml water',
  });
  assert.strictEqual(validRes.isValid, true);
  assert.ok(validRes.sanitized);

  const created = await store.createHabit(validRes.sanitized!);
  assert.ok(created.id);
  assert.strictEqual(created.name, 'Morning Hydration');
  assert.strictEqual(created.description, 'Drink 500ml water');
  assert.strictEqual(created.isArchived, false);

  // Store now has 1 active habit
  const state = store.getState();
  assert.strictEqual(state.habits.length, 1);
  assert.strictEqual(state.habits[0].id, created.id);
  assert.strictEqual(state.habits[0].name, 'Morning Hydration');
  assert.strictEqual(state.archivedHabits.length, 0);
});

test('Habits UI Logic: Toggling daily completion for selected date and streak updates', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  const habit = await store.createHabit({ name: 'Daily Reading' });

  // 1. Initially not completed on 2026-10-22
  assert.strictEqual(store.isHabitCompletedOnDate(habit.id, '2026-10-22'), false);
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 0);

  // 2. Mark complete on selected date
  const toggledOn = await store.toggleCompletion(habit.id);
  assert.strictEqual(toggledOn, true);
  assert.strictEqual(store.isHabitCompletedOnDate(habit.id, '2026-10-22'), true);
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 1);
  assert.strictEqual(store.getState().streaksByHabitId[habit.id]?.currentStreak, 1);

  // 3. Toggle again to undo completion
  const toggledOff = await store.toggleCompletion(habit.id);
  assert.strictEqual(toggledOff, false);
  assert.strictEqual(store.isHabitCompletedOnDate(habit.id, '2026-10-22'), false);
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 0);
  assert.strictEqual(store.getState().streaksByHabitId[habit.id]?.currentStreak, 0);
});

test('Habits UI Logic: Archive, separation from active list, and restoration', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  const habit1 = await store.createHabit({ name: 'Active Habit 1' });
  const habit2 = await store.createHabit({ name: 'Active Habit 2' });

  assert.strictEqual(store.getState().habits.length, 2);
  assert.strictEqual(store.getState().archivedHabits.length, 0);

  // 1. Archive habit2
  const archived = await store.archiveHabit(habit2.id);
  assert.strictEqual(archived.isArchived, true);

  // Active list contains only habit1; archived list contains habit2 (strictly separated)
  const stateAfterArchive = store.getState();
  assert.strictEqual(stateAfterArchive.habits.length, 1);
  assert.strictEqual(stateAfterArchive.habits[0].id, habit1.id);
  assert.strictEqual(stateAfterArchive.archivedHabits.length, 1);
  assert.strictEqual(stateAfterArchive.archivedHabits[0].id, habit2.id);

  // 2. Unarchive (restore) habit2
  const restored = await store.unarchiveHabit(habit2.id);
  assert.strictEqual(restored.isArchived, false);

  const stateAfterRestore = store.getState();
  assert.strictEqual(stateAfterRestore.habits.length, 2);
  assert.strictEqual(stateAfterRestore.archivedHabits.length, 0);

  // 3. Delete habit2
  await store.deleteHabit(habit2.id);
  assert.strictEqual(store.getState().habits.length, 1);
  assert.strictEqual(store.getState().habits[0].id, habit1.id);
});

test('Habits UI Logic: Date selection stepper and date-scoped completion filtering', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);
  await store.loadData();

  const habit = await store.createHabit({ name: 'Workout' });

  // Complete on 2026-10-21 (yesterday)
  await store.recordCompletion({
    habitId: habit.id,
    completedDate: '2026-10-21',
  });

  // Current view is 2026-10-22: habit is not completed on 2026-10-22
  assert.strictEqual(store.getState().selectedDate, '2026-10-22');
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 0);
  assert.strictEqual(store.isHabitCompletedOnDate(habit.id, '2026-10-22'), false);

  // Step to previous day via getPreviousDateString
  const prevDay = getPreviousDateString(store.getState().selectedDate);
  assert.strictEqual(prevDay, '2026-10-21');
  await store.setSelectedDate(prevDay);

  // View is now 2026-10-21: habit is completed on 2026-10-21!
  assert.strictEqual(store.getState().selectedDate, '2026-10-21');
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 1);
  assert.strictEqual(store.getState().completionsForSelectedDate[0].completedDate, '2026-10-21');
  assert.strictEqual(store.isHabitCompletedOnDate(habit.id, '2026-10-21'), true);

  // Step to next day via getNextDateString
  const nextDay = getNextDateString(store.getState().selectedDate);
  assert.strictEqual(nextDay, '2026-10-22');
  await store.setSelectedDate(nextDay);
  assert.strictEqual(store.getState().selectedDate, '2026-10-22');
  assert.strictEqual(store.getState().completionsForSelectedDate.length, 0);

  // Date formatting verification
  assert.strictEqual(formatDateDisplay('2026-10-22'), '22 Oct 2026');
});

test('Habits UI Logic: Recoverable error state and retry handling', async () => {
  const { executor } = createTestDatabase();
  const habitRepo = new SqliteHabitRepository(executor);
  const timerRepo = new SqliteTimerRepository(executor);

  const store = new HabitsStore('2026-10-22', habitRepo, timerRepo);

  // 1. Force load failure
  const origList = habitRepo.list.bind(habitRepo);
  habitRepo.list = async () => {
    throw new Error('Network / SQLite query failed');
  };

  await store.loadData('2026-10-22');
  assert.strictEqual(store.getState().isLoading, false);
  assert.ok(store.getState().error !== null);
  assert.match(store.getState().error!.message, /Network \/ SQLite query failed/i);

  // 2. Recover via retry (refresh) after repository recovers
  habitRepo.list = origList;
  await store.refresh();

  assert.strictEqual(store.getState().isLoading, false);
  assert.strictEqual(store.getState().error, null);
});
