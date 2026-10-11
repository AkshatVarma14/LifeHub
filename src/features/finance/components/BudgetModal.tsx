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
import { useFinance } from '../context/index.ts';
import {
  type BudgetFormData,
  getInitialBudgetFormData,
  validateAndMapBudgetForm,
} from '../utils/budgetForm.ts';
import { formatMonthDisplay } from '../../../utils/date.ts';

export interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMonth: string;
}

export function BudgetModal({
  visible,
  onClose,
  selectedMonth,
}: BudgetModalProps) {
  const { monthlyBudget, setBudget, deleteBudget } = useFinance();

  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);
  const [formData, setFormData] = useState<BudgetFormData>(() =>
    getInitialBudgetFormData(monthlyBudget)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  const isBusy = isSubmitting || isDeleting;
  const isConfigured = monthlyBudget !== null;

  // Re-synchronize state whenever modal opens or monthlyBudget / selectedMonth changes
  useEffect(() => {
    if (visible) {
      setTargetMonth(selectedMonth);
      setFormData(getInitialBudgetFormData(monthlyBudget));
      setFormError(null);
      setIsSubmitting(false);
      setIsDeleting(false);
      setIsConfirmingClear(false);
    }
  }, [visible, monthlyBudget, selectedMonth]);

  const handleSave = async () => {
    if (isBusy) return;

    // Safety guard: ensure active target month matches current selected month
    if (targetMonth !== selectedMonth) {
      setFormError('Target month changed. Please re-open the budget dialog.');
      return;
    }

    const validation = validateAndMapBudgetForm(
      formData,
      targetMonth,
      monthlyBudget?.categoryLimitsJson
    );

    if (!validation.isValid || !validation.sanitized) {
      setFormError(validation.errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await setBudget(validation.sanitized);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(`Save failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (isBusy || !isConfigured) return;

    // Safety guard: ensure active target month matches current selected month
    if (targetMonth !== selectedMonth) {
      setFormError('Target month changed. Please re-open the budget dialog.');
      return;
    }

    setIsDeleting(true);
    setFormError(null);

    try {
      await deleteBudget(targetMonth);
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
              <Text style={styles.headerTitle}>
                {isConfigured ? 'Edit Monthly Budget' : 'Configure Monthly Budget'}
              </Text>
              <Text style={styles.headerSubtitle}>Target Month: {formattedMonthName}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close budget form"
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
            {/* Amount Field */}
            <Text style={styles.fieldLabel}>Total Planned Budget (₹)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              editable={!isBusy}
              value={formData.amount}
              onChangeText={(text) => {
                setFormData({ amount: text });
                setFormError(null);
              }}
            />
            <Text style={styles.fieldHint}>
              ₹0 is a valid budget (representing ₹0 planned discretionary spending). To leave this
              month unconfigured, use Clear Budget below.
            </Text>

            {/* Clear Budget Section (Only when editing an already configured budget) */}
            {isConfigured && (
              <View style={styles.clearSection}>
                {!isConfirmingClear ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear Monthly Budget"
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
                    <Text style={styles.clearButtonText}>Clear Budget</Text>
                  </Pressable>
                ) : (
                  <View
                    style={styles.clearConfirmContainer}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    <Text style={styles.clearConfirmWarning}>
                      Clear budget for this month? The month will return to an unconfigured state.
                    </Text>
                    <View style={styles.clearConfirmRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Keep Budget"
                        disabled={isBusy}
                        onPress={() => setIsConfirmingClear(false)}
                        style={({ pressed }) => [
                          styles.keepButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.keepButtonText}>Keep Budget</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Confirm Clear Budget"
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
              accessibilityLabel="Save Budget"
              disabled={isBusy || isConfirmingClear}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.buttonPressed,
                (isBusy || isConfirmingClear) && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Budget</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    lineHeight: 18,
  },
  formScroll: {
    maxHeight: 320,
  },
  formContent: {
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 16,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#111827',
  },
  clearSection: {
    marginTop: 20,
    marginBottom: 4,
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  clearConfirmContainer: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  clearConfirmWarning: {
    fontSize: 13,
    color: '#991b1b',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  clearConfirmRow: {
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
  confirmClearButton: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmClearButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
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
});
