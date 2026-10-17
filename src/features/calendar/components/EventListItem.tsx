import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import type { CalendarEvent, EventStatus } from '../../../types/calendar.ts';
import { formatTimeDisplay } from '../../../utils/date.ts';

export interface EventListItemProps {
  event: CalendarEvent;
  onUpdateStatus: (id: string, status: EventStatus) => Promise<unknown>;
  onDelete?: (id: string) => Promise<unknown>;
  isMutating?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Academic: { bg: '#e0e7ff', text: '#3730a3' },
  Work: { bg: '#dbeafe', text: '#1e40af' },
  Personal: { bg: '#f3e8ff', text: '#6b21a8' },
  Health: { bg: '#dcfce7', text: '#166534' },
  Finance: { bg: '#fef3c7', text: '#92400e' },
  Other: { bg: '#f3f4f6', text: '#374151' },
};

export function EventListItem({
  event,
  onUpdateStatus,
  onDelete,
  isMutating = false,
}: EventListItemProps) {
  const startTimeFormatted = formatTimeDisplay(event.startTime);
  const endTimeFormatted = event.endTime ? formatTimeDisplay(event.endTime) : null;
  const timeRange = endTimeFormatted
    ? `${startTimeFormatted} – ${endTimeFormatted}`
    : startTimeFormatted;

  const categoryStyle = CATEGORY_COLORS[event.category] ?? {
    bg: '#f3f4f6',
    text: '#374151',
  };

  const isPending = event.status === 'pending';
  const isCompleted = event.status === 'completed';
  const isCancelled = event.status === 'cancelled';

  const handleSetStatus = (newStatus: EventStatus) => {
    if (newStatus === event.status || isMutating) {
      return;
    }
    onUpdateStatus(event.id, newStatus).catch(() => {
      // Error handled by store
    });
  };

  const handleDelete = () => {
    if (isMutating || !onDelete) {
      return;
    }
    onDelete(event.id).catch(() => {
      // Error handled by store
    });
  };

  return (
    <View style={styles.card}>
      {/* 1. Header: Time and Category Badge */}
      <View style={styles.headerRow}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{timeRange}</Text>
        </View>

        <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
          <Text style={[styles.categoryBadgeText, { color: categoryStyle.text }]}>
            {event.category}
          </Text>
        </View>
      </View>

      {/* 2. Event Title */}
      <Text
        style={[
          styles.titleText,
          isCompleted && styles.titleCompleted,
          isCancelled && styles.titleCancelled,
        ]}
      >
        {event.title}
      </Text>

      {/* 3. Location and Details */}
      {event.location && (
        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText}>{event.location}</Text>
        </View>
      )}

      {/* 4. Notes snippet */}
      {event.notes && (
        <Text style={styles.notesText} numberOfLines={2}>
          {event.notes}
        </Text>
      )}

      {/* 5. Badges: Recurrence & Reminder */}
      {(event.recurrence !== 'none' || event.reminderMinutesBefore !== null) && (
        <View style={styles.tagRow}>
          {event.recurrence !== 'none' && (
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>🔄 {event.recurrence}</Text>
            </View>
          )}
          {event.reminderMinutesBefore !== null && (
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>
                🔔 {event.reminderMinutesBefore}m before
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.divider} />

      {/* 6. Explicit Status Controls */}
      <View style={styles.actionContainer}>
        <Text style={styles.actionLabel}>Status:</Text>
        <View
          style={styles.segmentedControl}
          accessibilityRole="radiogroup"
          accessibilityLabel={`Status for event ${event.title}`}
        >
          {/* Pending Button */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: isPending }}
            accessibilityLabel={`Mark "${event.title}" as pending`}
            disabled={isPending || isMutating}
            onPress={() => handleSetStatus('pending')}
            style={({ pressed }) => [
              styles.statusButton,
              isPending && styles.statusButtonPendingActive,
              pressed && styles.buttonPressed,
              isMutating && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[
                styles.statusButtonText,
                isPending && styles.statusButtonTextActive,
              ]}
            >
              {isPending ? '● Pending' : 'Pending'}
            </Text>
          </Pressable>

          {/* Completed Button */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: isCompleted }}
            accessibilityLabel={`Mark "${event.title}" as completed`}
            disabled={isCompleted || isMutating}
            onPress={() => handleSetStatus('completed')}
            style={({ pressed }) => [
              styles.statusButton,
              isCompleted && styles.statusButtonCompletedActive,
              pressed && styles.buttonPressed,
              isMutating && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[
                styles.statusButtonText,
                isCompleted && styles.statusButtonTextActive,
              ]}
            >
              {isCompleted ? '✓ Completed' : 'Completed'}
            </Text>
          </Pressable>

          {/* Cancelled Button */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: isCancelled }}
            accessibilityLabel={`Mark "${event.title}" as cancelled`}
            disabled={isCancelled || isMutating}
            onPress={() => handleSetStatus('cancelled')}
            style={({ pressed }) => [
              styles.statusButton,
              isCancelled && styles.statusButtonCancelledActive,
              pressed && styles.buttonPressed,
              isMutating && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[
                styles.statusButtonText,
                isCancelled && styles.statusButtonTextActive,
              ]}
            >
              {isCancelled ? '✕ Cancelled' : 'Cancelled'}
            </Text>
          </Pressable>
        </View>

        {onDelete && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete event ${event.title}`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    marginBottom: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  titleCancelled: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 13,
    color: '#4b5563',
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    color: '#4b5563',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 10,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  statusButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  statusButtonPendingActive: {
    backgroundColor: '#fef3c7',
  },
  statusButtonCompletedActive: {
    backgroundColor: '#dcfce7',
  },
  statusButtonCancelledActive: {
    backgroundColor: '#fee2e2',
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
  },
  statusButtonTextActive: {
    color: '#111827',
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e11d48',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
