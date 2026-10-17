import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CalendarProvider,
  useCalendar,
} from '../../src/features/calendar/context/CalendarContext.ts';
import { CalendarStore } from '../../src/features/calendar/context/CalendarStore.ts';
import { createTestDatabase } from '../helpers/testDatabase.ts';
import { SqliteEventRepository } from '../../src/features/calendar/repositories/index.ts';

test('Calendar Context: useCalendar throws outside CalendarProvider', () => {
  assert.throws(
    () => {
      useCalendar();
    },
    /useCalendar must be used within a CalendarProvider/i,
    'useCalendar must throw when accessed outside provider'
  );
});

test('Calendar Context: CalendarProvider renders children and exposes context via SSR', () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  let capturedMonth: string | null = null;
  function TestConsumer() {
    const calendar = useCalendar();
    capturedMonth = calendar.selectedMonth;
    return React.createElement('div', null, `Month: ${calendar.selectedMonth}`);
  }

  const html = renderToStaticMarkup(
    React.createElement(
      CalendarProvider,
      {
        initialMonth: '2026-10',
        eventRepo: repo,
      },
      React.createElement(TestConsumer)
    )
  );

  assert.strictEqual(capturedMonth, '2026-10');
  assert.ok(html.includes('Month: 2026-10'));
});

test('Calendar Store: Initial state and async data loading lifecycle', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  // Pre-seed an event in October 2026
  await repo.create({
    title: 'Study Session',
    startTime: '2026-10-15T09:00:00.000Z',
    category: 'Academic',
  });

  const store = new CalendarStore('2026-10', repo);

  // 1. Initial synchronous state before load
  const initial = store.getState();
  assert.strictEqual(initial.selectedMonth, '2026-10');
  assert.strictEqual(initial.isLoading, true);
  assert.strictEqual(initial.isMutating, false);
  assert.strictEqual(initial.error, null);
  assert.strictEqual(initial.events.length, 0);

  // 2. Load month data
  let listenerFired = 0;
  store.subscribe(() => {
    listenerFired++;
  });

  await store.loadMonth('2026-10');

  const loaded = store.getState();
  assert.strictEqual(loaded.isLoading, false);
  assert.strictEqual(loaded.error, null);
  assert.strictEqual(loaded.events.length, 1);
  assert.strictEqual(loaded.events[0].title, 'Study Session');
  assert.strictEqual(loaded.events[0].status, 'pending');
  assert.ok(listenerFired > 0, 'Subscribers must be notified upon load completion');
});

test('Calendar Store: Selected month change transitions state and queries new month', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  // Seed October and November events
  await repo.create({
    title: 'October Midterm',
    startTime: '2026-10-20T10:00:00.000Z',
    category: 'Academic',
  });
  await repo.create({
    title: 'November Project Due',
    startTime: '2026-11-15T14:00:00.000Z',
    category: 'Work',
  });

  const store = new CalendarStore('2026-10', repo);
  await store.loadMonth('2026-10');
  assert.strictEqual(store.getState().events.length, 1);
  assert.strictEqual(store.getState().events[0].title, 'October Midterm');

  // Switch to November
  await store.selectMonth('2026-11');
  const novState = store.getState();
  assert.strictEqual(novState.selectedMonth, '2026-11');
  assert.strictEqual(novState.events.length, 1);
  assert.strictEqual(novState.events[0].title, 'November Project Due');

  // Reject malformed month
  await assert.rejects(
    async () => {
      await store.selectMonth('invalid-month');
    },
    /Invalid month string/i
  );
});

test('Calendar Store: Stale request ID discards older out-of-order month loads', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  await repo.create({
    title: 'October Event',
    startTime: '2026-10-10T10:00:00.000Z',
    category: 'Personal',
  });
  await repo.create({
    title: 'November Event',
    startTime: '2026-11-10T10:00:00.000Z',
    category: 'Personal',
  });

  const store = new CalendarStore('2026-10', repo);

  // Custom delay simulation on repo.getByMonth
  const originalGetByMonth = repo.getByMonth.bind(repo);
  repo.getByMonth = async (m: string) => {
    if (m === '2026-10') {
      // Artificially delay October
      await new Promise((r) => setTimeout(r, 60));
    }
    return originalGetByMonth(m);
  };

  // Launch slow October load, immediately followed by fast November load
  const slowOct = store.loadMonth('2026-10');
  const fastNov = store.loadMonth('2026-11');

  await Promise.all([slowOct, fastNov]);

  // November must remain active; slow October load must have been discarded!
  const finalState = store.getState();
  assert.strictEqual(finalState.selectedMonth, '2026-11');
  assert.strictEqual(finalState.events.length, 1);
  assert.strictEqual(finalState.events[0].title, 'November Event');
});

test('Calendar Store: updateEventStatus updates status, refreshes, and rejects invalid input', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  const event = await repo.create({
    title: 'Team Sync',
    startTime: '2026-10-15T11:00:00.000Z',
    category: 'Work',
  });

  const store = new CalendarStore('2026-10', repo);
  await store.loadMonth('2026-10');
  assert.strictEqual(store.getState().events[0].status, 'pending');

  // 1. Update status to completed
  const updated = await store.updateEventStatus(event.id, 'completed');
  assert.strictEqual(updated.status, 'completed');
  assert.strictEqual(store.getState().events[0].status, 'completed');
  assert.strictEqual(store.getState().isMutating, false);

  // 2. Update status to cancelled
  const cancelled = await store.updateEventStatus(event.id, 'cancelled');
  assert.strictEqual(cancelled.status, 'cancelled');
  assert.strictEqual(store.getState().events[0].status, 'cancelled');

  // 3. Reject invalid status
  await assert.rejects(
    async () => {
      await store.updateEventStatus(event.id, 'invalid_status' as any);
    },
    /Invalid status 'invalid_status'/i
  );

  // 4. Reject empty ID
  await assert.rejects(
    async () => {
      await store.updateEventStatus('', 'completed');
    },
    /Event ID must be a non-empty string/i
  );
});

test('Calendar Store: Mutation write failure propagates error and does not corrupt state', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  const event = await repo.create({
    title: 'Dentist',
    startTime: '2026-10-12T15:00:00.000Z',
    category: 'Health',
  });

  const store = new CalendarStore('2026-10', repo);
  await store.loadMonth('2026-10');

  // Attempt update on non-existent event ID
  await assert.rejects(
    async () => {
      await store.updateEventStatus('nonexistent-id', 'completed');
    },
    /not found/i
  );

  const state = store.getState();
  assert.strictEqual(state.isMutating, false);
  assert.ok(state.error !== null);
  assert.match(state.error.message, /not found/i);
  assert.strictEqual(state.events.length, 1);
  assert.strictEqual(state.events[0].id, event.id);
});

test('Calendar Store: Persisted write succeeds even if subsequent refresh fails', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  const event = await repo.create({
    title: 'Lab Class',
    startTime: '2026-10-14T08:00:00.000Z',
    category: 'Academic',
  });

  const store = new CalendarStore('2026-10', repo);
  await store.loadMonth('2026-10');

  // Force getByMonth to fail during the post-write refresh
  let updateCalled = false;
  const originalGetByMonth = repo.getByMonth.bind(repo);
  repo.getByMonth = async (m: string) => {
    if (updateCalled) {
      throw new Error('Simulated refresh database failure');
    }
    return originalGetByMonth(m);
  };

  updateCalled = true;

  // The update itself should succeed and return the updated event
  const result = await store.updateEventStatus(event.id, 'completed');
  assert.strictEqual(result.status, 'completed');

  // Verify write was actually persisted in SQLite
  const inDb = await repo.getById(event.id);
  assert.strictEqual(inDb?.status, 'completed');

  // Store isMutating reset to false
  assert.strictEqual(store.getState().isMutating, false);
});

test('Calendar Store: deleteEvent removes event and refreshes state', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  const event = await repo.create({
    title: 'Event to Delete',
    startTime: '2026-10-18T10:00:00.000Z',
    category: 'Other',
  });

  const store = new CalendarStore('2026-10', repo);
  await store.loadMonth('2026-10');
  assert.strictEqual(store.getState().events.length, 1);

  await store.deleteEvent(event.id);
  assert.strictEqual(store.getState().events.length, 0);
  assert.strictEqual(store.getState().isMutating, false);

  // Deleting nonexistent event rejects
  await assert.rejects(
    async () => {
      await store.deleteEvent('nonexistent-id');
    },
    /could not be deleted or was not found/i
  );
  assert.strictEqual(store.getState().isMutating, false);
});

test('Calendar Store: Concurrent mutation guard prevents overlapping mutations', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  const event = await repo.create({
    title: 'Concurrent Target',
    startTime: '2026-10-15T09:00:00.000Z',
    category: 'Work',
  });

  const store = new CalendarStore('2026-10', repo);
  await store.loadMonth('2026-10');

  // Artificially delay updateStatus
  const originalUpdate = repo.updateStatus.bind(repo);
  repo.updateStatus = async (id, status) => {
    await new Promise((r) => setTimeout(r, 50));
    return originalUpdate(id, status);
  };

  // Launch first mutation
  const firstMutation = store.updateEventStatus(event.id, 'completed');

  // Attempt second mutation immediately while first is in progress
  await assert.rejects(
    async () => {
      await store.updateEventStatus(event.id, 'cancelled');
    },
    /A calendar mutation is already in progress/i
  );

  await firstMutation;
  assert.strictEqual(store.getState().isMutating, false);
  assert.strictEqual(store.getState().events[0].status, 'completed');
});

test('Calendar Store: Repository query error sets error and resets loading', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  repo.getByMonth = async () => {
    throw new Error('Database connection failed');
  };

  const store = new CalendarStore('2026-10', repo);
  await store.loadMonth('2026-10');

  const state = store.getState();
  assert.strictEqual(state.isLoading, false);
  assert.ok(state.error !== null);
  assert.match(state.error.message, /Database connection failed/i);
});

test('Calendar Store: refresh reloads current month', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  const store = new CalendarStore('2026-10', repo);
  await store.loadMonth('2026-10');
  assert.strictEqual(store.getState().events.length, 0);

  // Directly insert an event into repo behind the store's back
  await repo.create({
    title: 'Directly Inserted',
    startTime: '2026-10-15T12:00:00.000Z',
    category: 'Personal',
  });

  // Call refresh
  await store.refresh();
  assert.strictEqual(store.getState().events.length, 1);
  assert.strictEqual(store.getState().events[0].title, 'Directly Inserted');
});
