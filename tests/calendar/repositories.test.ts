import test from 'node:test';
import assert from 'node:assert';
import { createTestDatabase } from '../helpers/testDatabase.ts';
import { SqliteEventRepository } from '../../src/features/calendar/repositories/index.ts';

test('Event Repository: CRUD lifecycle and default source mapping', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  // 1. Create event
  const created = await repo.create({
    title: 'Initial Event',
    startTime: '2026-10-15T09:00:00.000Z',
    endTime: '2026-10-15T10:00:00.000Z',
    category: 'Work',
    location: 'Meeting Room 1',
    notes: 'Discuss Q4 objectives',
    recurrence: 'weekly',
    reminderMinutesBefore: 15,
  });

  assert.ok(created.id);
  assert.strictEqual(created.title, 'Initial Event');
  assert.strictEqual(created.startTime, '2026-10-15T09:00:00.000Z');
  assert.strictEqual(created.endTime, '2026-10-15T10:00:00.000Z');
  assert.strictEqual(created.category, 'Work');
  assert.strictEqual(created.location, 'Meeting Room 1');
  assert.strictEqual(created.notes, 'Discuss Q4 objectives');
  assert.strictEqual(created.recurrence, 'weekly');
  assert.strictEqual(created.reminderMinutesBefore, 15);
  assert.strictEqual(created.status, 'pending');
  assert.strictEqual(created.source, 'manual');
  assert.ok(created.createdAt);
  assert.ok(created.updatedAt);

  // 2. GetById
  const retrieved = await repo.getById(created.id);
  assert.deepStrictEqual(retrieved, created);

  // 3. Update
  const updated = await repo.update(created.id, {
    title: 'Updated Event Title',
    startTime: '2026-10-15T10:00:00.000Z',
    endTime: '2026-10-15T11:00:00.000Z',
    category: 'Personal',
    location: 'Online',
    notes: 'Updated notes',
    recurrence: 'none',
    reminderMinutesBefore: null,
    status: 'completed',
  });

  assert.strictEqual(updated.id, created.id);
  assert.strictEqual(updated.title, 'Updated Event Title');
  assert.strictEqual(updated.startTime, '2026-10-15T10:00:00.000Z');
  assert.strictEqual(updated.category, 'Personal');
  assert.strictEqual(updated.status, 'completed');
  assert.strictEqual(updated.reminderMinutesBefore, null);
  assert.ok(new Date(updated.updatedAt).getTime() >= new Date(created.updatedAt).getTime());

  // 4. Delete
  const deleted = await repo.delete(created.id);
  assert.strictEqual(deleted, true);

  const afterDelete = await repo.getById(created.id);
  assert.strictEqual(afterDelete, null);
});

test('Event Repository: Missing ID and error handling conventions', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  // Get nonexistent returns null
  const notFound = await repo.getById('nonexistent-id');
  assert.strictEqual(notFound, null);

  // Delete nonexistent returns false without throwing
  const deleteResult = await repo.delete('nonexistent-id');
  assert.strictEqual(deleteResult, false);

  // Update nonexistent throws descriptive Error
  await assert.rejects(
    async () => {
      await repo.update('nonexistent-id', {
        title: 'Title',
        startTime: '2026-10-15T10:00:00Z',
        category: 'Work',
      });
    },
    /Event with id 'nonexistent-id' not found/i
  );

  // UpdateStatus nonexistent throws descriptive Error
  await assert.rejects(
    async () => {
      await repo.updateStatus('nonexistent-id', 'completed');
    },
    /Event with id 'nonexistent-id' not found/i
  );
});

test('Event Repository: Dedicated updateStatus atomic mutation', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  const event = await repo.create({
    title: 'Assignment Deadline',
    startTime: '2026-10-16T23:59:00.000Z',
    category: 'Academic',
  });
  assert.strictEqual(event.status, 'pending');

  // Mark as completed
  const completed = await repo.updateStatus(event.id, 'completed');
  assert.strictEqual(completed.status, 'completed');
  assert.ok(new Date(completed.updatedAt).getTime() >= new Date(event.updatedAt).getTime());

  // Mark as cancelled
  const cancelled = await repo.updateStatus(event.id, 'cancelled');
  assert.strictEqual(cancelled.status, 'cancelled');

  // Invalid status throws
  await assert.rejects(
    async () => {
      await repo.updateStatus(event.id, 'invalid_status' as any);
    },
    /Invalid status/i
  );
});

test('Event Repository: ListAll ordering by start_time ASC', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  // Insert events out of chronological order
  await repo.create({ title: 'Event 3 (Latest)', startTime: '2026-10-20T10:00:00.000Z', category: 'Other' });
  await repo.create({ title: 'Event 1 (Earliest)', startTime: '2026-10-05T08:00:00.000Z', category: 'Other' });
  await repo.create({ title: 'Event 2 (Middle)', startTime: '2026-10-10T12:00:00.000Z', category: 'Other' });

  const list = await repo.listAll();
  assert.strictEqual(list.length, 3);
  assert.strictEqual(list[0].title, 'Event 1 (Earliest)');
  assert.strictEqual(list[1].title, 'Event 2 (Middle)');
  assert.strictEqual(list[2].title, 'Event 3 (Latest)');
});

test('Event Repository: getByDateRange half-open boundary and offset normalization', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  // Boundary timestamps: [2026-10-10T00:00:00.000Z, 2026-10-20T00:00:00.000Z)
  const tStart = '2026-10-10T00:00:00.000Z';
  const tEnd = '2026-10-20T00:00:00.000Z';

  // 1. Before range
  await repo.create({ title: 'Before', startTime: '2026-10-09T23:59:59.999Z', category: 'Work' });

  // 2. Exactly on lower bound (Included)
  await repo.create({ title: 'Exact Start', startTime: '2026-10-10T00:00:00.000Z', category: 'Work' });

  // 3. Middle of range (Included)
  await repo.create({ title: 'Middle', startTime: '2026-10-15T12:00:00.000Z', category: 'Work' });

  // 4. 1ms before upper bound (Included)
  await repo.create({ title: 'Just Before End', startTime: '2026-10-19T23:59:59.999Z', category: 'Work' });

  // 5. Exactly on upper bound (Excluded)
  await repo.create({ title: 'Exact End', startTime: '2026-10-20T00:00:00.000Z', category: 'Work' });

  // 6. After range
  await repo.create({ title: 'After', startTime: '2026-10-20T00:00:01.000Z', category: 'Work' });

  // Query with exact bounds
  const results = await repo.getByDateRange(tStart, tEnd);
  assert.strictEqual(results.length, 3);
  assert.strictEqual(results[0].title, 'Exact Start');
  assert.strictEqual(results[1].title, 'Middle');
  assert.strictEqual(results[2].title, 'Just Before End');

  // Query with equivalent offset bounds: 2026-10-10T05:30:00+05:30 is 2026-10-10T00:00:00.000Z
  const offsetResults = await repo.getByDateRange(
    '2026-10-10T05:30:00+05:30',
    '2026-10-20T05:30:00+05:30'
  );
  assert.strictEqual(offsetResults.length, 3);
  assert.strictEqual(offsetResults[0].title, 'Exact Start');

  // Equal bounds returns empty array immediately
  const emptyResults = await repo.getByDateRange(tStart, tStart);
  assert.strictEqual(emptyResults.length, 0);

  // Inverted bounds throws
  await assert.rejects(
    async () => {
      await repo.getByDateRange(tEnd, tStart);
    },
    /cannot be after endExclusiveUtc/i
  );
});

test('Event Repository: getByMonth UTC calendar month filtering and multi-day spanning semantics', async () => {
  const { executor } = createTestDatabase();
  const repo = new SqliteEventRepository(executor);

  // Seed events around October 2026 UTC
  // September 30 at 23:59:59 UTC
  await repo.create({ title: 'Late Sep', startTime: '2026-09-30T23:59:59.999Z', category: 'Work' });

  // October 1 at 00:00:00 UTC (Included in Oct)
  await repo.create({ title: 'Oct Start', startTime: '2026-10-01T00:00:00.000Z', category: 'Work' });

  // October 15 at 12:00:00 UTC (Included in Oct)
  await repo.create({ title: 'Oct Mid', startTime: '2026-10-15T12:00:00.000Z', category: 'Work' });

  // October 31 at 23:59:59.999 UTC (Included in Oct)
  await repo.create({ title: 'Oct End', startTime: '2026-10-31T23:59:59.999Z', category: 'Work' });

  // November 1 at 00:00:00 UTC (Excluded from Oct; Included in Nov)
  await repo.create({ title: 'Nov Start', startTime: '2026-11-01T00:00:00.000Z', category: 'Work' });

  // Multi-day spanning event: starts Sep 30 at 22:00 UTC, ends Oct 2 at 10:00 UTC
  // Must be EXCLUDED from October because its start_time is in September!
  await repo.create({
    title: 'Spanning Event (Sep to Oct)',
    startTime: '2026-09-30T22:00:00.000Z',
    endTime: '2026-10-02T10:00:00.000Z',
    category: 'Work',
  });

  const octEvents = await repo.getByMonth('2026-10');
  assert.strictEqual(octEvents.length, 3);
  assert.strictEqual(octEvents[0].title, 'Oct Start');
  assert.strictEqual(octEvents[1].title, 'Oct Mid');
  assert.strictEqual(octEvents[2].title, 'Oct End');

  const novEvents = await repo.getByMonth('2026-11');
  assert.strictEqual(novEvents.length, 1);
  assert.strictEqual(novEvents[0].title, 'Nov Start');

  // Year transition (December 2026)
  await repo.create({ title: 'Dec Event', startTime: '2026-12-15T10:00:00.000Z', category: 'Work' });
  await repo.create({ title: 'Jan Next Year Event', startTime: '2027-01-01T00:00:00.000Z', category: 'Work' });

  const decEvents = await repo.getByMonth('2026-12');
  assert.strictEqual(decEvents.length, 1);
  assert.strictEqual(decEvents[0].title, 'Dec Event');

  // Leap-year February 2024
  await repo.create({ title: 'Leap Day Event', startTime: '2024-02-29T23:59:59.999Z', category: 'Work' });
  await repo.create({ title: 'March 1 Event', startTime: '2024-03-01T00:00:00.000Z', category: 'Work' });

  const leapFebEvents = await repo.getByMonth('2024-02');
  assert.strictEqual(leapFebEvents.length, 1);
  assert.strictEqual(leapFebEvents[0].title, 'Leap Day Event');

  // Invalid month rejects
  await assert.rejects(
    async () => { await repo.getByMonth('invalid-month'); },
    /Invalid month string/i
  );
});
