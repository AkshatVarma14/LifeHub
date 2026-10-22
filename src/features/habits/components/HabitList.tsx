import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import type { Habit, HabitStreakSummary } from '../../../types/habits.ts';
import { HabitListItem } from './HabitListItem.tsx';

export interface HabitListProps {
  habits: Habit[];
  archivedHabits: Habit[];
  selectedDate: string;
  isLoading: boolean;
  isMutating?: boolean;
  isCompletedOnDate: (habitId: string, date: string) => boolean;
  streaksByHabitId: Record<string, HabitStreakSummary>;
  onToggleCompletion: (habitId: string) => Promise<unknown>;
  onArchiveHabit: (habitId: string) => Promise<unknown>;
  onUnarchiveHabit: (habitId: string) => Promise<unknown>;
  onDeleteHabit: (habitId: string) => Promise<unknown>;
  onAddHabit?: () => void;
  onStartTimer?: (habitId: string) => void;
}

export function HabitList({
  habits,
  archivedHabits,
  selectedDate,
  isLoading,
  isMutating = false,
  isCompletedOnDate,
  streaksByHabitId,
  onToggleCompletion,
  onArchiveHabit,
  onUnarchiveHabit,
  onDeleteHabit,
  onAddHabit,
  onStartTimer,
}: HabitListProps) {
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // 1. Loading state when no habits are loaded yet
  if (isLoading && habits.length === 0 && archivedHabits.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.loadingText}>Loading habits...</Text>
      </View>
    );
  }

  // 2. Empty state when there are no active habits
  if (habits.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🎯</Text>
        <Text style={styles.emptyTitle}>No Active Habits</Text>
        <Text style={styles.emptySubtitle}>
          Start tracking a new positive routine by creating your first habit.
        </Text>
        {onAddHabit && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create your first habit"
            disabled={isMutating}
            onPress={onAddHabit}
            style={({ pressed }) => [
              styles.emptyAddButton,
              pressed && styles.buttonPressed,
              isMutating && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.emptyAddButtonText}>+ Add Habit</Text>
          </Pressable>
        )}

        {/* Still show archived section if there are archived habits */}
        {archivedHabits.length > 0 && (
          <View style={styles.archivedWrapper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${showArchived ? 'Hide' : 'Show'} archived habits (${archivedHabits.length})`}
              onPress={() => setShowArchived((prev) => !prev)}
              style={styles.archivedToggle}
            >
              <Text style={styles.archivedToggleText}>
                {showArchived ? '▾' : '▸'} Archived Habits ({archivedHabits.length})
              </Text>
            </Pressable>

            {showArchived && (
              <View style={styles.archivedList}>
                {archivedHabits.map((h) => (
                  <HabitListItem
                    key={h.id}
                    habit={h}
                    isCompleted={false}
                    isMutating={isMutating}
                    onToggleCompletion={onToggleCompletion}
                    onUnarchive={onUnarchiveHabit}
                    onDelete={onDeleteHabit}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Active Habits Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today's Habits</Text>
        <Text style={styles.habitCountBadge}>{habits.length}</Text>
      </View>

      {habits.map((habit) => {
        const completed = isCompletedOnDate(habit.id, selectedDate);
        const streak = streaksByHabitId[habit.id]?.currentStreak ?? 0;
        return (
          <HabitListItem
            key={habit.id}
            habit={habit}
            isCompleted={completed}
            streak={streak}
            isMutating={isMutating}
            onToggleCompletion={onToggleCompletion}
            onArchive={onArchiveHabit}
            onStartTimer={onStartTimer}
          />
        );
      })}

      {/* Separate Archived Habits Section */}
      {archivedHabits.length > 0 && (
        <View style={styles.archivedWrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${showArchived ? 'Hide' : 'Show'} archived habits (${archivedHabits.length})`}
            onPress={() => setShowArchived((prev) => !prev)}
            style={styles.archivedToggle}
          >
            <Text style={styles.archivedToggleText}>
              {showArchived ? '▾' : '▸'} Archived Habits ({archivedHabits.length})
            </Text>
          </Pressable>

          {showArchived && (
            <View style={styles.archivedList}>
              {archivedHabits.map((h) => (
                <HabitListItem
                  key={h.id}
                  habit={h}
                  isCompleted={false}
                  isMutating={isMutating}
                  onToggleCompletion={onToggleCompletion}
                  onUnarchive={onUnarchiveHabit}
                  onDelete={onDeleteHabit}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAddButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  habitCountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  archivedWrapper: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    width: '100%',
  },
  archivedToggle: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  archivedToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  archivedList: {
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
