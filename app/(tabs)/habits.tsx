import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useHabits } from '@/src/features/habits/context';
import {
  DateSelector,
  HabitList,
  HabitFormModal,
} from '@/src/features/habits/components';

export default function HabitsScreen() {
  const {
    habits,
    archivedHabits,
    selectedDate,
    setSelectedDate,
    isLoading,
    isMutating,
    error,
    isHabitCompletedOnDate,
    streaksByHabitId,
    toggleCompletion,
    archiveHabit,
    unarchiveHabit,
    deleteHabit,
    refresh,
  } = useHabits();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleOpenAdd = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh().catch(() => {
      // Error handled by store
    });
  }, [refresh]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* 1. Date Stepper & Navigation */}
        <DateSelector
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          isLoading={isLoading || isMutating}
        />

        {/* 2. Error Banner */}
        {error && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Error loading habits</Text>
              <Text style={styles.errorMessage}>{error.message}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading habits"
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

        {/* 3. Habit List (Active + Archived) */}
        <HabitList
          habits={habits}
          archivedHabits={archivedHabits}
          selectedDate={selectedDate}
          isLoading={isLoading}
          isMutating={isMutating}
          isCompletedOnDate={isHabitCompletedOnDate}
          streaksByHabitId={streaksByHabitId}
          onToggleCompletion={toggleCompletion}
          onArchiveHabit={archiveHabit}
          onUnarchiveHabit={unarchiveHabit}
          onDeleteHabit={deleteHabit}
          onAddHabit={handleOpenAdd}
        />
      </ScrollView>

      {/* 4. Floating Action Button to Add Habit */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add new habit"
        disabled={isMutating}
        onPress={handleOpenAdd}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
          isMutating && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.fabText}>+ Add Habit</Text>
      </Pressable>

      {/* 5. Habit Creation Modal */}
      <HabitFormModal
        visible={isModalOpen}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  screen: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 90, // Room for FAB
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  errorTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  errorTitle: {
    fontSize: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 48,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
