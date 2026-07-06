// src/components/ChangeSaasPlanModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString, formatDisplayDate } from '../utils/date';
import { validateChangePlanPayment, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import { suggestChangeSaasPlanAmount, previewSaasLicenseEnd } from '../utils/saasRenew';
import ResponsiveModal from './ResponsiveModal';
import { modalBody } from '../utils/modalLayout';

/** Switch an active, paid gym to a different SaaS plan mid-term. */
export default function ChangeSaasPlanModal({
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
  const [amountEdited, setAmountEdited] = useState(false);
  const [customTermStart, setCustomTermStart] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentPlanId = gym?.saas_plan_id;
  const otherPlans = saasPlans.filter((p) => p.id !== currentPlanId);
  const currentPlan = saasPlans.find((p) => p.id === currentPlanId);
  const selectedPlan = saasPlans.find((p) => p.id === parseInt(planId, 10));
  const licenseStart = gym?.saasStartDate;

  const upgradeHint = useMemo(
    () => suggestChangeSaasPlanAmount(gym, currentPlan, selectedPlan, { customTermStart, startDate }),
    [gym, currentPlan, selectedPlan, customTermStart, startDate]
  );

  const effectiveStartDate = customTermStart ? startDate : licenseStart;
  const newEndDate = previewSaasLicenseEnd({
    gym,
    currentPlan,
    selectedPlan,
    customTermStart,
    startDate,
  });
  const today = todayString();

  const initDefaults = useCallback(() => {
    if (!gym) return;
    const current = saasPlans.find((p) => p.id === currentPlanId);
    const options = saasPlans.filter((p) => p.id !== currentPlanId);
    const first = options[0];
    const todayVal = todayString();
    setPlanId(first ? String(first.id) : '');
    setCustomTermStart(false);
    setStartDate(licenseStart || todayVal);
    setPaymentDate(todayVal);
    setMethod('Bank Transfer');
    setNotes('');
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    setAmountEdited(false);
    const hint = suggestChangeSaasPlanAmount(gym, current, first);
    setAmount(hint ? String(hint.suggestedAmount) : first ? String(first.price) : '');
  }, [gym, saasPlans, currentPlanId, licenseStart]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: gym?.id,
    initialize: initDefaults,
    saving: saving || submitting,
  });

  useEffect(() => {
    if (!planId || amountEdited) return;
    const plan = saasPlans.find((p) => p.id === parseInt(planId, 10));
    if (!plan) return;
    const hint = suggestChangeSaasPlanAmount(gym, currentPlan, plan);
    setAmount(hint ? String(hint.suggestedAmount) : String(plan.price));
  }, [planId, saasPlans, gym, currentPlan, amountEdited, customTermStart, startDate]);

  const formatMoney = (n) =>
    Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  if (!isOpen || !gym) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const termStart = customTermStart ? startDate : licenseStart;
    const isSameTerm = termStart === licenseStart;
    const planResult = validateChangePlanPayment({
      planId,
      termStart,
      paymentDate,
      amount,
      isSameTerm,
      license: true,
    });
    if (!showValidationError(planResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    const parsedAmount = parseFloat(amount);
    setValidationError('');
    setSubmitting(true);
    try {
      await onSubmit({
        saas_plan_id: parseInt(planId, 10),
        start_date: termStart,
        amount: parsedAmount,
        date: paymentDate,
        method,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = saving || submitting;

  const displayError = (validationError || error) && !Object.keys(fieldErrors).length ? (validationError || error) : '';
  const gymName = gym.name || gym.gym_name;

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
          <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong">{t('modals.changeSaasPlan.title')}</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-app-muted mb-4">
          {t('modals.changeSaasPlan.subtitle', { name: gymName })}
        </p>

        {currentPlan && (
          <div className="ui-info-panel mb-4">
            {t('modals.changePlan.currentPlan')}: <span className="font-medium">{currentPlan.name}</span>
            {gym.isUnpaid ? (
              <>
                {' · '}
                <span className="font-medium text-amber-700 dark:text-amber-300">{t('modals.billing.noPaymentRecordedYet')}</span>
              </>
            ) : (
              <>
                {' · '}
                {t('modals.billing.paidThrough')}{' '}
                <span className="font-medium">{formatDisplayDate(gym.saasEndDate)}</span>
              </>
            )}
          </div>
        )}

        {otherPlans.length === 0 && (
          <div className="ui-alert-amber mb-4">
            {t('modals.billing.addAnotherSaasPlan')}
          </div>
        )}

        {gym.isUnpaid && (
          <div className="ui-alert-amber mb-4">
            {t('modals.billing.unpaidChangeBanner')}
          </div>
        )}

        {displayError && (
          <div className="ui-alert-rose mb-4">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-4">
          <div>
            <label className="form-label">{t('modals.changePlan.newPlan')}</label>
            <select
              required
              disabled={otherPlans.length === 0}
              className={`${fc('planId')} disabled:bg-slate-50 disabled:dark:bg-app-surface disabled:dark:text-app-muted`}
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                clearFieldError(setLocalFieldErrors, 'planId');
              }}
            >
              <option value="" disabled>{t('modals.renew.selectPlan')}</option>
              {otherPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price} / {p.duration}mo
                </option>
              ))}
            </select>
            <FieldError message={fieldErrorMessage(fieldErrors, 'planId')} />
          </div>

          <button
            type="button"
            onClick={() => {
              if (customTermStart) {
                setCustomTermStart(false);
                setStartDate(licenseStart);
                setPaymentDate(today);
              } else {
                setCustomTermStart(true);
                setStartDate(today);
                setPaymentDate(today);
              }
              setAmountEdited(false);
            }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {customTermStart
              ? t('modals.changeSaasPlan.switchMidTerm')
              : t('modals.changeSaasPlan.newLicenseFromDate')}
          </button>

          {!customTermStart ? (
            <div className="ui-info-panel">
              <p className="font-medium">
                {gym.isUnpaid ? t('modals.changeSaasPlan.switchBeforePayment') : t('modals.changeSaasPlan.switchOnCurrentLicense')}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-app-muted">
                {t('modals.changeSaasPlan.licenseStarted', { date: formatDisplayDate(licenseStart) })}
                {gym.isUnpaid
                  ? ` ${t('modals.changeSaasPlan.unpaidPickPlan')}`
                  : ` ${t('modals.changeSaasPlan.paidPickPlan')}`}
              </p>
            </div>
          ) : (
            <div>
              {customTermStart && !gym.isUnpaid && gym.saasEndDate && gym.saasEndDate !== '—' ? (
                <div className="ui-alert-amber mb-3">
                  {t('modals.changeSaasPlan.customTermPaidWarningLicense', {
                    date: formatDisplayDate(gym.saasEndDate),
                  })}
                </div>
              ) : null}
              <label className="form-label">{t('modals.changeSaasPlan.newLicenseStarts')}</label>
              <DateField
                required
                max={today}
                className={fc('startDate')}
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  setPaymentDate(v);
                  clearFieldError(setLocalFieldErrors, 'startDate');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'startDate')} />
              <p className="mt-1 text-xs text-slate-400 dark:text-app-muted">
                {t('modals.changeSaasPlan.freshLicenseHint')}
              </p>
            </div>
          )}

          <div>
            <label className="form-label">{t('modals.changeSaasPlan.paymentDateReceived')}</label>
            <DateField
              required
              min={effectiveStartDate || undefined}
              max={today}
              className={fc('paymentDate')}
              value={paymentDate}
              onChange={(v) => {
                setPaymentDate(v);
                clearFieldError(setLocalFieldErrors, 'paymentDate');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'paymentDate')} />
            <p className="mt-1 text-xs text-slate-400 dark:text-app-muted">
              {t('modals.changeSaasPlan.paymentCollectedHint')}
            </p>
          </div>

          {newEndDate && newEndDate !== '—' && (
            <div className="ui-alert-indigo">
              {upgradeHint?.isDowngrade && upgradeHint?.keepLicenseEnd ? (
                <>
                  {t('modals.changeSaasPlan.licenseEndUnchanged')} <span className="font-semibold">{formatDisplayDate(newEndDate)}</span>
                </>
              ) : (
                <>
                  {t('modals.changeSaasPlan.newLicenseEnds')} <span className="font-semibold">{formatDisplayDate(newEndDate)}</span>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('modals.changePlan.amountDue')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className={fc('amount')}
                value={amount}
                onChange={(e) => {
                  setAmountEdited(true);
                  setAmount(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'amount');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'amount')} />
              {upgradeHint?.freshTerm ? (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-app-muted">
                  {t('modals.billing.suggestedFreshTermLicense', {
                    amount: formatMoney(upgradeHint.suggestedAmount),
                    planName: selectedPlan?.name || t('modals.billing.newPlanFallback'),
                    paidThrough: formatDisplayDate(gym.saasEndDate),
                  })}
                </p>
              ) : upgradeHint?.prePayment ? (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-app-muted">
                  {t('modals.billing.suggestedPrePayment', {
                    amount: formatMoney(upgradeHint.suggestedAmount),
                    planName: selectedPlan?.name || t('modals.billing.newPlanFallback'),
                  })}
                </p>
              ) : upgradeHint?.isDowngrade ? (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-app-muted">
                  {t('modals.billing.suggestedDowngradeLicense', {
                    amount: formatMoney(upgradeHint.suggestedAmount),
                    endDate: formatDisplayDate(gym.saasEndDate) || '—',
                    planName: currentPlan?.name || '—',
                  })}
                </p>
              ) : upgradeHint ? (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-app-muted">
                  {t('modals.billing.suggestedUpgradeLicense', {
                    amount: formatMoney(upgradeHint.suggestedAmount),
                    newPrice: formatMoney(upgradeHint.newPlanPrice),
                    credit: formatMoney(upgradeHint.credit),
                    days: upgradeHint.remainingDays,
                  })}
                </p>
              ) : null}
              {upgradeHint && amountEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setAmountEdited(false);
                    setAmount(String(upgradeHint.suggestedAmount));
                  }}
                  className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {t('modals.billing.useSuggestedAmount', {
                    amount: formatMoney(upgradeHint.suggestedAmount),
                  })}
                </button>
              )}
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
              placeholder={t('modals.changeSaasPlan.referencePlaceholder')}
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
              disabled={isBusy || otherPlans.length === 0}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
            >
              {isBusy ? t('common.processing') : t('modals.changeSaasPlan.save')}
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
