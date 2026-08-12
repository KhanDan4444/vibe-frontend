// src/components/RenewModal.jsx
import { useState, useEffect, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString, formatDisplayDate, isDateRangeValid } from '../utils/date';
import {
  boundsForPaymentOnTerm,
  boundsForRenewStart,
  clampPaymentToTerm,
} from '../utils/datePickerBounds';
import { validateRenewPayment, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import { formatMoney } from '../utils/formatMoney';
import { DISPLAY_STATUS } from '../utils/memberStatus';
import { defaultRenewStartDate, canRenewMember } from '../utils/memberRenew';
import { calculateEndDate } from '../utils/memberDates';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import MoneyAmountInput from './ui/MoneyAmountInput';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';


/**
 * Modal to renew an expired or due-soon member and record payment in one step.
 */
export default function RenewModal({
  isOpen,
  onClose,
  onSubmit,
  member,
  plans,
  saving = false,
  error,
  fieldErrors: externalFieldErrors = {},
}) {
  const { t } = useTranslation();
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fieldErrors = { ...externalFieldErrors, ...localFieldErrors };
  const fc = (field) => inputClass(`${FORM_INPUT_CLASS} cursor-pointer`, fieldErrors, field);

  const initDefaults = useCallback(() => {
    if (!member) return;
    const defaultPlanId = member.planId || plans[0]?.id || '';
    setPlanId(String(defaultPlanId));
    setStartDate(defaultRenewStartDate(member));
    setPaymentDate(todayString());
    setMethod('Cash');
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);

    const plan = plans.find((p) => p.id === member.planId) || plans[0];
    setAmount(plan ? String(plan.price) : '');
  }, [member, plans]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: member?.id,
    initialize: initDefaults,
    saving: saving || submitting,
  });

  useEffect(() => {
    if (!planId) return;
    const plan = plans.find((p) => p.id === parseInt(planId, 10));
    if (plan) setAmount(String(plan.price));
  }, [planId, plans]);

  if (!isOpen || !member) return null;

  const selectedPlan = plans.find((p) => p.id === parseInt(planId, 10));
  const renewStartBounds = boundsForRenewStart(member);
  const paymentBounds = boundsForPaymentOnTerm(startDate);
  const paymentRangeValid = isDateRangeValid(paymentBounds.min, paymentBounds.max);
  const today = todayString();
  const minStartIso = defaultRenewStartDate(member);
  const canSetStartToToday = !paymentRangeValid && today >= minStartIso;
  const showEarlyRenewNote =
    canRenewMember(member) && member.status === DISPLAY_STATUS.DUE_SOON;
  const newEndDate = selectedPlan && startDate ? calculateEndDate(startDate, selectedPlan.duration) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const renewResult = validateRenewPayment({ planId, startDate, paymentDate, amount });
    if (!showValidationError(renewResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    if (!paymentRangeValid) {
      setValidationError(
        t('validation.paymentDateFutureStart', { date: formatDisplayDate(startDate) })
      );
      return;
    }
    setValidationError('');
    setSubmitting(true);
    try {
      await onSubmit({
        plan_id: parseInt(planId, 10),
        start_date: startDate,
        amount: parseFloat(amount),
        date: paymentDate,
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
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 shrink-0 text-teal-700" />
            <h2 className={modalTitle}>{t('modals.renew.title')}</h2>
          </div>
          <p className="mt-1 text-sm text-app-muted">
            {t('modals.renew.subtitle', { name: member.name })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text"
          aria-label={t('aria.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="flex min-h-0 flex-1 flex-col">
        <div className={`${modalBody} space-y-4`}>
          {showEarlyRenewNote && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              {t('modals.billing.paidThroughRenewTerm', { date: formatDisplayDate(member.endDate) })}
            </div>
          )}

          {member.isUnpaid && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {t('modals.renew.unpaidWarning')}
            </div>
          )}

          {displayError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {displayError}
            </div>
          )}

          <div>
            <label className="form-label">
              {t('modals.member.plan')}
              <RequiredMark />
            </label>
            <select
              required
              className="ui-select mt-1 w-full app-field cursor-pointer"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="" disabled>{t('modals.renew.selectPlan')}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.price)} / {p.duration}mo
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                {t('modals.renew.startDate')}
                <RequiredMark />
              </label>
              <DateField
                required
                min={renewStartBounds.min}
                className="mt-1 w-full app-field cursor-pointer"
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  setPaymentDate(clampPaymentToTerm(v, paymentDate));
                }}
              />
            </div>
            <div>
              <label className="form-label">
                {t('modals.member.paymentDate')}
                <RequiredMark />
              </label>
              <DateField
                required
                min={paymentBounds.min}
                max={paymentBounds.max}
                className={fc('paymentDate')}
                value={paymentDate}
                onChange={(v) => {
                  setPaymentDate(v);
                  clearFieldError(setLocalFieldErrors, 'paymentDate');
                }}
                rangeInvalidMessage={t('validation.paymentDateFutureStart', {
                  date: formatDisplayDate(startDate),
                })}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'paymentDate')} />
              {canSetStartToToday ? (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(today);
                    setPaymentDate(clampPaymentToTerm(today, paymentDate));
                  }}
                  className="mt-2 text-sm font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
                >
                  {t('modals.renew.useTodayAsStart')}
                </button>
              ) : null}
            </div>
          </div>

          {newEndDate && newEndDate !== '—' && selectedPlan && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-800">
              {t('modals.renew.termPreview', {
                duration: selectedPlan.duration,
                date: formatDisplayDate(newEndDate),
              })}
            </div>
          )}

          {plans.length === 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              Create a membership plan before renewing.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                {t('modals.member.amount')}
                <RequiredMark />
              </label>
              <MoneyAmountInput
                required
                min="0.01"
                fieldErrors={fieldErrors}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'amount');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'amount')} />
            </div>
            <div>
              <label className="form-label">
                {t('modals.member.method')}
                <RequiredMark />
              </label>
              <select
                className="ui-select mt-1 w-full app-field cursor-pointer"
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
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isBusy} className="w-full sm:w-auto">
            {isBusy ? t('common.processing') : t('modals.renew.save')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
