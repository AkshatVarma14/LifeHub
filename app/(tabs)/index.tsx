import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import type { Transaction, ExpenseCategory } from '@/src/types/finance';
import { useFinance } from '@/src/features/finance/context';
import {
  MonthSelector,
  MonthlySummaryCard,
  CategorySpendingCard,
  TransactionList,
  TransactionFormModal,
  BudgetModal,
  CategoryLimitModal,
} from '@/src/features/finance/components';

export default function FinanceScreen() {
  const {
    selectedMonth,
    setSelectedMonth,
    summary,
    transactions,
    commitments,
    isLoading,
    error,
    refresh,
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedCategoryForLimit, setSelectedCategoryForLimit] = useState<ExpenseCategory | null>(null);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleOpenAdd = useCallback(() => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleOpenBudgetModal = useCallback(() => {
    setIsBudgetModalOpen(true);
  }, []);

  const handleCloseBudgetModal = useCallback(() => {
    setIsBudgetModalOpen(false);
  }, []);

  const handleOpenCategoryLimitModal = useCallback((category?: ExpenseCategory) => {
    setSelectedCategoryForLimit(category ?? null);
    setIsCategoryModalOpen(true);
  }, []);

  const handleCloseCategoryLimitModal = useCallback(() => {
    setIsCategoryModalOpen(false);
    setSelectedCategoryForLimit(null);
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      {/* 1. Month Navigation Stepper */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        isLoading={isLoading}
      />

      {/* 2. Error Banner */}
      {error && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <View style={styles.errorTextContainer}>
            <Text style={styles.errorTitle}>Error loading finance data</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading data"
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

      {/* 3. Initial Loading Indicator if no cached data */}
      {isLoading && transactions.length === 0 && !error && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Updating month data...</Text>
        </View>
      )}

      {/* 4. Monthly Finance Summary Card */}
      <MonthlySummaryCard
        summary={summary}
        onConfigureBudget={handleOpenBudgetModal}
      />

      {/* 5. Category Spending Breakdown */}
      <CategorySpendingCard
        categoryBreakdown={summary.categoryBreakdown}
        onConfigureCategoryLimit={handleOpenCategoryLimitModal}
      />

      {/* 6. Transactions Feed for Selected Month */}
      <TransactionList
        transactions={transactions}
        commitments={commitments}
        selectedMonth={selectedMonth}
        isLoading={isLoading}
        onAddTransaction={handleOpenAdd}
        onEditTransaction={handleOpenEdit}
      />

      {/* 7. Transaction Form Modal (Create / Edit) */}
      <TransactionFormModal
        visible={isModalOpen}
        onClose={handleCloseModal}
        editingTransaction={editingTransaction}
        selectedMonth={selectedMonth}
      />

      {/* 8. Budget Configuration Modal */}
      <BudgetModal
        visible={isBudgetModalOpen}
        onClose={handleCloseBudgetModal}
        selectedMonth={selectedMonth}
      />

      {/* 9. Category Budget Limit Configuration Modal */}
      <CategoryLimitModal
        visible={isCategoryModalOpen}
        onClose={handleCloseCategoryLimitModal}
        selectedMonth={selectedMonth}
        initialCategory={selectedCategoryForLimit}
        onRequestOpenBudgetModal={handleOpenBudgetModal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorTextContainer: {
    flex: 1,
    paddingRight: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
