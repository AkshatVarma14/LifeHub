/**
 * Demo Data Generator for LifeHub.
 * Stage 1: Demo Data Seeder (Slice 8).
 * Pure deterministic factory producing valid inputs relative to a reference date.
 */

import type { TransactionInput, BudgetInput, FixedPaymentInput } from '../../finance/validation.ts';
import type { EventInput } from '../../calendar/validation.ts';
import type { HabitInput, CompletionInput } from '../../habits/validation.ts';
import {
  getTodayDateString,
  extractMonthFromDate,
  getPreviousDateString,
  getNextDateString,
  isValidDateString,
} from '../../../utils/date.ts';

export interface DemoHabitDefinition {
  habit: HabitInput;
  completionDates: string[]; // Dates relative to referenceDate
}

export interface DemoDataPackage {
  referenceDate: string;
  referenceMonth: string;
  finance: {
    budget: BudgetInput;
    commitments: FixedPaymentInput[];
    // Generator function for transactions, given the created commitment ID
    getTransactions: (rentCommitmentId?: string | null) => TransactionInput[];
  };
  calendar: {
    events: EventInput[];
  };
  habits: {
    definitions: DemoHabitDefinition[];
  };
}

/**
 * Creates canonical UTC ISO string for a specific local wall-clock time on a given calendar date.
 */
export function createLocalIso(dateStr: string, hours: number, minutes: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, hours, minutes, 0, 0);
  return dateObj.toISOString();
}

/**
 * Formats a bounded calendar date within a month (e.g. clamp day to month length).
 */
function getMonthDayDate(monthStr: string, desiredDay: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const maxDays = new Date(y, m, 0).getDate();
  const day = Math.min(desiredDay, maxDays);
  const dayStr = String(day).padStart(2, '0');
  return `${monthStr}-${dayStr}`;
}

/**
 * Generates a complete, internally consistent demo data package tailored to the given reference date.
 */
export function generateDemoData(referenceDate?: string): DemoDataPackage {
  const today = referenceDate && isValidDateString(referenceDate)
    ? referenceDate
    : getTodayDateString();

  const month = extractMonthFromDate(today);

  // Consecutive previous days for habit streaks
  const dayMinus1 = getPreviousDateString(today);
  const dayMinus2 = getPreviousDateString(dayMinus1);
  const dayMinus3 = getPreviousDateString(dayMinus2);
  const dayMinus4 = getPreviousDateString(dayMinus3);
  const tomorrow = getNextDateString(today);

  // 1. Finance Demo Package
  const budget: BudgetInput = {
    month,
    totalBudgetPaise: 4500000, // ₹45,000
    categoryLimitsJson: JSON.stringify({
      'Food & Dining': 1500000, // ₹15,000
      Transportation: 500000, // ₹5,000
      Housing: 2000000, // ₹20,000
    }),
  };

  const commitments: FixedPaymentInput[] = [
    {
      name: 'Apartment Rent',
      category: 'Housing',
      expectedAmountPaise: 1800000, // ₹18,000
      dueDay: 5,
      active: true,
    },
    {
      name: 'Campus WiFi & Mobile',
      category: 'Utilities & Bills',
      expectedAmountPaise: 120000, // ₹1,200
      dueDay: 10,
      active: true,
    },
  ];

  const getTransactions = (rentCommitmentId?: string | null): TransactionInput[] => [
    // Income
    {
      description: 'Graduate Research Assistant Stipend',
      amountPaise: 5000000, // ₹50,000
      type: 'income',
      category: 'Stipend / Allowance',
      date: getMonthDayDate(month, 1),
    },
    // Linked Fixed Obligation Payment (ADR-02 non-double-counting verification)
    {
      description: 'Apartment Rent - Monthly',
      amountPaise: 1800000, // ₹18,000
      type: 'expense',
      category: 'Housing',
      date: getMonthDayDate(month, 5),
      linkedFixedPaymentId: rentCommitmentId ?? null,
    },
    // Discretionary Expenses
    {
      description: 'Campus Supermarket Groceries',
      amountPaise: 320000, // ₹3,200
      type: 'expense',
      category: 'Food & Dining',
      date: getMonthDayDate(month, 12),
    },
    {
      description: 'Metro Card Monthly Recharge',
      amountPaise: 85000, // ₹850
      type: 'expense',
      category: 'Transportation',
      date: getMonthDayDate(month, 15),
    },
    {
      description: 'Textbooks & Stationery',
      amountPaise: 145000, // ₹1,450
      type: 'expense',
      category: 'Education & Work',
      date: getMonthDayDate(month, 18),
    },
  ];

  // 2. Calendar Demo Events (3 events today for dashboard snapshot + 1 event tomorrow)
  const calendarEvents: EventInput[] = [
    {
      title: 'Software Engineering Lecture',
      startTime: createLocalIso(today, 9, 30),
      endTime: createLocalIso(today, 10, 45),
      category: 'Academic',
      location: 'Lecture Hall 3B',
      notes: 'Bring project notebook and sprint backlog review',
      recurrence: 'weekly',
      reminderMinutesBefore: 15,
      status: 'pending',
      source: 'manual',
    },
    {
      title: 'PBL Project Team Sync',
      startTime: createLocalIso(today, 14, 0),
      endTime: createLocalIso(today, 15, 0),
      category: 'Work',
      location: 'Innovation Lab Rm 204',
      notes: 'Demo Stage 1 vertical slice and review test coverage',
      recurrence: 'none',
      reminderMinutesBefore: 10,
      status: 'pending',
      source: 'manual',
    },
    {
      title: 'Gym & Cardio Workout',
      startTime: createLocalIso(today, 18, 0),
      endTime: createLocalIso(today, 19, 15),
      category: 'Health',
      location: 'Campus Recreation Center',
      notes: 'Chest and triceps routine followed by 20m treadmill',
      recurrence: 'none',
      reminderMinutesBefore: 30,
      status: 'pending',
      source: 'manual',
    },
    {
      title: 'Machine Learning Seminar',
      startTime: createLocalIso(tomorrow, 11, 0),
      endTime: createLocalIso(tomorrow, 12, 30),
      category: 'Academic',
      location: 'Auditorium A',
      notes: 'Guest speaker on on-device model quantization',
      recurrence: 'none',
      reminderMinutesBefore: 15,
      status: 'pending',
      source: 'manual',
    },
  ];

  // 3. Habits Demo Package with Streaks
  const habitDefinitions: DemoHabitDefinition[] = [
    {
      habit: {
        name: 'Morning 20-Min Run',
        description: 'Outdoor running around campus track',
        isArchived: false,
      },
      // 5-day continuous streak ending today!
      completionDates: [dayMinus4, dayMinus3, dayMinus2, dayMinus1, today],
    },
    {
      habit: {
        name: 'Read Research Papers',
        description: 'Read at least 1 conference paper per day',
        isArchived: false,
      },
      // 2-day continuous streak ending today
      completionDates: [dayMinus1, today],
    },
    {
      habit: {
        name: 'Drink 2.5L Water',
        description: 'Stay hydrated throughout study and workouts',
        isArchived: false,
      },
      // 1-day completion today
      completionDates: [today],
    },
    {
      habit: {
        name: 'Evening Meditation',
        description: '10-minute mindfulness breathing before sleep',
        isArchived: false,
      },
      // Completed yesterday, not yet completed today (streak preserved as 1!)
      completionDates: [dayMinus1],
    },
  ];

  return {
    referenceDate: today,
    referenceMonth: month,
    finance: {
      budget,
      commitments,
      getTransactions,
    },
    calendar: {
      events: calendarEvents,
    },
    habits: {
      definitions: habitDefinitions,
    },
  };
}
