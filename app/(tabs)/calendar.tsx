import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import type { CalendarEvent } from '@/src/types/calendar';
import { useCalendar } from '@/src/features/calendar/context';
import {
  MonthSelector,
  EventList,
  EventFormModal,
} from '@/src/features/calendar/components';

export default function CalendarScreen() {
  const {
    selectedMonth,
    setSelectedMonth,
    events,
    isLoading,
    isMutating,
    error,
    updateEventStatus,
    refresh,
  } = useCalendar();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const handleOpenAdd = useCallback(() => {
    setEditingEvent(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingEvent(null);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh().catch(() => {
      // Error handled by store
    });
  }, [refresh]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      {/* 1. Month Navigation Stepper */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        isLoading={isLoading || isMutating}
      />

      {/* 2. Error Banner */}
      {error && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <View style={styles.errorTextContainer}>
            <Text style={styles.errorTitle}>Error loading calendar events</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading calendar data"
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* 3. Event List */}
      <EventList
        events={events}
        selectedMonth={selectedMonth}
        isLoading={isLoading}
        isMutating={isMutating}
        onUpdateStatus={updateEventStatus}
        onEdit={handleOpenEdit}
        onAddEvent={handleOpenAdd}
      />

      {/* 4. Event Form Modal (Create / Edit) */}
      <EventFormModal
        visible={isModalOpen}
        onClose={handleCloseModal}
        editingEvent={editingEvent}
        selectedMonth={selectedMonth}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorMessage: {
    fontSize: 12,
    color: '#b91c1c',
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
