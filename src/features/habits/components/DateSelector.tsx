import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import {
  getPreviousDateString,
  getNextDateString,
  formatDateDisplay,
  getTodayDateString,
} from '../../../utils/date.ts';

export interface DateSelectorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isLoading?: boolean;
}

export function DateSelector({
  selectedDate,
  onSelectDate,
  isLoading = false,
}: DateSelectorProps) {
  const today = getTodayDateString();
  const isToday = selectedDate === today;

  const handlePrevious = () => {
    try {
      const prev = getPreviousDateString(selectedDate);
      onSelectDate(prev);
    } catch {
      // Ignore if date string is invalid
    }
  };

  const handleNext = () => {
    try {
      const next = getNextDateString(selectedDate);
      onSelectDate(next);
    } catch {
      // Ignore if date string is invalid
    }
  };

  const handleToday = () => {
    onSelectDate(today);
  };

  let formattedTitle = selectedDate;
  try {
    formattedTitle = formatDateDisplay(selectedDate);
  } catch {
    // Fallback to raw string
  }

  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous Day"
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
          <Text style={styles.dateTitle}>{formattedTitle}</Text>
          <Text style={styles.dateSubtitle}>
            {isToday ? 'Today' : selectedDate}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next Day"
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

      {!isToday && (
        <View style={styles.todayRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            disabled={isLoading}
            onPress={handleToday}
            style={({ pressed }) => [
              styles.todayButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.todayButtonText}>Jump to Today</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 28,
  },
  buttonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.96 }],
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  dateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  dateSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  todayRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
});
