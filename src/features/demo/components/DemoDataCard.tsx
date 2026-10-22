/**
 * Demo Data Seeder Card Component for LifeHub.
 * Stage 1: Demo Data Seeder (Slice 8).
 * Accessible, user-triggered action with explicit confirmation and outcome reporting.
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { seedDemoData, type SeedContexts } from '../services/demoSeeder.ts';
import type { SeedResult } from '../types.ts';

export interface DemoDataCardProps {
  contexts: SeedContexts;
  todayDate?: string;
}

export function DemoDataCard({ contexts, todayDate }: DemoDataCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [lastResult, setLastResult] = useState<SeedResult | null>(null);

  const handleRequestSeed = useCallback(() => {
    setLastResult(null);
    setIsConfirming(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsConfirming(false);
  }, []);

  const handleExecuteSeed = useCallback(async () => {
    setIsConfirming(false);
    setIsSeeding(true);
    try {
      const res = await seedDemoData(contexts, { todayDate });
      setLastResult(res);
    } catch (err: any) {
      setLastResult({
        success: false,
        finance: { created: 0, skipped: 0, error: err.message },
        calendar: { created: 0, skipped: 0 },
        habits: { created: 0, skipped: 0 },
      });
    } finally {
      setIsSeeding(false);
    }
  }, [contexts, todayDate]);

  const handleDismissResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.cardIcon}>🧪</Text>
          <View>
            <Text style={styles.cardTitle}>Demo & Testing Data</Text>
            <Text style={styles.cardSubtitle}>Populate realistic sample records</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Quick Start</Text>
        </View>
      </View>

      {/* Description & Inclusions */}
      <Text style={styles.descriptionText}>
        Load realistic student tracker data across all three modules to evaluate LifeHub's full dashboard, budget tracking, and habit streaks.
      </Text>

      <View style={styles.inclusionsList}>
        <View style={styles.inclusionItem}>
          <Text style={styles.inclusionBullet}>💳</Text>
          <Text style={styles.inclusionText}>
            <Text style={styles.bold}>Finance:</Text> Monthly budget (₹45,000), rent commitment (₹18,000), and non-double-counting expenses.
          </Text>
        </View>
        <View style={styles.inclusionItem}>
          <Text style={styles.inclusionBullet}>📅</Text>
          <Text style={styles.inclusionText}>
            <Text style={styles.bold}>Calendar:</Text> 3 scheduled classes/sessions for today and a seminar tomorrow.
          </Text>
        </View>
        <View style={styles.inclusionItem}>
          <Text style={styles.inclusionBullet}>🎯</Text>
          <Text style={styles.inclusionText}>
            <Text style={styles.bold}>Habits:</Text> 4 habits with 5-day streak and today completion progress (75%).
          </Text>
        </View>
      </View>

      <View style={styles.safetyNote}>
        <Text style={styles.safetyNoteText}>
          🛡️ Safe & Idempotent: Existing user data will not be overwritten. Repeated clicks skip duplicates.
        </Text>
      </View>

      {/* Result Outcome Banner */}
      {lastResult && (
        <View
          style={[
            styles.resultBanner,
            lastResult.success ? styles.resultSuccess : styles.resultWarning,
          ]}
          accessibilityRole="alert"
        >
          <View style={styles.resultContent}>
            <Text style={styles.resultTitle}>
              {lastResult.success
                ? lastResult.finance.created + lastResult.calendar.created + lastResult.habits.created > 0
                  ? 'Demo data loaded successfully!'
                  : 'Demo data is already up to date!'
                : 'Demo data loaded with warnings'}
            </Text>
            <Text style={styles.resultDetails}>
              {lastResult.finance.created + lastResult.calendar.created + lastResult.habits.created > 0
                ? `Created: ${lastResult.finance.created} finance items, ${lastResult.calendar.created} events, ${lastResult.habits.created} habits/completions. (${lastResult.finance.skipped + lastResult.calendar.skipped + lastResult.habits.skipped} existing items skipped)`
                : `All demo items already exist (${lastResult.finance.skipped + lastResult.calendar.skipped + lastResult.habits.skipped} items preserved). Zero duplicates created.`}
            </Text>
            {(!lastResult.success || lastResult.finance.error || lastResult.calendar.error || lastResult.habits.error) && (
              <Text style={styles.resultErrorText}>
                {[
                  lastResult.finance.error ? `Finance: ${lastResult.finance.error}` : null,
                  lastResult.calendar.error ? `Calendar: ${lastResult.calendar.error}` : null,
                  lastResult.habits.error ? `Habits: ${lastResult.habits.error}` : null,
                ]
                  .filter(Boolean)
                  .join(' | ')}
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss demo result message"
            onPress={handleDismissResult}
            style={styles.dismissButton}
          >
            <Text style={styles.dismissButtonText}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Confirmation State or Action Buttons */}
      {isConfirming ? (
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmPrompt}>
            Load sample records now? Existing records are preserved.
          </Text>
          <View style={styles.confirmButtonsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel loading demo data"
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm and load demo data"
              onPress={handleExecuteSeed}
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.confirmButtonText}>Yes, Load Demo Data</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Load demo data for Finance, Calendar, and Habits"
          onPress={handleRequestSeed}
          disabled={isSeeding}
          style={({ pressed }) => [
            styles.loadButton,
            isSeeding && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {isSeeding ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.loadButtonText}>Seeding Demo Records...</Text>
            </View>
          ) : (
            <Text style={styles.loadButtonText}>Load Demo Data</Text>
          )}
        </Pressable>
      )}
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    fontSize: 22,
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
  badge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6d28d9',
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  inclusionsList: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  inclusionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inclusionBullet: {
    fontSize: 13,
    marginRight: 8,
    marginTop: 1,
  },
  inclusionText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 17,
  },
  bold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  safetyNote: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  safetyNoteText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  loadButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  confirmContainer: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 10,
    padding: 12,
  },
  confirmPrompt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#581c87',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  resultBanner: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  resultSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  resultWarning: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  resultContent: {
    flex: 1,
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14532d',
    marginBottom: 2,
  },
  resultDetails: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  resultErrorText: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 4,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  dismissButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
});
