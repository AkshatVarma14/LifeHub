import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type {
  Transaction,
  TransactionType,
  ExpenseCategory,
  IncomeCategory,
} from '../../../types/finance.ts';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../constants.ts';
import { useFinance } from '../context/index.ts';
import {
  type TransactionFormData,
  getInitialTransactionFormData,
  validateAndMapTransactionForm,
} from '../utils/transactionForm.ts';
import { getTodayDateString } from '../../../utils/date.ts';

export interface TransactionFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  selectedMonth?: string;
}

export function TransactionFormModal({
  visible,
  onClose,
  editingTransaction = null,
  selectedMonth,
}: TransactionFormModalProps) {
  const { addTransaction, updateTransaction, deleteTransaction } = useFinance();

  const [formData, setFormData] = useState<TransactionFormData>(() =>
    getInitialTransactionFormData(editingTransaction, selectedMonth)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const isBusy = isSubmitting || isDeleting;

  // Re-initialize form data whenever modal opens or editing target changes
  useEffect(() => {
    if (visible) {
      setFormData(getInitialTransactionFormData(editingTransaction, selectedMonth));
      setFormError(null);
      setIsSubmitting(false);
      setIsConfirmingDelete(false);
      setIsDeleting(false);
    }
  }, [visible, editingTransaction, selectedMonth]);

  const handleTypeChange = (newType: TransactionType) => {
    if (newType === formData.type) return;
    const defaultCat =
      newType === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0];
    setFormData((prev) => ({
      ...prev,
      type: newType,
      category: defaultCat,
      linkedFixedPaymentId: newType === 'income' ? null : prev.linkedFixedPaymentId,
    }));
    setFormError(null);
  };

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
    setFormError(null);
  };

  const handleSetToday = () => {
    setFormData((prev) => ({ ...prev, date: getTodayDateString() }));
    setFormError(null);
  };

  const handleSave = async () => {
    if (isBusy) return;

    // Validate inputs using pure form validator
    const validation = validateAndMapTransactionForm(formData);
    if (!validation.isValid || !validation.sanitized) {
      setFormError(validation.errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, validation.sanitized);
      } else {
        await addTransaction(validation.sanitized);
      }
      onClose();
    } catch (err) {
      // Preserve form values on error and surface message to user
      const message = err instanceof Error ? err.message : String(err);
      setFormError(`Save failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isBusy || !editingTransaction) return;

    setIsDeleting(true);
    setFormError(null);

    try {
      await deleteTransaction(editingTransaction.id);
      onClose();
    } catch (err) {
      // Keep modal open, preserve form data, and surface accessible error
      const message = err instanceof Error ? err.message : String(err);
      setFormError(`Delete failed: ${message}`);
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditing = editingTransaction !== null;
  const categoriesToDisplay =
    formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Transaction' : 'New Transaction'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close form"
              disabled={isBusy}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Message */}
            {formError && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            {/* 1. Transaction Type Toggle */}
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeToggleContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Expense type"
                disabled={isBusy}
                style={[
                  styles.typeButton,
                  formData.type === 'expense' && styles.expenseActiveButton,
                ]}
                onPress={() => handleTypeChange('expense')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'expense' && styles.activeTypeText,
                  ]}
                >
                  Expense
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Income type"
                disabled={isBusy}
                style={[
                  styles.typeButton,
                  formData.type === 'income' && styles.incomeActiveButton,
                ]}
                onPress={() => handleTypeChange('income')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'income' && styles.activeTypeText,
                  ]}
                >
                  Income
                </Text>
              </Pressable>
            </View>

            {/* 2. Amount Input */}
            <Text style={styles.fieldLabel}>Amount (₹)</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                accessibilityLabel="Amount in rupees"
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                editable={!isBusy}
                value={formData.amount}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, amount: text }));
                  setFormError(null);
                }}
              />
            </View>

            {/* 3. Category Selector */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryWrap}>
              {categoriesToDisplay.map((cat) => {
                const isSelected = formData.category === cat;
                return (
                  <Pressable
                    key={cat}
                    accessibilityRole="button"
                    accessibilityLabel={`Category ${cat}`}
                    disabled={isBusy}
                    style={[
                      styles.categoryChip,
                      isSelected &&
                        (formData.type === 'expense'
                          ? styles.expenseChipActive
                          : styles.incomeChipActive),
                    ]}
                    onPress={() => handleCategoryChange(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.chipActiveText,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 4. Date Input */}
            <View style={styles.labelWithAction}>
              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set date to today"
                disabled={isBusy}
                onPress={handleSetToday}
                style={({ pressed }) => [
                  styles.todayChip,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.todayChipText}>Today</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Transaction date"
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              editable={!isBusy}
              value={formData.date}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, date: text }));
                setFormError(null);
              }}
            />

            {/* 5. Description Input */}
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              accessibilityLabel="Transaction description"
              style={styles.textInput}
              placeholder={`e.g. Lunch (defaults to '${formData.category}')`}
              placeholderTextColor="#9ca3af"
              maxLength={255}
              editable={!isBusy}
              value={formData.description}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, description: text }));
                setFormError(null);
              }}
            />

            {/* 6. Destructive Delete Section (Only when editing) */}
            {isEditing && (
              <View style={styles.deleteSection}>
                {!isConfirmingDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete Transaction"
                    disabled={isBusy}
                    onPress={() => {
                      setIsConfirmingDelete(true);
                      setFormError(null);
                    }}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.buttonPressed,
                      isBusy && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={styles.deleteButtonText}>Delete Transaction</Text>
                  </Pressable>
                ) : (
                  <View
                    style={styles.deleteConfirmContainer}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    <Text style={styles.deleteConfirmWarning}>
                      Delete this transaction? This action cannot be undone.
                    </Text>
                    <View style={styles.deleteConfirmRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Keep Transaction"
                        disabled={isBusy}
                        onPress={() => setIsConfirmingDelete(false)}
                        style={({ pressed }) => [
                          styles.keepButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.keepButtonText}>Keep Transaction</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Confirm Delete"
                        disabled={isBusy}
                        onPress={handleDelete}
                        style={({ pressed }) => [
                          styles.confirmDeleteButton,
                          pressed && styles.buttonPressed,
                          isDeleting && styles.buttonDisabled,
                        ]}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.confirmDeleteButtonText}>Confirm Delete</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              disabled={isBusy}
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Save Changes' : 'Save Transaction'}
              disabled={isBusy || isConfirmingDelete}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.buttonPressed,
                (isBusy || isConfirmingDelete) && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Save Changes' : 'Save'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '700',
  },
  scrollArea: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 12,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
    marginBottom: 6,
  },
  labelWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    marginTop: 6,
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  expenseActiveButton: {
    backgroundColor: '#ef4444',
  },
  incomeActiveButton: {
    backgroundColor: '#10b981',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTypeText: {
    color: '#ffffff',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  expenseChipActive: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  incomeChipActive: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  chipActiveText: {
    fontWeight: '700',
    color: '#111827',
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
  },
  saveButton: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteConfirmContainer: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  deleteConfirmWarning: {
    fontSize: 13,
    color: '#991b1b',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keepButton: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  confirmDeleteButton: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
