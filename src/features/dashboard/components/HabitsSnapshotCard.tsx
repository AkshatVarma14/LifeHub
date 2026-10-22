import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import type { Habit, TimerSession } from '../../../types/habits.ts';
import { calculateTimerState } from '../../habits/timer.ts';
import { getHabitsSnapshotModel } from '../utils/dashboardHelpers.ts';

export interface HabitsSnapshotCardProps {
  habits: Habit[];
  isHabitCompletedOnDate: (habitId: string, date: string) => boolean;
  todayDate: string;
  activeTimer: TimerSession | null;
  onNavigateToHabits: () => void;
}

export function HabitsSnapshotCard({
  habits,
  isHabitCompletedOnDate,
  todayDate,
  activeTimer,
  onNavigateToHabits,
}: HabitsSnapshotCardProps) {
  // Re-render tick if a timer is running
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    if (activeTimer?.status !== 'running') return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.status]);

  const calculatedTimer = activeTimer ? calculateTimerState(activeTimer) : null;
  const model = getHabitsSnapshotModel(
    habits,
    isHabitCompletedOnDate,
    todayDate,
    activeTimer,
    calculatedTimer
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Habits and Focus Snapshot. ${model.progressText}. Focus timer: ${model.timerDisplayText}. Tap to open Habits.`}
      onPress={onNavigateToHabits}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.cardIcon}>🎯</Text>
          <View>
            <Text style={styles.cardTitle}>Habits & Focus</Text>
            <Text style={styles.cardSubtitle}>Daily Routine & Sessions</Text>
          </View>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {model.completedCount}/{model.totalActive} Done
          </Text>
        </View>
      </View>

      {/* Progress Bar Container */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${model.percentage}%` },
              model.percentage === 100 && styles.progressBarComplete,
            ]}
          />
        </View>
        <Text style={styles.progressText}>{model.progressText}</Text>
      </View>

      {/* Focus Timer Status Box */}
      <View
        style={[
          styles.timerBox,
          model.hasActiveTimer && styles.timerBoxActive,
        ]}
      >
        <View style={styles.timerHeaderRow}>
          <Text style={styles.timerBoxLabel}>Focus Session</Text>
          {model.hasActiveTimer && (
            <View
              style={[
                styles.timerStatusBadge,
                model.timerStatus === 'running'
                  ? styles.timerStatusRunning
                  : styles.timerStatusPaused,
              ]}
            >
              <Text
                style={[
                  styles.timerStatusText,
                  model.timerStatus === 'running'
                    ? styles.timerTextRunning
                    : styles.timerTextPaused,
                ]}
              >
                {model.timerStatus === 'running' ? '● RUNNING' : '❚❚ PAUSED'}
              </Text>
            </View>
          )}
        </View>

        {model.hasActiveTimer ? (
          <View style={styles.timerActiveContent}>
            <Text style={styles.timerClockText}>
              {model.timerType === 'countdown' ? '⏳' : '⏱️'} {model.formattedDuration}
            </Text>
            <Text style={styles.timerSubText} numberOfLines={1}>
              {model.isExpired
                ? '🎉 Target reached! Tap to complete'
                : model.habitName
                ? `Habit: ${model.habitName}`
                : 'General Focus Session'}
            </Text>
          </View>
        ) : (
          <View style={styles.timerInactiveContent}>
            <Text style={styles.timerInactiveText}>
              ⏱️ No active timer. Tap to start a stopwatch or countdown.
            </Text>
          </View>
        )}
      </View>

      {/* Footer Navigation Link */}
      <View style={styles.footerRow}>
        <Text style={styles.actionText}>View All Habits & Focus Timer</Text>
        <Text style={styles.chevronText}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  progressBarComplete: {
    backgroundColor: '#16a34a',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  timerBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  timerBoxActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  timerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timerBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  timerStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timerStatusRunning: {
    backgroundColor: '#dcfce7',
  },
  timerStatusPaused: {
    backgroundColor: '#fef3c7',
  },
  timerStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timerTextRunning: {
    color: '#15803d',
  },
  timerTextPaused: {
    color: '#b45309',
  },
  timerActiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timerClockText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },
  timerSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  timerInactiveContent: {
    paddingVertical: 2,
  },
  timerInactiveText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  chevronText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563eb',
    lineHeight: 22,
  },
});
