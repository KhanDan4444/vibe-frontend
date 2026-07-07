// src/components/RenewGymModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString, formatDisplayDate } from '../utils/date';
import {
  boundsForLicenseRenewStart,
  boundsForPaymentOnTerm,
  clampPaymentToTerm,
} from '../utils/datePickerBounds';
import { validateGymRenewPayment, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import { defaultGymRenewStartDate } from '../utils/saasRenew';
import { calculateEndDate } from '../utils/memberDates';
import ResponsiveModal from './ResponsiveModal';
import { modalBody } from '../utils/modalLayout';

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
  const fc = (field) => inputClass(`${FORM_INPUT_CLASS} dark:bg-app-raised dark:text-app-text cursor-pointer`, fieldErrors, field);

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
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const renewResult = validateGymRenewPayment({ planId, startDate, paymentDate, amount });
    if (!showValidationError(renewResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
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
  const today = todayString();
  const endDisplay = gym.saasEndDate || (gym.saas_end_date ? String(gym.saas_end_date).split('T')[0] : null);
  const showEarlyRenewNote = !gym.isUnpaid && endDisplay && endDisplay !== '—';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md">
      <div className={`${modalBody} relative`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-app-text"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-1 pr-8">
          <RefreshCw className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong">{t('modals.renewGym.title')}</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-app-muted mb-6">
          {t('modals.renewGym.subtitle', { name: gymName })}
        </p>

        {showEarlyRenewNote && (
          <div className="ui-alert-amber mb-4">
            {t('modals.billing.paidThroughRenewTerm', { date: formatDisplayDate(endDisplay) })}
          </div>
        )}

        {displayError && (
          <div className="ui-alert-rose mb-4">
            {displayError}
          </div>
        )}

        {saasPlans.length === 0 && (
          <div className="ui-alert-amber mb-4">
            {t('modals.billing.createSaasPlanBeforeRenew')}
          </div>
        )}

        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-4">
          <div>
            <label className="form-label">{t('modals.registerGym.saasPlan')}</label>
            <select
              required
              className={fc('planId')}
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                clearFieldError(setLocalFieldErrors, 'planId');
              }}
            >
              <option value="" disabled>{t('modals.renew.selectPlan')}</option>
              {saasPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${Number(p.price).toFixed(2)} / {p.duration}mo
                </option>
              ))}
            </select>
            <FieldError message={fieldErrorMessage(fieldErrors, 'planId')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('modals.renewGym.licenseStartDate')}</label>
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
              <label className="form-label">{t('modals.renewGym.paymentDate')}</label>
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
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'paymentDate')} />
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
              <label className="form-label">{t('modals.member.amount')}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className={fc('amount')}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'amount');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'amount')} />
            </div>
            <div>
              <label className="form-label">{t('modals.member.method')}</label>
              <select
                className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text cursor-pointer focus:border-indigo-500 focus:outline-none"
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
              className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text focus:border-indigo-500 focus:outline-none"
              placeholder={t('modals.renewGym.referencePlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-200 dark:border-app-border-subtle px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 sm:w-auto"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || saasPlans.length === 0}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
            >
              {saving ? t('common.processing') : t('modals.renewGym.save')}
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
