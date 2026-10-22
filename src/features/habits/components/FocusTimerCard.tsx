import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type { Habit } from '../../../types/habits.ts';
import { useHabits } from '../context/index.ts';
import { calculateTimerState } from '../timer.ts';
import { getTimerDisplayModel } from '../utils/timerUi.ts';

export interface FocusTimerCardProps {
  habits: Habit[];
  onOpenStartModal: () => void;
}

export function FocusTimerCard({
  habits,
  onOpenStartModal,
}: FocusTimerCardProps) {
  const {
    activeTimer,
    pauseTimer,
    resumeTimer,
    completeTimer,
    cancelTimer,
    isMutatingTimer,
    isMutating,
  } = useHabits();

  const [, setTick] = useState<number>(0);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Re-render every second when timer is in 'running' status
  useEffect(() => {
    if (activeTimer?.status !== 'running') return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.status]);

  // Reset confirmation box if activeTimer disappears or changes
  useEffect(() => {
    setIsConfirmingCancel(false);
    setActionError(null);
  }, [activeTimer?.id]);

  const isBusy = isMutatingTimer || isMutating;

  // Derive authoritative calculated state from timestamps
  const calculated = activeTimer ? calculateTimerState(activeTimer) : null;
  const model = getTimerDisplayModel(activeTimer, calculated, habits);

  const handlePause = async () => {
    setActionError(null);
    try {
      await pauseTimer();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to pause timer.');
    }
  };

  const handleResume = async () => {
    setActionError(null);
    try {
      await resumeTimer();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to resume timer.');
    }
  };

  const handleComplete = async () => {
    setActionError(null);
    try {
      await completeTimer();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to complete timer.');
    }
  };

  const handleConfirmCancel = async () => {
    setActionError(null);
    try {
      await cancelTimer();
      setIsConfirmingCancel(false);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to cancel timer.');
    }
  };

  // 1. Inactive State: No timer session currently running or paused
  if (!model.isActive) {
    return (
      <View style={styles.card}>
        <View style={styles.inactiveRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>⏱️</Text>
          </View>
          <View style={styles.inactiveTextContainer}>
            <Text style={styles.inactiveTitle}>Focus Timer</Text>
            <Text style={styles.inactiveSubtitle}>
              Track stopwatch or countdown focus sessions for your habits.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a focus timer"
          disabled={isBusy}
          onPress={onOpenStartModal}
          style={({ pressed }) => [
            styles.startSessionButton,
            pressed && styles.buttonPressed,
            isBusy && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.startSessionButtonText}>+ Start Focus Timer</Text>
        </Pressable>
      </View>
    );
  }

  // 2. Active State: Running or paused session
  const isCountdown = model.type === 'countdown';
  const isRunning = model.status === 'running';

  return (
    <View style={styles.activeCard} accessibilityRole="timer">
      {/* Top Header: Type & Status Badges */}
      <View style={styles.activeHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {isCountdown ? '⏳ Countdown' : '⏱️ Stopwatch'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isRunning ? styles.statusBadgeRunning : styles.statusBadgePaused,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              isRunning ? styles.statusRunningText : styles.statusPausedText,
            ]}
          >
            {isRunning ? '● RUNNING' : '❚❚ PAUSED'}
          </Text>
        </View>
      </View>

      {/* Associated Habit */}
      <View style={styles.habitRow}>
        <Text style={styles.habitLabel}>Habit:</Text>
        <Text style={styles.habitValue} numberOfLines={1}>
          {model.habitName ? `🎯 ${model.habitName}` : 'General Focus'}
        </Text>
      </View>

      {/* Main Digital Clock Display */}
      <View style={styles.clockContainer}>
        <Text
          style={[
            styles.clockDigits,
            model.isExpired && styles.clockDigitsExpired,
          ]}
          accessibilityLabel={`${isCountdown ? 'Remaining' : 'Elapsed'} time: ${model.formattedTime}`}
        >
          {model.formattedTime}
        </Text>

        {isCountdown && model.formattedTarget && (
          <Text style={styles.targetText}>
            Target: {model.formattedTarget}
            {model.progressPercent !== null ? ` (${model.progressPercent}%)` : ''}
          </Text>
        )}
      </View>

      {/* Expiry Notification Banner */}
      {model.isExpired && (
        <View style={styles.expiryBanner} accessibilityRole="alert">
          <Text style={styles.expiryBannerText}>
            🎉 Target reached! Tap Complete to save your progress.
          </Text>
        </View>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      )}

      {/* Inline Cancel Confirmation Box */}
      {isConfirmingCancel ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Cancel focus session?</Text>
          <Text style={styles.confirmSubtitle}>
            Elapsed progress will be discarded and cannot be restored.
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep session running"
              disabled={isBusy}
              onPress={() => setIsConfirmingCancel(false)}
              style={({ pressed }) => [
                styles.cancelDismissButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.cancelDismissText}>Keep Session</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm cancel focus session"
              disabled={isBusy}
              onPress={handleConfirmCancel}
              style={({ pressed }) => [
                styles.cancelConfirmButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.cancelConfirmText}>Cancel Session</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        /* Lifecycle Controls */
        <View style={styles.controlsRow}>
          {isRunning ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pause focus timer"
              disabled={isBusy}
              onPress={handlePause}
              style={({ pressed }) => [
                styles.controlButton,
                styles.pauseButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.pauseButtonText}>❚❚ Pause</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume focus timer"
              disabled={isBusy}
              onPress={handleResume}
              style={({ pressed }) => [
                styles.controlButton,
                styles.resumeButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.resumeButtonText}>▶ Resume</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Complete focus session"
            disabled={isBusy}
            onPress={handleComplete}
            style={({ pressed }) => [
              styles.controlButton,
              styles.completeButton,
              pressed && styles.buttonPressed,
              isBusy && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.completeButtonText}>✓ Complete</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel focus session"
            disabled={isBusy}
            onPress={() => setIsConfirmingCancel(true)}
            style={({ pressed }) => [
              styles.controlButton,
              styles.cancelButton,
              pressed && styles.buttonPressed,
              isBusy && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.cancelButtonText}>✕ Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
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
  inactiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  inactiveTextContainer: {
    flex: 1,
  },
  inactiveTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  inactiveSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  startSessionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  startSessionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  activeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeRunning: {
    backgroundColor: '#dcfce7',
  },
  statusBadgePaused: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusRunningText: {
    color: '#15803d',
  },
  statusPausedText: {
    color: '#b45309',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  habitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  habitValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  clockContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  clockDigits: {
    fontSize: 44,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  clockDigitsExpired: {
    color: '#dc2626',
  },
  targetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },
  expiryBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  expiryBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  controlButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pauseButton: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pauseButtonText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
  },
  resumeButton: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  resumeButtonText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
  },
  completeButton: {
    backgroundColor: '#2563eb',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 4,
  },
  confirmSubtitle: {
    fontSize: 12,
    color: '#b91c1c',
    marginBottom: 12,
    lineHeight: 16,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  cancelDismissButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelDismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  cancelConfirmButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
