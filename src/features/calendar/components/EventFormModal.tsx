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
import type {
  CalendarEvent,
  EventStatus,
  EventRecurrence,
} from '../../../types/calendar.ts';
import { DEFAULT_CALENDAR_CATEGORIES } from '../../../types/calendar.ts';
import { useCalendar } from '../context/index.ts';
import {
  type EventFormData,
  getInitialEventFormData,
  validateAndMapEventForm,
  alignEndDateTime,
} from '../utils/eventForm.ts';
import { getTodayDateString } from '../../../utils/date.ts';

export interface EventFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingEvent?: CalendarEvent | null;
  selectedMonth?: string;
}

const RECURRENCE_OPTIONS: readonly EventRecurrence[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

const REMINDER_PRESETS: readonly { label: string; minutes: number | null }[] = [
  { label: 'None', minutes: null },
  { label: '10m', minutes: 10 },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '1d', minutes: 1440 },
];

const TIME_PRESETS = ['09:00', '12:00', '14:00', '18:00'];

export function EventFormModal({
  visible,
  onClose,
  editingEvent = null,
  selectedMonth,
}: EventFormModalProps) {
  const { createEvent, updateEvent, deleteEvent } = useCalendar();

  const [formData, setFormData] = useState<EventFormData>(() =>
    getInitialEventFormData(editingEvent, selectedMonth)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const isBusy = isSubmitting || isDeleting;
  const isEditing = editingEvent !== null;

  // Re-initialize form data when modal opens or editing target changes
  useEffect(() => {
    if (visible) {
      setFormData(getInitialEventFormData(editingEvent, selectedMonth));
      setFormError(null);
      setIsSubmitting(false);
      setIsConfirmingDelete(false);
      setIsDeleting(false);
    }
  }, [visible, editingEvent, selectedMonth]);

  const handleSetToday = () => {
    const today = getTodayDateString();
    setFormData((prev) => ({
      ...prev,
      startDate: today,
      endDate: prev.hasEndTime ? today : prev.endDate,
    }));
    setFormError(null);
  };

  const handleSetTomorrow = () => {
    const todayDate = new Date();
    todayDate.setDate(todayDate.getDate() + 1);
    const tomorrowStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    setFormData((prev) => ({
      ...prev,
      startDate: tomorrowStr,
      endDate: prev.hasEndTime ? tomorrowStr : prev.endDate,
    }));
    setFormError(null);
  };

  const handleDurationPreset = (minutesToAdd: number) => {
    try {
      const aligned = alignEndDateTime(
        formData.startDate,
        formData.startTime,
        undefined,
        undefined,
        minutesToAdd
      );

      setFormData((prev) => ({
        ...prev,
        hasEndTime: true,
        endDate: aligned.endDate,
        endTime: aligned.endTime,
      }));
      setFormError(null);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (isBusy) return;

    const validation = validateAndMapEventForm(formData);
    if (!validation.isValid || !validation.sanitized) {
      setFormError(validation.errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, validation.sanitized);
      } else {
        await createEvent(validation.sanitized);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(`Save failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isBusy || !editingEvent) return;

    setIsDeleting(true);
    setFormError(null);

    try {
      await deleteEvent(editingEvent.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(`Delete failed: ${message}`);
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
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
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Event' : 'New Event'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close event form"
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

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Message */}
            {formError && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            {/* 1. Event Title */}
            <Text style={styles.fieldLabel}>Event Title *</Text>
            <TextInput
              accessibilityLabel="Event title"
              style={styles.textInput}
              placeholder="e.g. Biology Midterm Review"
              placeholderTextColor="#9ca3af"
              maxLength={150}
              editable={!isBusy}
              value={formData.title}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, title: text }));
                setFormError(null);
              }}
            />

            {/* 2. Category Selector */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {DEFAULT_CALENDAR_CATEGORIES.map((cat) => {
                const isSelected = formData.category === cat;
                return (
                  <Pressable
                    key={cat}
                    accessibilityRole="button"
                    accessibilityLabel={`Category ${cat}`}
                    disabled={isBusy}
                    style={[
                      styles.chip,
                      isSelected && styles.chipActive,
                    ]}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, category: cat }));
                      setFormError(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 3. Start Date & Shortcuts */}
            <View style={styles.labelWithAction}>
              <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD) *</Text>
              <View style={styles.quickActionGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Set start date to today"
                  disabled={isBusy}
                  onPress={handleSetToday}
                  style={styles.quickActionChip}
                >
                  <Text style={styles.quickActionText}>Today</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Set start date to tomorrow"
                  disabled={isBusy}
                  onPress={handleSetTomorrow}
                  style={styles.quickActionChip}
                >
                  <Text style={styles.quickActionText}>Tomorrow</Text>
                </Pressable>
              </View>
            </View>
            <TextInput
              accessibilityLabel="Start date"
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              editable={!isBusy}
              value={formData.startDate}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, startDate: text }));
                setFormError(null);
              }}
            />

            {/* 4. Start Time & Shortcuts */}
            <View style={styles.labelWithAction}>
              <Text style={styles.fieldLabel}>Start Time (HH:mm, 24h) *</Text>
              <View style={styles.quickActionGroup}>
                {TIME_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    accessibilityRole="button"
                    accessibilityLabel={`Set start time to ${preset}`}
                    disabled={isBusy}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, startTime: preset }));
                      setFormError(null);
                    }}
                    style={styles.quickActionChip}
                  >
                    <Text style={styles.quickActionText}>{preset}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <TextInput
              accessibilityLabel="Start time"
              style={styles.textInput}
              placeholder="09:00"
              placeholderTextColor="#9ca3af"
              editable={!isBusy}
              value={formData.startTime}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, startTime: text }));
                setFormError(null);
              }}
            />

            {/* 5. End Time Toggle & Fields */}
            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Has End Time?</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={formData.hasEndTime ? 'Disable end time' : 'Enable end time'}
                disabled={isBusy}
                onPress={() => {
                  setFormData((prev) => {
                    const nextHasEndTime = !prev.hasEndTime;
                    if (nextHasEndTime) {
                      const aligned = alignEndDateTime(
                        prev.startDate,
                        prev.startTime,
                        prev.endDate,
                        prev.endTime
                      );
                      return {
                        ...prev,
                        hasEndTime: true,
                        endDate: aligned.endDate,
                        endTime: aligned.endTime,
                      };
                    }
                    return {
                      ...prev,
                      hasEndTime: false,
                    };
                  });
                  setFormError(null);
                }}
                style={[
                  styles.toggleButton,
                  formData.hasEndTime && styles.toggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    formData.hasEndTime && styles.toggleButtonTextActive,
                  ]}
                >
                  {formData.hasEndTime ? '✓ Yes' : '✕ No'}
                </Text>
              </Pressable>
            </View>

            {formData.hasEndTime && (
              <View style={styles.endTimeSection}>
                <View style={styles.labelWithAction}>
                  <Text style={styles.fieldLabel}>Duration Presets</Text>
                  <View style={styles.quickActionGroup}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add 30 minutes to start time"
                      disabled={isBusy}
                      onPress={() => handleDurationPreset(30)}
                      style={styles.quickActionChip}
                    >
                      <Text style={styles.quickActionText}>+30m</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add 1 hour to start time"
                      disabled={isBusy}
                      onPress={() => handleDurationPreset(60)}
                      style={styles.quickActionChip}
                    >
                      <Text style={styles.quickActionText}>+1h</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add 2 hours to start time"
                      disabled={isBusy}
                      onPress={() => handleDurationPreset(120)}
                      style={styles.quickActionChip}
                    >
                      <Text style={styles.quickActionText}>+2h</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.dualFieldRow}>
                  <View style={styles.dualFieldItem}>
                    <Text style={styles.subFieldLabel}>End Date</Text>
                    <TextInput
                      accessibilityLabel="End date"
                      style={styles.textInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                      editable={!isBusy}
                      value={formData.endDate}
                      onChangeText={(text) => {
                        setFormData((prev) => ({ ...prev, endDate: text }));
                        setFormError(null);
                      }}
                    />
                  </View>
                  <View style={styles.dualFieldItem}>
                    <Text style={styles.subFieldLabel}>End Time</Text>
                    <TextInput
                      accessibilityLabel="End time"
                      style={styles.textInput}
                      placeholder="10:00"
                      placeholderTextColor="#9ca3af"
                      editable={!isBusy}
                      value={formData.endTime}
                      onChangeText={(text) => {
                        setFormData((prev) => ({ ...prev, endTime: text }));
                        setFormError(null);
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 6. Location */}
            <Text style={styles.fieldLabel}>Location (optional)</Text>
            <TextInput
              accessibilityLabel="Event location"
              style={styles.textInput}
              placeholder="e.g. Science Complex Room 204"
              placeholderTextColor="#9ca3af"
              maxLength={255}
              editable={!isBusy}
              value={formData.location}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, location: text }));
                setFormError(null);
              }}
            />

            {/* 7. Notes */}
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              accessibilityLabel="Event notes"
              style={[styles.textInput, styles.notesInput]}
              placeholder="e.g. Topics to cover: chapters 4-6"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              maxLength={2000}
              editable={!isBusy}
              value={formData.notes}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, notes: text }));
                setFormError(null);
              }}
            />

            {/* 8. Recurrence */}
            <Text style={styles.fieldLabel}>Recurrence</Text>
            <View style={styles.chipRow}>
              {RECURRENCE_OPTIONS.map((rec) => {
                const isSelected = formData.recurrence === rec;
                return (
                  <Pressable
                    key={rec}
                    accessibilityRole="button"
                    accessibilityLabel={`Recurrence ${rec}`}
                    disabled={isBusy}
                    style={[
                      styles.chip,
                      isSelected && styles.chipActive,
                    ]}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, recurrence: rec }));
                      setFormError(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {rec.charAt(0).toUpperCase() + rec.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 9. Reminder Offset */}
            <Text style={styles.fieldLabel}>Reminder Notification</Text>
            <View style={styles.chipRow}>
              {REMINDER_PRESETS.map((preset) => {
                const isSelected = formData.reminderMinutesBefore === preset.minutes;
                return (
                  <Pressable
                    key={preset.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Reminder ${preset.label}`}
                    disabled={isBusy}
                    style={[
                      styles.chip,
                      isSelected && styles.chipActive,
                    ]}
                    onPress={() => {
                      setFormData((prev) => ({
                        ...prev,
                        reminderMinutesBefore: preset.minutes,
                      }));
                      setFormError(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 10. Status (when editing) */}
            {isEditing && (
              <>
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.chipRow}>
                  {(['pending', 'completed', 'cancelled'] as const).map((st) => {
                    const isSelected = formData.status === st;
                    return (
                      <Pressable
                        key={st}
                        accessibilityRole="button"
                        accessibilityLabel={`Status ${st}`}
                        disabled={isBusy}
                        style={[
                          styles.chip,
                          isSelected && styles.chipActive,
                        ]}
                        onPress={() => {
                          setFormData((prev) => ({ ...prev, status: st }));
                          setFormError(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive,
                          ]}
                        >
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Delete Confirmation Step */}
            {isEditing && (
              <View style={styles.deleteSection}>
                {isConfirmingDelete ? (
                  <View style={styles.confirmDeleteBox}>
                    <Text style={styles.confirmDeleteText}>
                      Are you sure you want to delete this event? This action cannot be undone.
                    </Text>
                    <View style={styles.confirmDeleteActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cancel delete"
                        disabled={isBusy}
                        onPress={() => setIsConfirmingDelete(false)}
                        style={styles.cancelDeleteButton}
                      >
                        <Text style={styles.cancelDeleteButtonText}>Keep Event</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Confirm delete event"
                        disabled={isBusy}
                        onPress={handleDelete}
                        style={styles.confirmDeleteButton}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete event"
                    disabled={isBusy}
                    onPress={() => setIsConfirmingDelete(true)}
                    style={styles.initialDeleteButton}
                  >
                    <Text style={styles.initialDeleteButtonText}>Delete Event</Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              disabled={isBusy}
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Save Changes' : 'Create Event'}
              disabled={isBusy}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Save Changes' : 'Create Event'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  subFieldLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 12,
  },
  quickActionGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  quickActionChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  chipTextActive: {
    color: '#2563eb',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  toggleButtonActive: {
    backgroundColor: '#dcfce7',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#15803d',
  },
  endTimeSection: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  dualFieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  dualFieldItem: {
    flex: 1,
  },
  deleteSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  initialDeleteButton: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  initialDeleteButtonText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmDeleteBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
  },
  confirmDeleteText: {
    fontSize: 12,
    color: '#991b1b',
    marginBottom: 10,
  },
  confirmDeleteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelDeleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  confirmDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  confirmDeleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
