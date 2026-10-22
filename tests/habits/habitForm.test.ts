import test from 'node:test';
import assert from 'node:assert';
import {
  getInitialHabitFormData,
  validateAndMapHabitForm,
  type HabitFormData,
} from '../../src/features/habits/utils/habitForm.ts';
import type { Habit } from '../../src/types/habits.ts';

test('Habit Form: getInitialHabitFormData defaults for new habit', () => {
  const form = getInitialHabitFormData();
  assert.strictEqual(form.name, '');
  assert.strictEqual(form.description, '');
});

test('Habit Form: getInitialHabitFormData prepopulates from existing habit', () => {
  const existing: Habit = {
    id: 'habit-101',
    name: 'Evening Read',
    description: '30 mins of fiction before bed',
    isArchived: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  const form = getInitialHabitFormData(existing);
  assert.strictEqual(form.name, 'Evening Read');
  assert.strictEqual(form.description, '30 mins of fiction before bed');

  // Existing habit with null description
  const noDesc: Habit = {
    ...existing,
    description: null,
  };
  const form2 = getInitialHabitFormData(noDesc);
  assert.strictEqual(form2.description, '');
});

test('Habit Form: validateAndMapHabitForm valid cases', () => {
  const validData: HabitFormData = {
    name: '  Drink Water  ',
    description: '  2 liters daily  ',
  };

  const res = validateAndMapHabitForm(validData);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.errors.length, 0);
  assert.strictEqual(res.sanitized?.name, 'Drink Water');
  assert.strictEqual(res.sanitized?.description, '2 liters daily');

  // Empty description should sanitize to null
  const emptyDescData: HabitFormData = {
    name: 'Meditate',
    description: '   ',
  };
  const res2 = validateAndMapHabitForm(emptyDescData);
  assert.strictEqual(res2.isValid, true);
  assert.strictEqual(res2.sanitized?.name, 'Meditate');
  assert.strictEqual(res2.sanitized?.description, null);
});

test('Habit Form: validateAndMapHabitForm rejection cases', () => {
  // Empty name
  const emptyName: HabitFormData = {
    name: '   ',
    description: 'Something',
  };
  const res1 = validateAndMapHabitForm(emptyName);
  assert.strictEqual(res1.isValid, false);
  assert.match(res1.errors.join(' '), /name cannot be empty/i);

  // Name exceeding 100 characters
  const longName: HabitFormData = {
    name: 'A'.repeat(101),
    description: 'Valid description',
  };
  const res2 = validateAndMapHabitForm(longName);
  assert.strictEqual(res2.isValid, false);
  assert.match(res2.errors.join(' '), /cannot exceed 100 characters/i);

  // Description exceeding 500 characters
  const longDesc: HabitFormData = {
    name: 'Walk',
    description: 'D'.repeat(501),
  };
  const res3 = validateAndMapHabitForm(longDesc);
  assert.strictEqual(res3.isValid, false);
  assert.match(res3.errors.join(' '), /cannot exceed 500 characters/i);
});
