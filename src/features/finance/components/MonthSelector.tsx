import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import {
  getPreviousMonthString,
  getNextMonthString,
  formatMonthDisplay,
  getCurrentMonthString,
} from '../../../utils/date.ts';

export interface MonthSelectorProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  isLoading?: boolean;
}

export function MonthSelector({
  selectedMonth,
  onSelectMonth,
  isLoading = false,
}: MonthSelectorProps) {
  const currentMonth = getCurrentMonthString();
  const isCurrentMonth = selectedMonth === currentMonth;

  const handlePrevious = () => {
    try {
      const prev = getPreviousMonthString(selectedMonth);
      onSelectMonth(prev);
    } catch {
      // Ignore if month string is invalid
    }
  };

  const handleNext = () => {
    try {
      const next = getNextMonthString(selectedMonth);
      onSelectMonth(next);
    } catch {
      // Ignore if month string is invalid
    }
  };

  const handleToday = () => {
    onSelectMonth(currentMonth);
  };

  let formattedTitle = selectedMonth;
  try {
    formattedTitle = formatMonthDisplay(selectedMonth);
  } catch {
    // Fallback to raw string
  }

  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous Month"
          disabled={isLoading}
          onPress={handlePrevious}
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.monthTitle}>{formattedTitle}</Text>
          <Text style={styles.monthSubtitle}>{selectedMonth}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next Month"
          disabled={isLoading}
          onPress={handleNext}
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      {!isCurrentMonth && (
        <View style={styles.todayRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Jump to current month"
            disabled={isLoading}
            onPress={handleToday}
            style={({ pressed }) => [
              styles.todayButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.todayButtonText}>Jump to Today ({formatMonthDisplay(currentMonth)})</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1f2937',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  monthSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  todayRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
});
