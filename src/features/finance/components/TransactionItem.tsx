import React from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';
import type { Transaction } from '../../../types/finance.ts';
import { formatPaiseToINR } from '../../../utils/currency.ts';
import { formatDateDisplay } from '../../../utils/date.ts';

export interface TransactionItemProps {
  transaction: Transaction;
  commitmentName?: string | null;
}

export function TransactionItem({
  transaction,
  commitmentName,
}: TransactionItemProps) {
  const isIncome = transaction.type === 'income';

  let dateDisplay = transaction.date;
  try {
    dateDisplay = formatDateDisplay(transaction.date);
  } catch {
    // Fallback to raw string
  }

  const formattedAmount =
    (isIncome ? '+' : '-') + formatPaiseToINR(transaction.amountPaise);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${transaction.description}, ${transaction.category}, ${formattedAmount}, on ${dateDisplay}`}
    >
      <View style={styles.leftColumn}>
        <View style={styles.headerLine}>
          <View
            style={[
              styles.categoryBadge,
              isIncome ? styles.incomeBadge : styles.expenseBadge,
            ]}
          >
            <Text
              style={[
                styles.categoryBadgeText,
                isIncome ? styles.incomeBadgeText : styles.expenseBadgeText,
              ]}
            >
              {transaction.category}
            </Text>
          </View>
          <Text style={styles.dateText}>{dateDisplay}</Text>
        </View>

        <Text style={styles.descriptionText} numberOfLines={2}>
          {transaction.description}
        </Text>

        {transaction.linkedFixedPaymentId && (
          <View style={styles.linkedBadge}>
            <Text style={styles.linkedBadgeText}>
              🔗 {commitmentName ? `Linked: ${commitmentName}` : 'Linked Obligation'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rightColumn}>
        <Text
          style={[
            styles.amountText,
            isIncome ? styles.incomeText : styles.expenseText,
          ]}
        >
          {formattedAmount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  leftColumn: {
    flex: 1,
    paddingRight: 12,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expenseBadge: {
    backgroundColor: '#fef2f2',
  },
  expenseBadgeText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '600',
  },
  incomeBadge: {
    backgroundColor: '#ecfdf5',
  },
  incomeBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 20,
  },
  linkedBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  linkedBadgeText: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '500',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  expenseText: {
    color: '#1f2937',
  },
  incomeText: {
    color: '#16a34a',
  },
});
