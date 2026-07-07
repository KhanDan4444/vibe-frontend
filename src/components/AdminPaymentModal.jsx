// src/components/AdminPaymentModal.jsx — collect or edit SaaS payment
import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, Calendar, DollarSign, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString, toDateString, formatDisplayDate } from '../utils/date';
import { boundsForPaymentOnTerm } from '../utils/datePickerBounds';
import { validateStandalonePayment, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors } from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import ResponsiveModal from './ResponsiveModal';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';

export default function AdminPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  gym,
  payment = null,
  saasPlans = [],
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [method, setMethod] = useState('Bank Transfer');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fieldErrors = localFieldErrors;
  const inputBase = 'w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised py-2.5 text-sm text-slate-700 dark:text-app-text focus:border-indigo-500 focus:outline-none';
  const fc = (field, extra = '') => inputClass(`${inputBase} ${extra}`, fieldErrors, field);

  const isEdit = !!payment;
  const displayGym = gym || (payment ? { id: payment.gymId, name: payment.gymName } : null);
  const termStart =
    gym?.saasStartDate ||
    payment?.termStart ||
    (gym?.saas_subscription?.start_date
      ? String(gym.saas_subscription.start_date).split('T')[0]
      : null) ||
    (gym?.saas_start_date ? String(gym.saas_start_date).split('T')[0] : null);
  const paymentBounds = boundsForPaymentOnTerm(termStart);
  const today = todayString();
  const planId = gym?.saas_subscription?.saas_plan_id || gym?.saas_plan_id;

  const initDefaults = useCallback(() => {
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);

    if (payment) {
      setAmount(String(payment.amount));
      setDate(payment.date ? toDateString(payment.date) : todayString());
      setMethod(payment.method || 'Bank Transfer');
      setNotes(payment.notes || '');
      return;
    }

    if (!gym) return;
    setDate(todayString());
    setMethod('Bank Transfer');
    setNotes('');

    const gymPlanId = gym.saas_subscription?.saas_plan_id || gym.saas_plan_id;
    const plan = saasPlans.find((p) => p.id === gymPlanId);
    setAmount(plan ? String(plan.price) : '');
  }, [gym, payment, saasPlans]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: payment?.id ?? gym?.id,
    initialize: initDefaults,
    saving: saving || submitting,
  });

  if (!isOpen || (!gym && !payment)) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const paymentResult = validateStandalonePayment({
      amount,
      date,
      minStartDate: termStart,
      afterStartKey: 'validation.paymentDateAfterLicenseStartOrInvalid',
    });
    if (!showValidationError(paymentResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    const parsed = parseFloat(amount);
    setValidationError('');
    setSubmitting(true);
    try {
      if (isEdit) {
        await onSubmit({
          amount: parsed,
          date,
          method,
          notes: notes.trim() || null,
        });
      } else {
        await onSubmit({
          gym_id: gym.id,
          saas_plan_id: planId || null,
          amount: parsed,
          date,
          method,
          notes: notes.trim() || null,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = saving || submitting;
  const displayError = (validationError || error) && !Object.keys(fieldErrors).length ? (validationError || error) : '';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0 pr-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong">
            {isEdit ? t('modals.adminPayment.editTitle') : t('modals.adminPayment.collectTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-app-muted">
            {isEdit ? t('modals.adminPayment.editSubtitle') : t('modals.adminPayment.collectSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-app-surface/60 dark:text-app-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} onChangeCapture={markTouched} className={`${modalBody} flex-1 space-y-5`}>
          {displayError && (
            <div className="ui-alert-rose">
              {displayError}
            </div>
          )}

          {displayGym && (
            <div className="ui-info-panel flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400 dark:text-app-muted" />
              <span className="font-semibold">{displayGym.name}</span>
            </div>
          )}

          {termStart && (
            <p className="text-xs text-slate-500 dark:text-app-muted -mt-3">
              {t('modals.adminPayment.licenseTermStarted', { date: formatDisplayDate(termStart) })}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('modals.payment.amount')}</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className={fc('amount', 'pl-10 pr-4')}
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
              <label className="form-label">{t('modals.payment.date')}</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-2.5 z-10 h-5 w-5 text-slate-400" />
                <DateField
                  required
                  min={paymentBounds.min}
                  max={paymentBounds.max}
                  className={fc('date', 'pl-10 pr-4')}
                  value={date}
                  onChange={(v) => {
                    setDate(v);
                    clearFieldError(setLocalFieldErrors, 'date');
                  }}
                />
              </div>
              <FieldError message={fieldErrorMessage(fieldErrors, 'date')} />
            </div>
          </div>

          <div>
            <label className="form-label">{t('modals.payment.method')}</label>
            <select
              className="w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised py-2.5 px-4 text-sm text-slate-700 dark:text-app-text focus:border-indigo-500 focus:outline-none cursor-pointer"
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

          <div>
            <label className="form-label">{t('common.notesOptional')}</label>
            <textarea
              rows="2"
              className="w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised py-2.5 px-4 text-sm text-slate-700 dark:text-app-text focus:border-indigo-500 focus:outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

        <div className={modalFooter}>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 sm:w-auto"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
          >
            {isBusy ? t('common.processing') : isEdit ? t('common.save') : t('modals.adminPayment.save')}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
