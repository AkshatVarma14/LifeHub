import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import type { BudgetSummary } from '../../../types/finance.ts';
import { formatPaiseToINR } from '../../../utils/currency.ts';

export interface MonthlySummaryCardProps {
  summary: BudgetSummary;
  onConfigureBudget?: () => void;
}

export function MonthlySummaryCard({ summary, onConfigureBudget }: MonthlySummaryCardProps) {
  const hasBudget = summary.hasConfiguredBudget;
  const isOverBudget =
    summary.remainingUsableBudgetPaise !== null && summary.remainingUsableBudgetPaise < 0;

  const plannedBudgetDisplay = hasBudget
    ? formatPaiseToINR(summary.totalPlannedBudgetPaise ?? 0)
    : 'Not configured';

  const isUsableNegative =
    summary.actualUsableBudgetPaise !== null && summary.actualUsableBudgetPaise < 0;

  const usableBudgetDisplay =
    summary.actualUsableBudgetPaise !== null
      ? formatPaiseToINR(summary.actualUsableBudgetPaise)
      : '—';

  const remainingBudgetDisplay =
    summary.remainingUsableBudgetPaise !== null
      ? formatPaiseToINR(summary.remainingUsableBudgetPaise)
      : '—';

  const isNetPositive = summary.netCashflowPaise > 0;
  const isNetZero = summary.netCashflowPaise === 0;
  const netSign = isNetPositive ? '+' : '';
  const netCashflowDisplay = netSign + formatPaiseToINR(summary.netCashflowPaise);

  const incomeSign = summary.totalIncomePaise > 0 ? '+' : '';
  const incomeDisplay = incomeSign + formatPaiseToINR(summary.totalIncomePaise);

  return (
    <View style={styles.card}>
      {/* 1. Header: Primary Budget Status */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerLabel}>Planned Budget</Text>
          <Text style={[styles.headerAmount, !hasBudget && styles.unconfiguredText]}>
            {plannedBudgetDisplay}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.badgeContainer}>
            {hasBudget ? (
              <View style={styles.configuredBadge}>
                <Text style={styles.configuredBadgeText}>Budget Active</Text>
              </View>
            ) : (
              <View style={styles.unconfiguredBadge}>
                <Text style={styles.unconfiguredBadgeText}>No Budget Set</Text>
              </View>
            )}
          </View>
          {onConfigureBudget && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hasBudget ? 'Edit Monthly Budget' : 'Set Monthly Budget'}
              onPress={onConfigureBudget}
              style={({ pressed }) => [
                styles.configureBudgetButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.configureBudgetButtonText}>
                {hasBudget ? 'Edit Budget' : 'Set Budget'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. Core ADR-02 Usable vs Remaining Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Reserved Obligations</Text>
          <Text style={styles.metricValue}>
            {formatPaiseToINR(summary.activeCommitmentsReservedPaise)}
          </Text>
          <Text style={styles.metricHint}>Active fixed commitments</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Usable Budget</Text>
          <Text
            style={[
              styles.metricValue,
              isUsableNegative && styles.dangerText,
            ]}
          >
            {usableBudgetDisplay}
          </Text>
          <Text style={styles.metricHint}>Planned - Reserved</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 3. Actual Spending vs Remaining Discretionary */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total Actual Spent</Text>
          <Text style={styles.metricValue}>
            {formatPaiseToINR(summary.totalActualSpendingPaise)}
          </Text>
          <Text style={styles.metricHint}>All expenses this month</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Remaining Usable</Text>
          <Text
            style={[
              styles.metricValue,
              isOverBudget ? styles.dangerText : styles.successText,
            ]}
          >
            {remainingBudgetDisplay}
          </Text>
          <Text style={styles.metricHint}>
            {isOverBudget ? 'Over budget' : 'Discretionary funds left'}
          </Text>
        </View>
      </View>

      {/* 4. Cashflow Bar: Income & Net Cashflow */}
      <View style={styles.cashflowContainer}>
        <View style={styles.cashflowRow}>
          <Text style={styles.cashflowLabel}>Total Income:</Text>
          <Text style={styles.cashflowIncome}>
            {incomeDisplay}
          </Text>
        </View>
        <View style={styles.cashflowRow}>
          <Text style={styles.cashflowLabel}>Net Cashflow:</Text>
          <Text
            style={[
              styles.cashflowValue,
              isNetPositive
                ? styles.successText
                : isNetZero
                  ? null
                  : styles.dangerText,
            ]}
          >
            {netCashflowDisplay}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleGroup: {
    flex: 1,
    paddingRight: 8,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  headerLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  unconfiguredText: {
    color: '#9ca3af',
    fontSize: 18,
    fontStyle: 'italic',
  },
  badgeContainer: {
    marginTop: 2,
  },
  configuredBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  configuredBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '600',
  },
  unconfiguredBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unconfiguredBadgeText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
  },
  configureBudgetButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  configureBudgetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 10,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 2,
  },
  metricHint: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 10,
  },
  successText: {
    color: '#16a34a',
  },
  dangerText: {
    color: '#dc2626',
  },
  cashflowContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cashflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashflowLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  cashflowIncome: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  cashflowValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
