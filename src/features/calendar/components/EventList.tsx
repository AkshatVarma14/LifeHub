import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
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
  onDelete?: (id: string) => Promise<unknown>;
}

export function EventList({
  events,
  selectedMonth,
  isLoading,
  isMutating = false,
  onUpdateStatus,
  onDelete,
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
                onDelete={onDelete}
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
});
