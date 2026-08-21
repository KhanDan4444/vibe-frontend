// src/components/ChangePlanModal.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { todayString, formatDisplayDate } from '../utils/date';
import {
  boundsForPaymentOnTerm,
  boundsForTermStartWithPayment,
  paymentDateForTermStart,
} from '../utils/datePickerBounds';
import {
  validateChangePlanPayment,
  showValidationError,
  inputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
  FORM_INPUT_CLASS,
} from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import { suggestChangePlanAmount, previewMemberTermEnd } from '../utils/memberRenew';
import { parseApiResponse } from '../utils/api';
import { mapPaymentFromApi } from '../utils/apiMappers';
import { getMemberPayments } from '../services/memberService';
import { formatMoney } from '../utils/formatMoney';
import { formatPlanDisplayName } from '../utils/formatPlanDisplayName';
import ChangePlanPaymentSummary from './ChangePlanPaymentSummary';
import ChangePlanAmountHint from './ChangePlanAmountHint';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import MoneyAmountInput from './ui/MoneyAmountInput';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';


const termModeBtn =
  'rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40';
const termModeActive =
  'bg-teal-700 text-white shadow-sm dark:bg-teal-600 dark:text-white';
const termModeIdle = 'text-app-muted hover:text-app-text';

function switchToMidTerm(setters) {
  const { setCustomTermStart, setStartDate, setPaymentDate, setAmountEdited, member, today } = setters;
  setCustomTermStart(false);
  setStartDate(member.startDate);
  setPaymentDate(today);
  setAmountEdited(false);
}

function switchToNewTerm(setters) {
  const { setCustomTermStart, setStartDate, setPaymentDate, setAmountEdited, today } = setters;
  setCustomTermStart(true);
  setStartDate(today);
  setPaymentDate(today);
  setAmountEdited(false);
}

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
  const fc = (field) => inputClass(`${FORM_INPUT_CLASS} cursor-pointer`, fieldErrors, field);
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
  const termStartBounds = boundsForTermStartWithPayment();
  const paymentBounds = boundsForPaymentOnTerm(effectiveStartDate);

  const termModeSetters = useMemo(
    () => ({
      setCustomTermStart,
      setStartDate,
      setPaymentDate,
      setAmountEdited,
      member,
      today,
    }),
    [member, today]
  );

  const initDefaults = useCallback(() => {
    if (!member) return;
    const current = plans.find((p) => p.id === member.planId);
    const options = plans.filter((p) => p.id !== member.planId);
    const first = options[0];
    const todayVal = todayString();
    setPlanId(first ? String(first.id) : '');
    setCustomTermStart(false);
    setStartDate(member.startDate || todayVal);
    setPaymentDate(todayVal);
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
    const hint = suggestChangePlanAmount(member, currentPlan, plan, { customTermStart, startDate });
    setAmount(hint ? String(hint.suggestedAmount) : String(plan.price));
  }, [planId, plans, member, currentPlan, amountEdited, customTermStart, startDate]);

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
  const displayError =
    (validationError || error) && !Object.keys(fieldErrors).length ? validationError || error : '';
  const midTermHint = member.isUnpaid
    ? t('modals.changePlan.midTermHintUnpaid')
    : t('modals.changePlan.midTermHintPaid');

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="lg" zIndexClass="z-[110]">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="flex min-w-0 items-start gap-2">
          <ArrowLeftRight className="mt-0.5 h-5 w-5 shrink-0 text-teal-800/75 dark:text-teal-600/80" aria-hidden />
          <div className="min-w-0">
            <h2 className={modalTitle}>{t('modals.changePlan.title')}</h2>
            <p className="mt-0.5 text-sm text-app-muted">
              {t('modals.changePlan.subtitle', { name: member.name })}
            </p>
          </div>
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
        <div className={`${modalBody} space-y-5`}>
          {currentPlan ? (
            member.isUnpaid ? (
              <div className="ui-alert-amber space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium">{t('modals.changePlan.currentPlan')}</span>
                  <span className="font-semibold">{currentPlan.name}</span>
                  {member.startDate && member.startDate !== '—' ? (
                    <>
                      <span className="opacity-50" aria-hidden>
                        ·
                      </span>
                      <span>
                        {t('modals.changePlan.termStarted', { date: formatDisplayDate(member.startDate) })}
                      </span>
                    </>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed">{t('modals.billing.unpaidChangeBanner')}</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-app-border-subtle bg-app-surface px-3 py-2.5 text-sm">
                <span className="text-app-muted">{t('modals.changePlan.currentPlan')}</span>
                <span className="font-semibold text-app-text-strong">{currentPlan.name}</span>
                <span className="text-app-border-subtle" aria-hidden>
                  ·
                </span>
                <span className="text-app-muted">
                  {t('modals.billing.paidThrough')}{' '}
                  <span className="font-medium text-app-text">{formatDisplayDate(member.endDate)}</span>
                </span>
                {member.startDate && member.startDate !== '—' ? (
                  <>
                    <span className="text-app-border-subtle" aria-hidden>
                      ·
                    </span>
                    <span className="text-app-muted">
                      {t('modals.changePlan.termStarted', { date: formatDisplayDate(member.startDate) })}
                    </span>
                  </>
                ) : null}
              </div>
            )
          ) : null}

          {otherPlans.length === 0 ? (
            <div className="ui-alert-amber">{t('modals.billing.addAnotherMembershipPlan')}</div>
          ) : null}

          {displayError ? <div className="ui-alert-rose">{displayError}</div> : null}

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="form-label mb-0" htmlFor="change-plan-select">
                {t('modals.changePlan.newPlan')}
                <RequiredMark />
              </label>
              {newEndDate && newEndDate !== '—' ? (
                <span className="inline-flex items-center rounded-full border border-app-border-subtle bg-app-surface px-2.5 py-0.5 text-xs font-medium text-app-text">
                  {upgradeHint?.isDowngrade && upgradeHint?.keepTermEnd
                    ? t('modals.changePlan.termEndUnchangedChip', { date: formatDisplayDate(newEndDate) })
                    : t('modals.changePlan.termEndChip', { date: formatDisplayDate(newEndDate) })}
                </span>
              ) : null}
            </div>
            <select
              id="change-plan-select"
              required
              disabled={otherPlans.length === 0}
              className={`ui-select ${fc('planId')} disabled:bg-app-surface disabled:text-app-muted`}
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                clearFieldError(setLocalFieldErrors, 'planId');
              }}
            >
              <option value="" disabled>
                {t('modals.renew.selectPlan')}
              </option>
              {otherPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPlanDisplayName(p.name)} — {formatMoney(p.price)} / {p.duration}mo
                </option>
              ))}
            </select>
            <FieldError message={fieldErrorMessage(fieldErrors, 'planId')} />
          </div>

          <div>
            <p className="form-label mb-1.5">{t('modals.changePlan.termModeLabel')}</p>
            <div
              className="grid grid-cols-2 gap-1 rounded-lg border border-app-border-subtle bg-app-surface p-1"
              role="group"
              aria-label={t('modals.changePlan.termModeLabel')}
            >
              <button
                type="button"
                onClick={() => switchToMidTerm(termModeSetters)}
                className={`${termModeBtn} ${!customTermStart ? termModeActive : termModeIdle}`}
                aria-pressed={!customTermStart}
              >
                {t('modals.changePlan.termModeMidTerm')}
              </button>
              <button
                type="button"
                onClick={() => switchToNewTerm(termModeSetters)}
                className={`${termModeBtn} ${customTermStart ? termModeActive : termModeIdle}`}
                aria-pressed={customTermStart}
              >
                {t('modals.changePlan.termModeNewTerm')}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-app-muted">
              {!customTermStart ? midTermHint : t('modals.changePlan.freshTermHint')}
            </p>
            {customTermStart && !member.isUnpaid && member.endDate && member.endDate !== '—' ? (
              <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
                {t('modals.changePlan.customTermPaidWarning', { date: formatDisplayDate(member.endDate) })}
              </p>
            ) : null}
          </div>

          {customTermStart ? (
            <div>
              <label className="form-label">
                {t('modals.changePlan.effectiveDate')}
                <RequiredMark />
              </label>
              <DateField
                required
                max={termStartBounds.max}
                className={fc('startDate')}
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  setPaymentDate(paymentDateForTermStart(v));
                  clearFieldError(setLocalFieldErrors, 'startDate');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'startDate')} />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">
                {t('modals.changePlan.paymentDateReceived')}
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
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'paymentDate')} />
              <p className="mt-1 text-xs text-app-muted">{t('modals.changePlan.paymentCollectedHint')}</p>
              {hasChangePlanPaymentOnDate ? (
                <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {t('validation.changePlanDuplicate')}
                </p>
              ) : null}
            </div>
            <div>
              <label className="form-label">
                {t('modals.member.method')}
                <RequiredMark />
              </label>
              <select
                className={`ui-select ${fc('method')}`}
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
            <label className="form-label">
              {t('modals.changePlan.amountDue')}
              <RequiredMark />
            </label>
            <MoneyAmountInput
              required
              min="0"
              fieldErrors={fieldErrors}
              value={amount}
              onChange={(e) => {
                setAmountEdited(true);
                setAmount(e.target.value);
                clearFieldError(setLocalFieldErrors, 'amount');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'amount')} />
            <ChangePlanAmountHint
              upgradeHint={upgradeHint}
              amountEdited={amountEdited}
              selectedPlan={selectedPlan}
              currentPlan={currentPlan}
              endDate={member.endDate}
              member={member}
              t={t}
              onUseSuggested={() => {
                setAmountEdited(false);
                setAmount(String(upgradeHint.suggestedAmount));
              }}
            />
          </div>

          <ChangePlanPaymentSummary
            payments={memberPayments}
            termStart={termStart}
            pendingAmount={parseFloat(amount) || 0}
          />
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isBusy} className="w-full sm:w-auto">
            {isBusy ? t('common.processing') : t('modals.changePlan.save')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
