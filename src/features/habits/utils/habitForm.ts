/**
 * Habit Form State and Validation Utilities for LifeHub.
 * Stage 1: Habits UI Foundation (Slice 6C).
 */

import type { Habit } from '../../../types/habits.ts';
import { validateHabitInput, type HabitInput, type ValidationResult } from '../validation.ts';

export interface HabitFormData {
  name: string;
  description: string;
}

/**
 * Returns clean initial form state for creating or editing a habit.
 */
export function getInitialHabitFormData(existingHabit?: Habit | null): HabitFormData {
  if (existingHabit) {
    return {
      name: existingHabit.name,
      description: existingHabit.description ?? '',
    };
  }

  return {
    name: '',
    description: '',
  };
}

/**
 * Validates and maps raw form inputs into sanitized HabitInput domain payloads.
 */
export function validateAndMapHabitForm(formData: HabitFormData): ValidationResult<HabitInput> {
  return validateHabitInput({
    name: formData.name,
    description: formData.description.trim().length > 0 ? formData.description.trim() : null,
  });
}
