// src/components/PaymentModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString, formatDisplayDate } from '../utils/date';
import { boundsForPaymentOnTerm } from '../utils/datePickerBounds';
import { validateStandalonePayment, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import { modalBody } from '../utils/modalLayout';

/**
 * Modal for recording a missed payment for the current membership term.
 */
export default function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  members,
  plans,
  payment = null,
  defaultMemberId = null,
  saving = false,
  error,
  fieldErrors: externalFieldErrors = {},
}) {
  const { t } = useTranslation();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fieldErrors = { ...externalFieldErrors, ...localFieldErrors };
  const fc = (field) => inputClass(FORM_INPUT_CLASS, fieldErrors, field);

  const initDefaults = useCallback(() => {
    if (payment) {
      setSelectedMemberId(String(payment.memberId));
      setAmount(String(payment.amount));
      setMethod(payment.method || 'Cash');
      setDate(payment.date);
    } else {
      const preselect = defaultMemberId ? String(defaultMemberId) : '';
      setSelectedMemberId(preselect);
      setAmount('');
      setMethod('Cash');
      setDate(todayString());
      if (preselect) {
        const selectedMember = members.find((m) => m.id === parseInt(preselect, 10));
        const matchingPlan = selectedMember
          ? plans.find((p) => p.id === selectedMember.planId)
          : null;
        if (matchingPlan) setAmount(matchingPlan.price.toString());
      }
    }
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
  }, [payment, defaultMemberId, members, plans]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: payment?.id ?? `new:${defaultMemberId ?? ''}`,
    initialize: initDefaults,
    saving: saving || submitting,
  });

  if (!isOpen) return null;

  const selectedMember = members.find((m) => m.id === parseInt(selectedMemberId, 10));
  const minPaymentDate =
    selectedMember?.startDate && selectedMember.startDate !== '—'
      ? selectedMember.startDate
      : undefined;
  const paymentBounds = boundsForPaymentOnTerm(minPaymentDate);

  const handleMemberChange = (memberIdValue) => {
    setSelectedMemberId(memberIdValue);
    if (!memberIdValue) return;
    const member = members.find((m) => m.id === parseInt(memberIdValue, 10));
    if (member) {
      const matchingPlan = plans.find((p) => p.id === member.planId);
      if (matchingPlan) setAmount(matchingPlan.price.toString());
      if (member.startDate && member.startDate !== '—' && date < member.startDate) {
        setDate(member.startDate);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const paymentResult = validateStandalonePayment({
      amount,
      date,
      minStartDate: minPaymentDate,
      memberId: selectedMemberId,
    });
    if (!showValidationError(paymentResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    const parsedAmount = parseFloat(amount);
    setValidationError('');
    setSubmitting(true);
    try {
      await onSubmit({
        memberId: parseInt(selectedMemberId, 10),
        amount: parsedAmount,
        date,
        method,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = saving || submitting;
  const displayError = validationError || error;

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md">
      <div className={`${modalBody} relative`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-app-text-strong mb-1 pr-8">
          {payment ? t('modals.payment.editTitle') : t('modals.payment.collectTitle')}
        </h2>
        {!payment && selectedMember && (
          <p className="text-xs text-app-muted mb-5">
            {t('modals.payment.collectSubtitle', { name: selectedMember.name })}
          </p>
        )}
        {payment && (
          <p className="text-xs text-app-muted mb-5">{t('modals.payment.editSubtitle')}</p>
        )}
        {!payment && !selectedMember && <div className="mb-5" />}

        {displayError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-4">
          <div>
            <label htmlFor="payment-member" className="form-label">
              {t('table.member')}
              <RequiredMark />
            </label>
            <select
              id="payment-member"
              required
              disabled={!!payment || !!defaultMemberId}
              className="mt-1 w-full app-field cursor-pointer disabled:bg-app-surface disabled:text-app-muted"
              value={selectedMemberId}
              onChange={(e) => handleMemberChange(e.target.value)}
            >
              <option value="" disabled>{t('modals.payment.selectMember')}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {selectedMember?.startDate && selectedMember.startDate !== '—' && (
            <p className="text-xs text-app-muted -mt-2">
              {t('modals.payment.termStartHint', {
                date: formatDisplayDate(selectedMember.startDate),
              })}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="payment-amount" className="form-label">
                {t('modals.payment.amount')}
                <RequiredMark />
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                  <DollarSign className="h-4 w-4" />
                </span>
                <input
                  id="payment-amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className={inputClass('w-full app-field pl-8 pr-3', fieldErrors, 'amount')}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    clearFieldError(setLocalFieldErrors, 'amount');
                  }}
                />
              </div>
              <FieldError message={fieldErrorMessage(fieldErrors, 'amount')} />
            </div>

            <div>
              <label htmlFor="payment-method" className="form-label">
                {t('modals.payment.method')}
                <RequiredMark />
              </label>
              <select
                id="payment-method"
                className="mt-1 w-full app-field cursor-pointer"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="payment-date" className="form-label">
              {t('modals.payment.date')}
              <RequiredMark />
            </label>
            <DateField
              id="payment-date"
              required
              min={paymentBounds.min}
              max={paymentBounds.max}
              className={fc('date')}
              value={date}
              onChange={(v) => {
                setDate(v);
                clearFieldError(setLocalFieldErrors, 'date');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'date')} />
          </div>

          <div className="pt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isBusy} className="w-full sm:w-auto">
              {isBusy
                ? t('common.processing')
                : payment
                ? t('common.save')
                : t('modals.payment.save')}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
