import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import type { CalendarEvent, EventStatus } from '../../../types/calendar.ts';
import {
  formatLocalDateKey,
  formatEventDateHeader,
  formatMonthDisplay,
} from '../../../utils/date.ts';
import { EventListItem } from './EventListItem.tsx';

export interface EventListProps {
  events: CalendarEvent[];
  selectedMonth: string;
  isLoading: boolean;
  isMutating?: boolean;
  onUpdateStatus: (id: string, status: EventStatus) => Promise<unknown>;
  onEdit?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
}

export function EventList({
  events,
  selectedMonth,
  isLoading,
  isMutating = false,
  onUpdateStatus,
  onEdit,
  onAddEvent,
}: EventListProps) {
  let formattedMonth = selectedMonth;
  try {
    formattedMonth = formatMonthDisplay(selectedMonth);
  } catch {
    // fallback
  }

  // 1. Loading state with no events
  if (isLoading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.loadingText}>Loading events for {formattedMonth}...</Text>
      </View>
    );
  }

  // 2. Empty state
  if (events.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No events in {formattedMonth}</Text>
        <Text style={styles.emptySubtitle}>
          There are no events scheduled for this month.
        </Text>
        {onAddEvent && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add an event for this month"
            disabled={isMutating}
            onPress={onAddEvent}
            style={({ pressed }) => [
              styles.emptyAddButton,
              pressed && styles.buttonPressed,
              isMutating && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.emptyAddButtonText}>+ Add Event</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // 3. Group events chronologically by local date
  const groupedEvents = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const dateKey = formatLocalDateKey(event.startTime);
    const existing = groupedEvents.get(dateKey);
    if (existing) {
      existing.push(event);
    } else {
      groupedEvents.set(dateKey, [event]);
    }
  }

  // Sort dates chronologically
  const sortedDates = Array.from(groupedEvents.keys()).sort();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Events</Text>
          <Text style={styles.countBadge}>{events.length}</Text>
        </View>
        {onAddEvent && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add event"
            disabled={isMutating}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.buttonPressed,
              isMutating && styles.buttonDisabled,
            ]}
            onPress={onAddEvent}
          >
            <Text style={styles.addButtonText}>+ Add Event</Text>
          </Pressable>
        )}
      </View>

      {sortedDates.map((dateKey) => {
        const dayEvents = groupedEvents.get(dateKey) ?? [];
        // Sort events within each day by start time
        const sortedDayEvents = [...dayEvents].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );

        return (
          <View key={dateKey} style={styles.dateGroup}>
            <View style={styles.dateHeaderContainer}>
              <Text style={styles.dateHeaderText}>
                {formatEventDateHeader(dateKey)}
              </Text>
              <Text style={styles.eventCountBadge}>
                {sortedDayEvents.length} {sortedDayEvents.length === 1 ? 'event' : 'events'}
              </Text>
            </View>

            {sortedDayEvents.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                onUpdateStatus={onUpdateStatus}
                onEdit={onEdit}
                isMutating={isMutating}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCountBadge: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyAddButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  emptyAddButtonText: {
    fontSize: 13,
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
