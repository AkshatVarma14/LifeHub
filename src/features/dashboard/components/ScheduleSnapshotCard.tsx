import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import type { CalendarEvent } from '../../../types/calendar.ts';
import { getTodayScheduleModel } from '../utils/dashboardHelpers.ts';

export interface ScheduleSnapshotCardProps {
  events: CalendarEvent[];
  todayDate: string;
  onNavigateToCalendar: () => void;
}

export function ScheduleSnapshotCard({
  events,
  todayDate,
  onNavigateToCalendar,
}: ScheduleSnapshotCardProps) {
  const model = getTodayScheduleModel(events, todayDate, 3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Schedule Snapshot. ${model.totalTodayEvents} events scheduled for today. Tap to open Calendar.`}
      onPress={onNavigateToCalendar}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.cardIcon}>📅</Text>
          <View>
            <Text style={styles.cardTitle}>Today's Schedule</Text>
            <Text style={styles.cardSubtitle}>
              {model.totalTodayEvents === 0
                ? 'No events today'
                : `${model.totalTodayEvents} event${model.totalTodayEvents === 1 ? '' : 's'} scheduled`}
            </Text>
          </View>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{model.totalTodayEvents}</Text>
        </View>
      </View>

      {/* Events List or Empty State */}
      {model.events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events scheduled for today.</Text>
          <Text style={styles.emptySubtext}>Tap to open calendar and schedule your day.</Text>
        </View>
      ) : (
        <View style={styles.eventsList}>
          {model.events.map((item) => (
            <View key={item.id} style={styles.eventRow}>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{item.formattedStartTime}</Text>
              </View>

              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.eventCategory}>{item.category}</Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  item.status === 'completed' && styles.statusCompleted,
                  item.status === 'cancelled' && styles.statusCancelled,
                  item.status === 'pending' && styles.statusPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    item.status === 'completed' && styles.statusTextCompleted,
                    item.status === 'cancelled' && styles.statusTextCancelled,
                    item.status === 'pending' && styles.statusTextPending,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Footer Navigation Link */}
      <View style={styles.footerRow}>
        <Text style={styles.actionText}>View Full Calendar</Text>
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
  emptyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  eventsList: {
    gap: 8,
    marginBottom: 10,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  timeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  eventInfo: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  eventCategory: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: '#f1f5f9',
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusCancelled: {
    backgroundColor: '#fef2f2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusTextPending: {
    color: '#475569',
  },
  statusTextCompleted: {
    color: '#15803d',
  },
  statusTextCancelled: {
    color: '#b91c1c',
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
