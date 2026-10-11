import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import type { Transaction, FixedPayment } from '../../../types/finance.ts';
import { formatMonthDisplay } from '../../../utils/date.ts';
import { TransactionItem } from './TransactionItem.tsx';

export interface TransactionListProps {
  transactions: Transaction[];
  commitments?: FixedPayment[];
  selectedMonth: string;
  isLoading?: boolean;
  onEditTransaction?: (tx: Transaction) => void;
  onAddTransaction?: () => void;
}

export function TransactionList({
  transactions,
  commitments = [],
  selectedMonth,
  isLoading = false,
  onEditTransaction,
  onAddTransaction,
}: TransactionListProps) {
  let monthDisplay = selectedMonth;
  try {
    monthDisplay = formatMonthDisplay(selectedMonth);
  } catch {
    // Fallback
  }

  // Pre-index commitments for O(1) lookup
  const commitmentNameMap = new Map<string, string>();
  for (const c of commitments) {
    commitmentNameMap.set(c.id, c.name);
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Text style={styles.countBadge}>0</Text>
          </View>
          {onAddTransaction && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add transaction"
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onAddTransaction}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconText}>💳</Text>
          </View>
          <Text style={styles.emptyTitle}>No transactions in {monthDisplay}</Text>
          <Text style={styles.emptySubtitle}>
            {isLoading
              ? 'Checking for transactions...'
              : 'Income and expense entries logged for this month will appear here.'}
          </Text>
          {onAddTransaction && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add transaction"
              style={({ pressed }) => [
                styles.emptyAddButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onAddTransaction}
            >
              <Text style={styles.emptyAddButtonText}>+ Add Transaction</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <Text style={styles.countBadge}>{transactions.length}</Text>
        </View>
        {onAddTransaction && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onAddTransaction}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.listCard}>
        {transactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            commitmentName={tx.linkedFixedPaymentId ? commitmentNameMap.get(tx.linkedFixedPaymentId) : undefined}
            onPress={onEditTransaction ? () => onEditTransaction(tx) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyAddButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconText: {
    fontSize: 22,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
});
