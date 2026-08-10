// src/components/ChangeSaasPlanModal.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { todayString, formatDisplayDate, toDateString } from '../utils/date';
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
import { suggestChangeSaasPlanAmount, previewSaasLicenseEnd } from '../utils/saasRenew';
import { parseApiResponse } from '../utils/api';
import { getSaasPayments } from '../services/gymAdminService';
import { formatMoney } from '../utils/formatMoney';
import ChangePlanPaymentSummary from './ChangePlanPaymentSummary';
import ChangePlanAmountHint from './ChangePlanAmountHint';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import MoneyAmountInput from './ui/MoneyAmountInput';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';

const termModeBtn =
  'rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40';
const termModeActive = 'bg-app-raised text-app-text-strong shadow-sm';
const termModeIdle = 'text-app-muted hover:text-app-text';

function switchToMidTerm(setters) {
  const { setCustomTermStart, setStartDate, setPaymentDate, setAmountEdited, licenseStart, today } = setters;
  setCustomTermStart(false);
  setStartDate(licenseStart || today);
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

function mapGymSaasPayment(p) {
  if (!p) return null;
  return {
    id: p.id,
    amount: Number(p.amount),
    date: toDateString(p.date),
    source: p.source || 'collect',
  };
}

/** Switch an active gym to a different SaaS plan mid-term (admin). */
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
  const { apiFetch } = useAuth();
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
  const [amountEdited, setAmountEdited] = useState(false);
  const [customTermStart, setCustomTermStart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gymPayments, setGymPayments] = useState([]);

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
  const termStart = effectiveStartDate && effectiveStartDate !== '—' ? effectiveStartDate : null;
  const newEndDate = previewSaasLicenseEnd({
    gym,
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
      licenseStart,
      today,
    }),
    [licenseStart, today]
  );

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
    if (!isOpen || !gym?.id || !apiFetch) {
      setGymPayments([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getSaasPayments(apiFetch, { gym_id: gym.id, limit: 50, page: 1 });
        const data = await parseApiResponse(res);
        if (cancelled) return;
        if (res.ok && Array.isArray(data.items)) {
          setGymPayments(data.items.map(mapGymSaasPayment).filter(Boolean));
        } else if (res.ok && Array.isArray(data)) {
          setGymPayments(data.map(mapGymSaasPayment).filter(Boolean));
        } else {
          setGymPayments([]);
        }
      } catch {
        if (!cancelled) setGymPayments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, gym?.id, apiFetch]);

  useEffect(() => {
    if (!planId || amountEdited) return;
    const plan = saasPlans.find((p) => p.id === parseInt(planId, 10));
    if (!plan) return;
    const hint = suggestChangeSaasPlanAmount(gym, currentPlan, plan, { customTermStart, startDate });
    setAmount(hint ? String(hint.suggestedAmount) : String(plan.price));
  }, [planId, saasPlans, gym, currentPlan, amountEdited, customTermStart, startDate]);

  if (!isOpen || !gym) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const termStartValue = customTermStart ? startDate : licenseStart;
    const sameTerm = termStartValue === licenseStart;
    const planResult = validateChangePlanPayment({
      planId,
      termStart: termStartValue,
      paymentDate,
      amount,
      isSameTerm: sameTerm,
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
  const displayError =
    (validationError || error) && !Object.keys(fieldErrors).length ? validationError || error : '';
  const gymName = gym.name || gym.gym_name;
  const midTermHint = gym.isUnpaid
    ? t('modals.changePlan.midTermHintUnpaid')
    : t('modals.changePlan.midTermHintPaid');

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="lg">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="flex min-w-0 items-start gap-2">
          <ArrowLeftRight className="mt-0.5 h-5 w-5 shrink-0 text-teal-800/75 dark:text-teal-600/80" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-app-text-strong">{t('modals.changeSaasPlan.title')}</h2>
            <p className="mt-0.5 text-sm text-app-muted">
              {t('modals.changeSaasPlan.subtitle', { name: gymName })}
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
            gym.isUnpaid ? (
              <div className="ui-alert-amber space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium">{t('modals.changePlan.currentPlan')}</span>
                  <span className="font-semibold">{currentPlan.name}</span>
                  {licenseStart && licenseStart !== '—' ? (
                    <>
                      <span className="opacity-50" aria-hidden>
                        ·
                      </span>
                      <span>
                        {t('modals.changeSaasPlan.licenseStarted', {
                          date: formatDisplayDate(licenseStart),
                        })}
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
                  <span className="font-medium text-app-text">{formatDisplayDate(gym.saasEndDate)}</span>
                </span>
                {licenseStart && licenseStart !== '—' ? (
                  <>
                    <span className="text-app-border-subtle" aria-hidden>
                      ·
                    </span>
                    <span className="text-app-muted">
                      {t('modals.changeSaasPlan.licenseStarted', {
                        date: formatDisplayDate(licenseStart),
                      })}
                    </span>
                  </>
                ) : null}
              </div>
            )
          ) : null}

          {otherPlans.length === 0 ? (
            <div className="ui-alert-amber">{t('modals.billing.addAnotherSaasPlan')}</div>
          ) : null}

          {displayError ? <div className="ui-alert-rose">{displayError}</div> : null}

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="form-label mb-0" htmlFor="change-saas-plan-select">
                {t('modals.changePlan.newPlan')}
                <RequiredMark />
              </label>
              {newEndDate && newEndDate !== '—' ? (
                <span className="inline-flex items-center rounded-full border border-app-border-subtle bg-app-surface px-2.5 py-0.5 text-xs font-medium text-app-text">
                  {upgradeHint?.isDowngrade && upgradeHint?.keepLicenseEnd
                    ? t('modals.changeSaasPlan.licenseEndUnchangedChip', {
                        date: formatDisplayDate(newEndDate),
                      })
                    : t('modals.changeSaasPlan.licenseEndChip', {
                        date: formatDisplayDate(newEndDate),
                      })}
                </span>
              ) : null}
            </div>
            <select
              id="change-saas-plan-select"
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
                  {p.name} — {formatMoney(p.price)} / {p.duration}mo
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
              {!customTermStart ? midTermHint : t('modals.changeSaasPlan.freshLicenseHint')}
            </p>
            {customTermStart && !gym.isUnpaid && gym.saasEndDate && gym.saasEndDate !== '—' ? (
              <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
                {t('modals.changeSaasPlan.customTermPaidWarningLicense', {
                  date: formatDisplayDate(gym.saasEndDate),
                })}
              </p>
            ) : null}
          </div>

          {customTermStart ? (
            <div>
              <label className="form-label">
                {t('modals.changeSaasPlan.newLicenseStarts')}
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
                {t('modals.changeSaasPlan.paymentDateReceived')}
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
              <p className="mt-1 text-xs text-app-muted">{t('modals.changeSaasPlan.paymentCollectedHint')}</p>
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
              endDate={gym.saasEndDate}
              license
              t={t}
              onUseSuggested={() => {
                setAmountEdited(false);
                setAmount(String(upgradeHint.suggestedAmount));
              }}
            />
          </div>

          <div>
            <label className="form-label">{t('common.notesOptional')}</label>
            <input
              type="text"
              className="mt-1 w-full app-field"
              placeholder={t('modals.changeSaasPlan.referencePlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <ChangePlanPaymentSummary
            payments={gymPayments}
            termStart={termStart}
            pendingAmount={parseFloat(amount) || 0}
          />
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isBusy} className="w-full sm:w-auto">
            {isBusy ? t('common.processing') : t('modals.changeSaasPlan.save')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
