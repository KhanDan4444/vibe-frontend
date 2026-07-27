// src/components/RenewModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString, formatDisplayDate } from '../utils/date';
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
import { modalBody } from '../utils/modalLayout';

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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const renewResult = validateRenewPayment({ planId, startDate, paymentDate, amount });
    if (!showValidationError(renewResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
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
  const renewStartBounds = boundsForRenewStart(member);
  const paymentBounds = boundsForPaymentOnTerm(startDate);
  const showEarlyRenewNote =
    canRenewMember(member) && member.status === DISPLAY_STATUS.DUE_SOON;
  const newEndDate = selectedPlan && startDate ? calculateEndDate(startDate, selectedPlan.duration) : null;
  const today = todayString();

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md">
      <div className={`${modalBody} relative`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-app-surface/80 hover:text-slate-600 dark:text-app-text"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-1 pr-8">
          <RefreshCw className="h-5 w-5 text-teal-700" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong">{t('modals.renew.title')}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          {t('modals.renew.subtitle', { name: member.name })}
        </p>

        {showEarlyRenewNote && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            {t('modals.billing.paidThroughRenewTerm', { date: formatDisplayDate(member.endDate) })}
          </div>
        )}

        {member.isUnpaid && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {t('modals.renew.unpaidWarning')}
          </div>
        )}

        {displayError && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-4">
          <div>
            <label className="form-label">{t('modals.member.plan')}</label>
            <select
              required
              className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text focus:border-teal-600 focus:outline-none cursor-pointer"
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
              <label className="form-label">{t('modals.renew.startDate')}</label>
              <DateField
                required
                min={renewStartBounds.min}
                className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm focus:border-teal-600 focus:outline-none cursor-pointer"
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  setPaymentDate(clampPaymentToTerm(v, paymentDate));
                }}
              />
            </div>
            <div>
              <label className="form-label">{t('modals.member.paymentDate')}</label>
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
                className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2 text-sm focus:border-teal-600 focus:outline-none cursor-pointer"
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

          <div className="pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isBusy || member.isUnpaid || plans.length === 0} className="w-full sm:w-auto">
              {isBusy ? t('common.processing') : t('modals.renew.save')}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
