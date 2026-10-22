import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import type { Habit } from '../../../types/habits.ts';

export interface HabitListItemProps {
  habit: Habit;
  isCompleted: boolean;
  streak?: number;
  isMutating?: boolean;
  onToggleCompletion: (habitId: string) => Promise<unknown>;
  onArchive?: (habitId: string) => Promise<unknown>;
  onUnarchive?: (habitId: string) => Promise<unknown>;
  onDelete?: (habitId: string) => Promise<unknown>;
}

export function HabitListItem({
  habit,
  isCompleted,
  streak = 0,
  isMutating = false,
  onToggleCompletion,
  onArchive,
  onUnarchive,
  onDelete,
}: HabitListItemProps) {
  const isArchived = habit.isArchived;

  const handleToggle = () => {
    if (isMutating || isArchived) return;
    onToggleCompletion(habit.id).catch(() => {
      // Error handled by store
    });
  };

  const handleArchive = () => {
    if (isMutating || !onArchive) return;
    onArchive(habit.id).catch(() => {
      // Error handled by store
    });
  };

  const handleUnarchive = () => {
    if (isMutating || !onUnarchive) return;
    onUnarchive(habit.id).catch(() => {
      // Error handled by store
    });
  };

  const handleDelete = () => {
    if (isMutating || !onDelete) return;
    onDelete(habit.id).catch(() => {
      // Error handled by store
    });
  };

  return (
    <View style={[styles.card, isArchived && styles.cardArchived]}>
      <View style={styles.mainRow}>
        {/* Checkbox button */}
        {!isArchived && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isCompleted }}
            accessibilityLabel={`Mark ${habit.name} as ${isCompleted ? 'incomplete' : 'complete'}`}
            disabled={isMutating}
            onPress={handleToggle}
            style={({ pressed }) => [
              styles.checkbox,
              isCompleted && styles.checkboxCompleted,
              pressed && styles.buttonPressed,
              isMutating && styles.buttonDisabled,
            ]}
          >
            {isCompleted && <Text style={styles.checkmarkText}>✓</Text>}
          </Pressable>
        )}

        {/* Habit info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.habitName,
                isCompleted && !isArchived && styles.habitNameCompleted,
                isArchived && styles.habitNameArchived,
              ]}
              numberOfLines={2}
            >
              {habit.name}
            </Text>

            {streak > 0 && !isArchived && (
              <View style={styles.streakBadge} accessibilityLabel={`Current streak: ${streak} days`}>
                <Text style={styles.streakText}>🔥 {streak}d</Text>
              </View>
            )}
          </View>

          {habit.description ? (
            <Text
              style={[
                styles.habitDescription,
                isCompleted && !isArchived && styles.habitDescriptionCompleted,
              ]}
              numberOfLines={3}
            >
              {habit.description}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Action buttons row */}
      <View style={styles.actionsRow}>
        {!isArchived ? (
          onArchive && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Archive habit ${habit.name}`}
              disabled={isMutating}
              onPress={handleArchive}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.buttonPressed,
                isMutating && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.actionButtonText}>Archive</Text>
            </Pressable>
          )
        ) : (
          <View style={styles.archivedActions}>
            {onUnarchive && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Restore habit ${habit.name}`}
                disabled={isMutating}
                onPress={handleUnarchive}
                style={({ pressed }) => [
                  styles.restoreButton,
                  pressed && styles.buttonPressed,
                  isMutating && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.restoreButtonText}>Restore</Text>
              </Pressable>
            )}

            {onDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete habit ${habit.name}`}
                disabled={isMutating}
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.buttonPressed,
                  isMutating && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardArchived: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    opacity: 0.85,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  infoContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  habitNameCompleted: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  habitNameArchived: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  habitDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  habitDescriptionCompleted: {
    color: '#94a3b8',
  },
  streakBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    minHeight: 36,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  archivedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  restoreButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  restoreButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
