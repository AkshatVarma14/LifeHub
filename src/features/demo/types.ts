/**
 * Demo Data Seeder Types for LifeHub.
 * Stage 1: Demo Data Seeder (Slice 8).
 */

export interface ModuleSeedResult {
  created: number;
  skipped: number;
  error?: string;
}

export interface SeedResult {
  success: boolean;
  finance: ModuleSeedResult;
  calendar: ModuleSeedResult;
  habits: ModuleSeedResult;
}

export interface SeedOptions {
  todayDate?: string; // YYYY-MM-DD (defaults to local today)
  currentMonth?: string; // YYYY-MM (defaults to local current month)
}
