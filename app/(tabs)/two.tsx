import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFinance } from '@/src/features/finance/context';
import { useCalendar } from '@/src/features/calendar/context';
import { useHabits } from '@/src/features/habits/context';
import { getTodayDateString } from '@/src/utils/date';
import {
  formatDashboardHeaderDate,
  getDashboardGreeting,
  FinanceSnapshotCard,
  HabitsSnapshotCard,
  ScheduleSnapshotCard,
} from '@/src/features/dashboard';
import { DemoDataCard } from '@/src/features/demo';

export default function DashboardScreen() {
  const router = useRouter();
  const todayDate = getTodayDateString();
  const formattedDate = formatDashboardHeaderDate(todayDate);
  const greeting = getDashboardGreeting();

  // 1. Finance store state & actions
  const financeContext = useFinance();
  const {
    summary: financeSummary,
    isLoading: isFinanceLoading,
    error: financeError,
    refresh: refreshFinance,
  } = financeContext;

  // 2. Calendar store state & actions
  const calendarContext = useCalendar();
  const {
    events: calendarEvents,
    isLoading: isCalendarLoading,
    error: calendarError,
    refresh: refreshCalendar,
  } = calendarContext;

  // 3. Habits store state & actions
  const habitsContext = useHabits();
  const {
    habits,
    isHabitCompletedOnDate,
    activeTimer,
    isLoading: isHabitsLoading,
    error: habitsError,
    refresh: refreshHabits,
  } = habitsContext;

  const isInitialLoading =
    isFinanceLoading &&
    isCalendarLoading &&
    isHabitsLoading &&
    !financeSummary &&
    calendarEvents.length === 0 &&
    habits.length === 0;

  const isRefreshing = isFinanceLoading || isCalendarLoading || isHabitsLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.allSettled([
      refreshFinance(),
      refreshCalendar(),
      refreshHabits(),
    ]);
  }, [refreshFinance, refreshCalendar, refreshHabits]);

  const handleNavigateToFinance = useCallback(() => {
    router.navigate('/(tabs)' as any);
  }, [router]);

  const handleNavigateToCalendar = useCallback(() => {
    router.navigate('/(tabs)/calendar' as any);
  }, [router]);

  const handleNavigateToHabits = useCallback(() => {
    router.navigate('/(tabs)/habits' as any);
  }, [router]);

  const anyError = financeError || calendarError || habitsError;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header Greeting & Date */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.greetingText}>{greeting}!</Text>
          <Text style={styles.subtitleText}>
            Here is your consolidated daily summary across life, work, and wellness.
          </Text>
        </View>

        {/* Loading State on initial startup */}
        {isInitialLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loadingText}>Loading dashboard overview...</Text>
          </View>
        )}

        {/* Recoverable Error Banner */}
        {anyError && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Some modules failed to refresh</Text>
              <Text style={styles.errorMessage}>
                {anyError.message || 'Please check your connection or retry.'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading dashboard modules"
              onPress={handleRefresh}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* 1. Today's Schedule Snapshot */}
        <ScheduleSnapshotCard
          events={calendarEvents}
          todayDate={todayDate}
          onNavigateToCalendar={handleNavigateToCalendar}
        />

        {/* 2. Today's Habits & Focus Snapshot */}
        <HabitsSnapshotCard
          habits={habits}
          isHabitCompletedOnDate={isHabitCompletedOnDate}
          todayDate={todayDate}
          activeTimer={activeTimer}
          onNavigateToHabits={handleNavigateToHabits}
        />

        {/* 3. Monthly Finance Snapshot */}
        <FinanceSnapshotCard
          summary={financeSummary}
          onNavigateToFinance={handleNavigateToFinance}
        />

        {/* 4. Quick-Start Demo Data Action */}
        <DemoDataCard
          contexts={{
            finance: financeContext,
            calendar: calendarContext,
            habits: habitsContext,
          }}
          todayDate={todayDate}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 14,
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  errorTextContainer: {
    flex: 1,
    marginRight: 10,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
