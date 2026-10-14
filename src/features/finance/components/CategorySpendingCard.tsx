import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import type { CategorySpendingSummary, ExpenseCategory } from '../../../types/finance.ts';
import { isExpenseCategory } from '../constants.ts';
import { formatPaiseToINR } from '../../../utils/currency.ts';
import {
  calculateCategoryProgress,
  formatCategorySpendingStatus,
} from '../utils/categorySpending.ts';

export interface CategorySpendingCardProps {
  categoryBreakdown: CategorySpendingSummary[];
  onConfigureCategoryLimit?: (category?: ExpenseCategory) => void;
}

export function CategorySpendingCard({
  categoryBreakdown,
  onConfigureCategoryLimit,
}: CategorySpendingCardProps) {
  const hasCategories = categoryBreakdown.length > 0;

  return (
    <View style={styles.card} accessibilityRole="summary">
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Category Spending</Text>
          <Text style={styles.headerSubtitle}>
            Monthly breakdown against budget limits
          </Text>
        </View>
        {onConfigureCategoryLimit && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage Category Budget Limits"
            style={({ pressed }) => [
              styles.manageButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onConfigureCategoryLimit()}
          >
            <Text style={styles.manageButtonText}>Manage Limits</Text>
          </Pressable>
        )}
      </View>

      {/* Empty State */}
      {!hasCategories ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No category spending or budget limits recorded for this month.
          </Text>
          {onConfigureCategoryLimit && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set Category Limit"
              style={({ pressed }) => [
                styles.emptyActionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => onConfigureCategoryLimit()}
            >
              <Text style={styles.emptyActionButtonText}>Set Category Limit</Text>
            </Pressable>
          )}
        </View>
      ) : (
        /* Category List */
        <View style={styles.listContainer}>
          {categoryBreakdown.map((item, index) => {
            const progress = calculateCategoryProgress(
              item.actualSpentPaise,
              item.limitPaise
            );
            const statusInfo = formatCategorySpendingStatus(item);
            const isLast = index === categoryBreakdown.length - 1;
            const isKnownExpenseCat = isExpenseCategory(item.category);

            return (
              <Pressable
                key={item.category}
                style={({ pressed }) => [
                  styles.categoryItem,
                  isLast && styles.lastCategoryItem,
                  pressed && onConfigureCategoryLimit && styles.categoryItemPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.category}: ${formatPaiseToINR(
                  item.actualSpentPaise
                )} spent. ${statusInfo.limitText}. ${statusInfo.statusText}.${
                  onConfigureCategoryLimit ? ' Tap to edit limit.' : ''
                }`}
                onPress={
                  onConfigureCategoryLimit && isKnownExpenseCat
                    ? () => onConfigureCategoryLimit(item.category as ExpenseCategory)
                    : undefined
                }
              >
                {/* Row 1: Category Name & Actual Spending */}
                <View style={styles.itemTopRow}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.category}
                  </Text>
                  <Text style={styles.actualSpentText}>
                    {formatPaiseToINR(item.actualSpentPaise)}
                  </Text>
                </View>

                {/* Row 2: Limit & Status Badge / Label */}
                <View style={styles.itemBottomRow}>
                  <Text style={styles.limitText}>
                    {statusInfo.limitText}
                  </Text>

                  {statusInfo.hasLimit ? (
                    <View
                      style={[
                        styles.statusBadge,
                        statusInfo.isOverLimit
                          ? styles.statusBadgeDanger
                          : styles.statusBadgeSuccess,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          statusInfo.isOverLimit
                            ? styles.statusTextDanger
                            : styles.statusTextSuccess,
                        ]}
                      >
                        {statusInfo.statusText}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noLimitText}>No limit set</Text>
                  )}
                </View>

                {/* Row 3: Progress Bar (Only when limit is configured) */}
                {progress !== null && (
                  <View
                    style={styles.progressBarTrack}
                    accessibilityRole="progressbar"
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: progress.clampedPercent,
                    }}
                    accessibilityLabel={`${item.category} budget usage: ${progress.clampedPercent} percent`}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progress.clampedPercent}%` },
                        progress.isOverLimit
                          ? styles.progressFillDanger
                          : progress.clampedPercent >= 80
                          ? styles.progressFillWarning
                          : styles.progressFillSuccess,
                      ]}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
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
    marginBottom: 12,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  manageButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  emptyActionButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  emptyActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  categoryItemPressed: {
    backgroundColor: '#f9fafb',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  emptyContainer: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    marginTop: 2,
  },
  categoryItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastCategoryItem: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flexShrink: 1,
    paddingRight: 8,
  },
  actualSpentText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  limitText: {
    fontSize: 12,
    color: '#6b7280',
    flexShrink: 1,
    paddingRight: 8,
  },
  noLimitText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusBadgeDanger: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#15803d',
  },
  statusTextDanger: {
    color: '#dc2626',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressFillSuccess: {
    backgroundColor: '#16a34a',
  },
  progressFillWarning: {
    backgroundColor: '#f59e0b',
  },
  progressFillDanger: {
    backgroundColor: '#dc2626',
  },
});
