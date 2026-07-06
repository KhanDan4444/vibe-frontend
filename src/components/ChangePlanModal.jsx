// src/components/ChangePlanModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { todayString, formatDisplayDate } from '../utils/date';
import { validateChangePlanPayment, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import { suggestChangePlanAmount, previewMemberTermEnd } from '../utils/memberRenew';
import { parseApiResponse } from '../utils/api';
import { mapPaymentFromApi } from '../utils/apiMappers';
import { getMemberPayments } from '../services/memberService';
import ChangePlanPaymentSummary from './ChangePlanPaymentSummary';
import ResponsiveModal from './ResponsiveModal';
import { modalBody } from '../utils/modalLayout';

/**
 * Switch an active, paid member to a different plan mid-term and record payment.
 */
export default function ChangePlanModal({
  isOpen,
  onClose,
  onSubmit,
  member,
  plans,
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(`${FORM_INPUT_CLASS} dark:bg-app-raised dark:text-app-text cursor-pointer`, fieldErrors, field);
  const [amountEdited, setAmountEdited] = useState(false);
  const [customTermStart, setCustomTermStart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [memberPayments, setMemberPayments] = useState([]);

  const otherPlans = plans.filter((p) => p.id !== member?.planId);
  const currentPlan = plans.find((p) => p.id === member?.planId);
  const selectedPlan = plans.find((p) => p.id === parseInt(planId, 10));

  const upgradeHint = useMemo(
    () => suggestChangePlanAmount(member, currentPlan, selectedPlan, { customTermStart, startDate }),
    [member, currentPlan, selectedPlan, customTermStart, startDate]
  );

  const effectiveStartDate = customTermStart ? startDate : member?.startDate;
  const termStart = effectiveStartDate && effectiveStartDate !== '—' ? effectiveStartDate : null;
  const hasChangePlanPaymentOnDate = memberPayments.some(
    (p) => p.date === paymentDate && p.source === 'change_plan'
  );
  const newEndDate = previewMemberTermEnd({
    member,
    currentPlan,
    selectedPlan,
    customTermStart,
    startDate,
  });
  const today = todayString();

  const initDefaults = useCallback(() => {
    if (!member) return;
    const current = plans.find((p) => p.id === member.planId);
    const options = plans.filter((p) => p.id !== member.planId);
    const first = options[0];
    const today = todayString();
    setPlanId(first ? String(first.id) : '');
    setCustomTermStart(false);
    setStartDate(member.startDate || today);
    setPaymentDate(today);
    setMethod('Cash');
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    setAmountEdited(false);
    const hint = suggestChangePlanAmount(member, current, first);
    setAmount(hint ? String(hint.suggestedAmount) : first ? String(first.price) : '');
  }, [member, plans]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: member?.id,
    initialize: initDefaults,
    saving: saving || submitting,
  });

  useEffect(() => {
    if (!isOpen || !member?.id || !apiFetch) {
      setMemberPayments([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getMemberPayments(apiFetch, member.id);
        const data = await parseApiResponse(res);
        if (cancelled) return;
        if (res.ok && Array.isArray(data)) {
          setMemberPayments(data.map(mapPaymentFromApi).filter(Boolean));
        } else {
          setMemberPayments([]);
        }
      } catch {
        if (!cancelled) setMemberPayments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, member?.id, apiFetch]);

  useEffect(() => {
    if (!planId || amountEdited) return;
    const plan = plans.find((p) => p.id === parseInt(planId, 10));
    if (!plan) return;
    const hint = suggestChangePlanAmount(member, currentPlan, plan);
    setAmount(hint ? String(hint.suggestedAmount) : String(plan.price));
  }, [planId, plans, member, currentPlan, amountEdited, customTermStart, startDate]);

  const formatMoney = (n) =>
    Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  if (!isOpen || !member) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const termStartValue = customTermStart ? startDate : member.startDate;
    const sameTerm = termStartValue === member.startDate;
    const planResult = validateChangePlanPayment({
      planId,
      termStart: termStartValue,
      paymentDate,
      amount,
      isSameTerm: sameTerm,
    });
    if (!showValidationError(planResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    const parsedAmount = parseFloat(amount);
    if (hasChangePlanPaymentOnDate && parsedAmount > 0) {
      setValidationError(t('validation.changePlanDuplicate'));
      return;
    }
    setValidationError('');
    setSubmitting(true);
    try {
      await onSubmit({
        plan_id: parseInt(planId, 10),
        start_date: termStart,
        amount: parsedAmount,
        date: paymentDate,
        method,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = saving || submitting;

  const displayError = (validationError || error) && !Object.keys(fieldErrors).length ? (validationError || error) : '';

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
          <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong">{t('modals.changePlan.title')}</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-app-muted mb-4">
          {t('modals.changePlan.subtitle', { name: member.name })}
        </p>

        {currentPlan && (
          <div className="ui-info-panel mb-4">
            {t('modals.changePlan.currentPlan')}: <span className="font-medium">{currentPlan.name}</span>
            {member.isUnpaid ? (
              <>
                {' · '}
                <span className="font-medium text-amber-700 dark:text-amber-300">{t('modals.billing.noPaymentRecordedYet')}</span>
              </>
            ) : (
              <>
                {' · '}
                {t('modals.billing.paidThrough')}{' '}
                <span className="font-medium">{formatDisplayDate(member.endDate)}</span>
              </>
            )}
          </div>
        )}

        {otherPlans.length === 0 && (
          <div className="ui-alert-amber mb-4">
            {t('modals.billing.addAnotherMembershipPlan')}
          </div>
        )}

        {member.isUnpaid && (
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
                setStartDate(member.startDate);
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
              ? t('modals.changePlan.switchMidTerm')
              : t('modals.changePlan.newTermFromDate')}
          </button>

          {!customTermStart ? (
            <div className="ui-info-panel">
              <p className="font-medium">
                {member.isUnpaid ? t('modals.changePlan.switchBeforePayment') : t('modals.changePlan.switchOnCurrentTerm')}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-app-muted">
                {t('modals.changePlan.termStarted', { date: formatDisplayDate(member.startDate) })}
                {member.isUnpaid
                  ? ` ${t('modals.changePlan.unpaidPickPlan')}`
                  : ` ${t('modals.changePlan.paidPickPlan')}`}
              </p>
            </div>
          ) : (
            <div>
              {customTermStart && !member.isUnpaid && member.endDate && member.endDate !== '—' ? (
                <div className="ui-alert-amber mb-3">
                  {t('modals.changePlan.customTermPaidWarning', {
                    date: formatDisplayDate(member.endDate),
                  })}
                </div>
              ) : null}
              <label className="form-label">{t('modals.changePlan.effectiveDate')}</label>
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
                {t('modals.changePlan.freshTermHint')}
              </p>
            </div>
          )}

          <div>
            <label className="form-label">{t('modals.changePlan.paymentDateReceived')}</label>
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
              {t('modals.changePlan.paymentCollectedHint')}
            </p>
            {hasChangePlanPaymentOnDate ? (
              <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                {t('validation.changePlanDuplicate')}
              </p>
            ) : null}
          </div>

          {newEndDate && newEndDate !== '—' && (
            <div className="ui-alert-indigo">
              {upgradeHint?.isDowngrade && upgradeHint?.keepTermEnd ? (
                <>
                  {t('modals.changePlan.termEndUnchanged')} <span className="font-semibold">{formatDisplayDate(newEndDate)}</span>
                </>
              ) : (
                <>
                  {t('modals.changePlan.newTermEnds')} <span className="font-semibold">{formatDisplayDate(newEndDate)}</span>
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
                  {t('modals.billing.suggestedFreshTerm', {
                    amount: formatMoney(upgradeHint.suggestedAmount),
                    planName: selectedPlan?.name || t('modals.billing.newPlanFallback'),
                    paidThrough: formatDisplayDate(member.endDate),
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
                  {t('modals.billing.suggestedDowngradeTerm', {
                    amount: formatMoney(upgradeHint.suggestedAmount),
                    endDate: formatDisplayDate(member.endDate),
                    planName: currentPlan?.name || '—',
                  })}
                </p>
              ) : upgradeHint ? (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-app-muted">
                  {t('modals.billing.suggestedUpgradeTerm', {
                    amount: formatMoney(upgradeHint.suggestedAmount),
                    newPrice: formatMoney(upgradeHint.newPlanPrice),
                    credit: formatMoney(upgradeHint.credit),
                    days: upgradeHint.remainingDays,
                    dayLabel: t(
                      upgradeHint.remainingDays === 1 ? 'modals.billing.day' : 'modals.billing.days'
                    ),
                    planName: currentPlan?.name || '—',
                  })}
                  {!amountEdited && (
                    <span className="text-slate-400 dark:text-app-muted"> {t('modals.billing.suggestedUpgradeAdjust')}</span>
                  )}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400 dark:text-app-muted">{t('modals.changePlan.amountCollectedHint')}</p>
              )}
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
                className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none cursor-pointer"
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

          <ChangePlanPaymentSummary
            payments={memberPayments}
            termStart={termStart}
            pendingAmount={parseFloat(amount) || 0}
          />

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
              {isBusy ? t('common.processing') : t('modals.changePlan.save')}
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
