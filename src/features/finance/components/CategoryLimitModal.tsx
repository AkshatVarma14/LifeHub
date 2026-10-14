import React, { useState, useEffect, useMemo } from 'react';
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
import type { ExpenseCategory } from '../../../types/finance.ts';
import { EXPENSE_CATEGORIES, isExpenseCategory } from '../constants.ts';
import { useFinance } from '../context/index.ts';
import { parseCategoryLimitsSafely } from '../utils/categoryLimits.ts';
import {
  getInitialCategoryLimitFormData,
  validateCategoryLimitAmount,
} from '../utils/categoryLimitForm.ts';
import { formatPaiseToINR } from '../../../utils/currency.ts';
import { formatMonthDisplay } from '../../../utils/date.ts';

export interface CategoryLimitModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMonth: string;
  initialCategory?: ExpenseCategory | null;
  onRequestOpenBudgetModal?: () => void;
}

export function CategoryLimitModal({
  visible,
  onClose,
  selectedMonth,
  initialCategory,
  onRequestOpenBudgetModal,
}: CategoryLimitModalProps) {
  const { monthlyBudget, setCategoryLimit, clearCategoryLimit } = useFinance();

  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>(() =>
    initialCategory && isExpenseCategory(initialCategory)
      ? initialCategory
      : EXPENSE_CATEGORIES[0]
  );
  const [amount, setAmount] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  const isBusy = isSubmitting || isDeleting;
  const isBudgetConfigured = monthlyBudget !== null;

  // Safely parse current category limits for the target month
  const parsedLimits = useMemo(() => {
    return parseCategoryLimitsSafely(monthlyBudget?.categoryLimitsJson);
  }, [monthlyBudget?.categoryLimitsJson]);

  const currentCategoryLimitPaise = parsedLimits.limits[selectedCategory];
  const hasCurrentLimit = currentCategoryLimitPaise !== undefined;

  // Synchronize state when modal opens or targetMonth / initialCategory changes
  useEffect(() => {
    if (visible) {
      setTargetMonth(selectedMonth);
      const cat =
        initialCategory && isExpenseCategory(initialCategory)
          ? initialCategory
          : EXPENSE_CATEGORIES[0];
      setSelectedCategory(cat);

      const parsed = parseCategoryLimitsSafely(monthlyBudget?.categoryLimitsJson);
      const initialForm = getInitialCategoryLimitFormData(cat, parsed.limits[cat]);
      setAmount(initialForm.amount);

      setFormError(null);
      setIsSubmitting(false);
      setIsDeleting(false);
      setIsConfirmingClear(false);
    }
  }, [visible, selectedMonth, initialCategory, monthlyBudget?.categoryLimitsJson]);

  // When switching selected category inside the modal
  const handleSelectCategory = (cat: ExpenseCategory) => {
    if (isBusy) return;
    setSelectedCategory(cat);
    const initialForm = getInitialCategoryLimitFormData(cat, parsedLimits.limits[cat]);
    setAmount(initialForm.amount);
    setFormError(null);
    setIsConfirmingClear(false);
  };

  const handleSave = async () => {
    if (isBusy) return;

    if (targetMonth !== selectedMonth) {
      setFormError('Target month changed. Please re-open the category limit dialog.');
      return;
    }

    if (!isBudgetConfigured) {
      setFormError(
        'An overall monthly budget is required before configuring category limits. Please configure a monthly budget first.'
      );
      return;
    }

    const validation = validateCategoryLimitAmount(amount);
    if (!validation.isValid || validation.paise === undefined) {
      setFormError(validation.error ?? 'Invalid limit amount');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await setCategoryLimit(targetMonth, selectedCategory, validation.paise);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(`Save failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (isBusy || !hasCurrentLimit) return;

    if (targetMonth !== selectedMonth) {
      setFormError('Target month changed. Please re-open the category limit dialog.');
      return;
    }

    setIsDeleting(true);
    setFormError(null);

    try {
      await clearCategoryLimit(targetMonth, selectedCategory);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(`Clear failed: ${message}`);
      setIsConfirmingClear(false);
    } finally {
      setIsDeleting(false);
    }
  };

  let formattedMonthName = targetMonth;
  try {
    formattedMonthName = formatMonthDisplay(targetMonth);
  } catch {
    formattedMonthName = targetMonth;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={isBusy ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Category Budget Limit</Text>
              <Text style={styles.headerSubtitle}>Target Month: {formattedMonthName}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close category limit form"
              disabled={isBusy}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
                isBusy && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Unconfigured Monthly Budget Notice */}
          {!isBudgetConfigured && (
            <View style={styles.unconfiguredBanner} accessibilityRole="alert">
              <Text style={styles.unconfiguredTitle}>Monthly Budget Required</Text>
              <Text style={styles.unconfiguredText}>
                An overall monthly budget must be configured before setting individual category
                limits.
              </Text>
              {onRequestOpenBudgetModal && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Configure Monthly Budget"
                  style={({ pressed }) => [
                    styles.openBudgetButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    onClose();
                    onRequestOpenBudgetModal();
                  }}
                >
                  <Text style={styles.openBudgetButtonText}>Configure Monthly Budget</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Error Banner */}
          {formError && (
            <View
              style={styles.errorBanner}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Category Selector Pills */}
            <Text style={styles.fieldLabel}>Select Expense Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryPillsContainer}
            >
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = cat === selectedCategory;
                const catLimit = parsedLimits.limits[cat];
                const catHasLimit = catLimit !== undefined;

                return (
                  <Pressable
                    key={cat}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat}${catHasLimit ? ' (has limit)' : ''}`}
                    disabled={isBusy}
                    onPress={() => handleSelectCategory(cat)}
                    style={({ pressed }) => [
                      styles.categoryPill,
                      isSelected && styles.categoryPillSelected,
                      pressed && styles.buttonPressed,
                      isBusy && styles.buttonDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                    {catHasLimit && (
                      <View
                        style={[
                          styles.hasLimitDot,
                          isSelected && styles.hasLimitDotSelected,
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Current Limit Status Box */}
            <View style={styles.statusBox}>
              <Text style={styles.statusBoxLabel}>
                Status for {selectedCategory}:
              </Text>
              <Text style={styles.statusBoxValue}>
                {hasCurrentLimit
                  ? `Configured Limit: ${formatPaiseToINR(currentCategoryLimitPaise)}`
                  : 'No limit currently set'}
              </Text>
            </View>

            {/* Amount Field */}
            <Text style={styles.fieldLabel}>Category Limit (₹)</Text>
            <TextInput
              style={[
                styles.textInput,
                !isBudgetConfigured && styles.textInputDisabled,
              ]}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              editable={!isBusy && isBudgetConfigured}
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                setFormError(null);
              }}
            />
            <Text style={styles.fieldHint}>
              ₹0.00 is a valid limit (flags all spending in this category as over budget). To
              remove tracking against a limit, use Clear Limit below.
            </Text>

            {/* Clear Limit Section */}
            {hasCurrentLimit && isBudgetConfigured && (
              <View style={styles.clearSection}>
                {!isConfirmingClear ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Clear limit for ${selectedCategory}`}
                    disabled={isBusy}
                    onPress={() => {
                      setIsConfirmingClear(true);
                      setFormError(null);
                    }}
                    style={({ pressed }) => [
                      styles.clearButton,
                      pressed && styles.buttonPressed,
                      isBusy && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={styles.clearButtonText}>Clear Limit</Text>
                  </Pressable>
                ) : (
                  <View
                    style={styles.clearConfirmContainer}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    <Text style={styles.clearConfirmWarning}>
                      Clear limit for {selectedCategory}? Spending in this category will no
                      longer be tracked against a limit.
                    </Text>
                    <View style={styles.clearConfirmRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Keep Limit"
                        disabled={isBusy}
                        onPress={() => setIsConfirmingClear(false)}
                        style={({ pressed }) => [
                          styles.keepButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.keepButtonText}>Keep Limit</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Confirm Clear Limit"
                        disabled={isBusy}
                        onPress={handleClear}
                        style={({ pressed }) => [
                          styles.confirmClearButton,
                          pressed && styles.buttonPressed,
                          isDeleting && styles.buttonDisabled,
                        ]}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.confirmClearButtonText}>Confirm Clear</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel category limit configuration"
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

            {isBudgetConfigured && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save category limit"
                disabled={isBusy}
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.buttonPressed,
                  isBusy && styles.buttonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Limit</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '600',
  },
  unconfiguredBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  unconfiguredTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  unconfiguredText: {
    fontSize: 12,
    color: '#1d4ed8',
    marginTop: 2,
    lineHeight: 16,
  },
  openBudgetButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  openBudgetButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
  formScroll: {
    maxHeight: 380,
  },
  formContent: {
    paddingBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  categoryScroll: {
    marginBottom: 14,
  },
  categoryPillsContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPillSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  categoryPillTextSelected: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  hasLimitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  hasLimitDotSelected: {
    backgroundColor: '#2563eb',
  },
  statusBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  statusBoxLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBoxValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textInputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  fieldHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 15,
  },
  clearSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  clearButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  clearButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  clearConfirmContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
  },
  clearConfirmWarning: {
    fontSize: 13,
    color: '#991b1b',
    marginBottom: 10,
    lineHeight: 18,
  },
  clearConfirmRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keepButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  keepButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  confirmClearButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmClearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
