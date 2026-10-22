import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import type { BudgetSummary } from '../../../types/finance.ts';
import { getFinanceSnapshotModel } from '../utils/dashboardHelpers.ts';

export interface FinanceSnapshotCardProps {
  summary: BudgetSummary | null;
  onNavigateToFinance: () => void;
}

export function FinanceSnapshotCard({
  summary,
  onNavigateToFinance,
}: FinanceSnapshotCardProps) {
  const model = getFinanceSnapshotModel(summary);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Finance Snapshot: ${model.monthTitle}. Status: ${model.statusBadgeText}. Remaining: ${model.remainingAmountText}. Tap to open Finance.`}
      onPress={onNavigateToFinance}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.cardIcon}>💳</Text>
          <View>
            <Text style={styles.cardTitle}>Finance Overview</Text>
            <Text style={styles.cardSubtitle}>{model.monthTitle || 'Current Month'}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            model.status === 'within_budget' && styles.statusBadgeWithin,
            model.status === 'over_budget' && styles.statusBadgeOver,
            model.status === 'zero_budget' && styles.statusBadgeZero,
            model.status === 'unconfigured' && styles.statusBadgeUnconfigured,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              model.status === 'within_budget' && styles.statusTextWithin,
              model.status === 'over_budget' && styles.statusTextOver,
              model.status === 'zero_budget' && styles.statusTextZero,
              model.status === 'unconfigured' && styles.statusTextUnconfigured,
            ]}
          >
            {model.statusBadgeText}
          </Text>
        </View>
      </View>

      {/* Main Remaining Amount */}
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amountText,
            model.isOverBudget && styles.amountTextOver,
          ]}
          numberOfLines={1}
        >
          {model.remainingAmountText}
        </Text>
        <Text style={styles.amountLabel}>
          {model.status === 'over_budget' ? 'Budget Deficit' : 'Remaining Usable Budget'}
        </Text>
      </View>

      {/* Breakdown Row */}
      <View style={styles.breakdownRow}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Total Spent</Text>
          <Text style={styles.breakdownValue}>{model.spendingAmountText}</Text>
        </View>

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Configured Budget</Text>
          <Text style={styles.breakdownValue}>{model.plannedAmountText}</Text>
        </View>

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Usable Budget</Text>
          <Text style={styles.breakdownValue}>{model.usableAmountText}</Text>
        </View>
      </View>

      {/* Footer Navigation Link */}
      <View style={styles.footerRow}>
        <Text style={styles.actionText}>Manage Budget & Transactions</Text>
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeWithin: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeOver: {
    backgroundColor: '#fef2f2',
  },
  statusBadgeZero: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeUnconfigured: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextWithin: {
    color: '#15803d',
  },
  statusTextOver: {
    color: '#b91c1c',
  },
  statusTextZero: {
    color: '#b45309',
  },
  statusTextUnconfigured: {
    color: '#64748b',
  },
  amountContainer: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
  },
  amountText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  amountTextOver: {
    color: '#dc2626',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
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
