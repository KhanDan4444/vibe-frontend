// src/components/RenewGymModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString, formatDisplayDate, isDateRangeValid } from '../utils/date';
import {
  boundsForLicenseRenewStart,
  boundsForPaymentOnTerm,
  clampPaymentToTerm,
} from '../utils/datePickerBounds';
import { validateGymRenewPayment, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import { formatMoney } from '../utils/formatMoney';
import { defaultGymRenewStartDate } from '../utils/saasRenew';
import { calculateEndDate } from '../utils/memberDates';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import MoneyAmountInput from './ui/MoneyAmountInput';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';


export default function RenewGymModal({
  isOpen,
  onClose,
  onSubmit,
  gym,
  saasPlans,
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(`${FORM_INPUT_CLASS} cursor-pointer`, fieldErrors, field);

  const initDefaults = useCallback(() => {
    if (!gym) return;
    const defaultPlanId =
      gym.saas_plan_id ||
      gym.saas_subscription?.saas_plan_id ||
      saasPlans[0]?.id ||
      '';
    setPlanId(String(defaultPlanId));
    setStartDate(defaultGymRenewStartDate(gym));
    setPaymentDate(todayString());
    setMethod('Bank Transfer');
    setNotes('');
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);

    const plan =
      saasPlans.find((p) => p.id === parseInt(defaultPlanId, 10)) || saasPlans[0];
    setAmount(plan ? String(plan.price) : '');
  }, [gym, saasPlans]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: gym?.id,
    initialize: initDefaults,
    saving,
  });

  useEffect(() => {
    if (!planId) return;
    const plan = saasPlans.find((p) => p.id === parseInt(planId, 10));
    if (plan) setAmount(String(plan.price));
  }, [planId, saasPlans]);

  if (!isOpen || !gym) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const renewResult = validateGymRenewPayment({ planId, startDate, paymentDate, amount });
    if (!showValidationError(renewResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    const bounds = boundsForPaymentOnTerm(startDate);
    if (!isDateRangeValid(bounds.min, bounds.max)) {
      setValidationError(
        t('validation.paymentDateFutureStart', { date: formatDisplayDate(startDate) })
      );
      return;
    }
    setValidationError('');
    const parsedAmount = parseFloat(amount);
    onSubmit({
      saas_plan_id: parseInt(planId, 10),
      start_date: startDate,
      amount: parsedAmount,
      date: paymentDate,
      method,
      notes: notes.trim() || undefined,
    });
  };

  const displayError = (validationError || error) && !Object.keys(fieldErrors).length ? (validationError || error) : '';
  const gymName = gym.name || gym.gym_name;
  const minStartDate = defaultGymRenewStartDate(gym);
  const selectedPlan = saasPlans.find((p) => p.id === parseInt(planId, 10));
  const newEndDate = selectedPlan && startDate ? calculateEndDate(startDate, selectedPlan.duration) : null;
  const renewStartBounds = boundsForLicenseRenewStart(minStartDate);
  const paymentBounds = boundsForPaymentOnTerm(startDate);
  const paymentRangeValid = isDateRangeValid(paymentBounds.min, paymentBounds.max);
  const today = todayString();
  const canSetStartToToday = !paymentRangeValid && today >= minStartDate;
  const endDisplay = gym.saasEndDate || (gym.saas_end_date ? String(gym.saas_end_date).split('T')[0] : null);
  const showEarlyRenewNote = !gym.isUnpaid && endDisplay && endDisplay !== '—';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 shrink-0 text-teal-700" />
            <h2 className={modalTitle}>{t('modals.renewGym.title')}</h2>
          </div>
          <p className="mt-1 text-sm text-app-muted">
            {t('modals.renewGym.subtitle', { name: gymName })}
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
            <div className="ui-alert-amber">
              {t('modals.billing.paidThroughRenewTerm', { date: formatDisplayDate(endDisplay) })}
            </div>
          )}

          {gym.isUnpaid && (
            <div className="ui-alert-rose">
              {t('modals.renewGym.unpaidWarning')}
            </div>
          )}

          {displayError && (
            <div className="ui-alert-rose">
              {displayError}
            </div>
          )}

          {saasPlans.length === 0 && (
            <div className="ui-alert-amber">
              {t('modals.billing.createSaasPlanBeforeRenew')}
            </div>
          )}

          <div>
            <label className="form-label">
              {t('modals.registerGym.saasPlan')}
              <RequiredMark />
            </label>
            <select
              required
              className={`ui-select ${fc('planId')}`}
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                clearFieldError(setLocalFieldErrors, 'planId');
              }}
            >
              <option value="" disabled>{t('modals.renew.selectPlan')}</option>
              {saasPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.price)} / {p.duration}mo
                </option>
              ))}
            </select>
            <FieldError message={fieldErrorMessage(fieldErrors, 'planId')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
              {t('modals.renewGym.licenseStartDate')}
              <RequiredMark />
            </label>
              <DateField
                required
                min={renewStartBounds.min}
                className={fc('startDate')}
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  setPaymentDate(clampPaymentToTerm(v, paymentDate));
                  clearFieldError(setLocalFieldErrors, 'startDate');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'startDate')} />
            </div>
            <div>
              <label className="form-label">
              {t('modals.renewGym.paymentDate')}
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

          {newEndDate && newEndDate !== '—' && (
            <div className="ui-alert-emerald">
              {t('modals.renewGym.termPreview', {
                duration: selectedPlan?.duration,
                date: formatDisplayDate(newEndDate),
              })}
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

          <div>
            <label className="form-label">{t('common.notesOptional')}</label>
            <input
              type="text"
              className="mt-1 w-full app-field"
              placeholder={t('modals.renewGym.referencePlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? t('common.processing') : t('modals.renewGym.save')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
