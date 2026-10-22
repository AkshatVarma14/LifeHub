import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { Habit } from '../../../types/habits.ts';
import { useHabits } from '../context/index.ts';
import { validateCountdownDurationMinutes } from '../utils/timerUi.ts';

export interface StartTimerModalProps {
  visible: boolean;
  habits: Habit[];
  initialHabitId?: string | null;
  onClose: () => void;
}

const COUNTDOWN_PRESETS = [15, 25, 45, 60] as const;

export function StartTimerModal({
  visible,
  habits,
  initialHabitId = null,
  onClose,
}: StartTimerModalProps) {
  const { startStopwatch, startCountdown, isMutatingTimer, isMutating } = useHabits();

  const [timerType, setTimerType] = useState<'stopwatch' | 'countdown'>('countdown');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(initialHabitId);
  const [countdownMinutes, setCountdownMinutes] = useState<string>('25');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setTimerType('countdown');
      setSelectedHabitId(initialHabitId);
      setCountdownMinutes('25');
      setNotes('');
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [visible, initialHabitId]);

  const isBusy = isSubmitting || isMutatingTimer || isMutating;

  const handleSubmit = async () => {
    setFormError(null);

    const sanitizedNotes = notes.trim().length > 0 ? notes.trim() : null;

    if (timerType === 'stopwatch') {
      try {
        setIsSubmitting(true);
        await startStopwatch(selectedHabitId, sanitizedNotes);
        onClose();
      } catch (err: any) {
        setFormError(err?.message || 'Failed to start stopwatch.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Countdown validation
    const validation = validateCountdownDurationMinutes(countdownMinutes);
    if (!validation.isValid || !validation.targetDurationSeconds) {
      setFormError(validation.error ?? 'Invalid countdown duration.');
      return;
    }

    try {
      setIsSubmitting(true);
      await startCountdown(validation.targetDurationSeconds, selectedHabitId, sanitizedNotes);
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to start countdown.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Start Focus Timer</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close timer setup"
              disabled={isBusy}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.formContent} keyboardShouldPersistTaps="handled">
            {/* Error Banner */}
            {formError ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            {/* Timer Type Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Timer Type</Text>
              <View style={styles.typeSelectorRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Countdown mode"
                  disabled={isBusy}
                  onPress={() => {
                    setTimerType('countdown');
                    setFormError(null);
                  }}
                  style={[
                    styles.typeTab,
                    timerType === 'countdown' && styles.typeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeTabText,
                      timerType === 'countdown' && styles.typeTabTextActive,
                    ]}
                  >
                    ⏳ Countdown
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Stopwatch mode"
                  disabled={isBusy}
                  onPress={() => {
                    setTimerType('stopwatch');
                    setFormError(null);
                  }}
                  style={[
                    styles.typeTab,
                    timerType === 'stopwatch' && styles.typeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeTabText,
                      timerType === 'stopwatch' && styles.typeTabTextActive,
                    ]}
                  >
                    ⏱️ Stopwatch
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Countdown Duration Configuration */}
            {timerType === 'countdown' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Target Duration (Minutes)</Text>

                {/* Quick Presets */}
                <View style={styles.presetRow}>
                  {COUNTDOWN_PRESETS.map((preset) => {
                    const isSelected = countdownMinutes === String(preset);
                    return (
                      <Pressable
                        key={preset}
                        accessibilityRole="button"
                        accessibilityLabel={`${preset} minutes`}
                        disabled={isBusy}
                        onPress={() => {
                          setCountdownMinutes(String(preset));
                          setFormError(null);
                        }}
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextActive,
                          ]}
                        >
                          {preset}m
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom Minutes Input */}
                <View style={styles.customMinutesRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="25"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    value={countdownMinutes}
                    onChangeText={(text) => {
                      setCountdownMinutes(text);
                      if (formError) setFormError(null);
                    }}
                    maxLength={4}
                    editable={!isBusy}
                    accessibilityLabel="Countdown duration in minutes"
                  />
                  <Text style={styles.unitText}>minutes (1–1440)</Text>
                </View>
              </View>
            )}

            {/* Habit Association */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Link to Habit (Optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.habitsChipsContainer}
              >
                {/* None / General Focus */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="General Focus (no habit)"
                  disabled={isBusy}
                  onPress={() => setSelectedHabitId(null)}
                  style={[
                    styles.habitChip,
                    selectedHabitId === null && styles.habitChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.habitChipText,
                      selectedHabitId === null && styles.habitChipTextActive,
                    ]}
                  >
                    General Focus
                  </Text>
                </Pressable>

                {/* Active Habits */}
                {habits.map((habit) => {
                  const isSelected = selectedHabitId === habit.id;
                  return (
                    <Pressable
                      key={habit.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Link to habit ${habit.name}`}
                      disabled={isBusy}
                      onPress={() => setSelectedHabitId(habit.id)}
                      style={[
                        styles.habitChip,
                        isSelected && styles.habitChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.habitChipText,
                          isSelected && styles.habitChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        🎯 {habit.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Optional Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Session Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What are you focusing on?"
                placeholderTextColor="#94a3b8"
                value={notes}
                onChangeText={setNotes}
                maxLength={500}
                multiline={true}
                numberOfLines={2}
                editable={!isBusy}
                accessibilityLabel="Session notes"
              />
              <Text style={styles.charCount}>{notes.length}/500</Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel timer setup"
              disabled={isBusy}
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start focus timer"
              disabled={isBusy}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {timerType === 'countdown' ? '▶ Start Countdown' : '▶ Start Stopwatch'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  typeTabActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  typeTabTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 40,
  },
  presetChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  presetChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  customMinutesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customInput: {
    width: 80,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  unitText: {
    fontSize: 13,
    color: '#64748b',
  },
  habitsChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  habitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 200,
  },
  habitChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  habitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  habitChipTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
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
