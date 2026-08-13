import { useState, useCallback } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { todayString, formatDisplayDate } from '../utils/date';
import { boundsForLicensePayment } from '../utils/datePickerBounds';
import { calculateEndDate } from '../utils/memberDates';
import {
  validateAdminGymRegister,
  showValidationError,
  inputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
  FORM_INPUT_CLASS,
  firstFailure,
  validateRequiredName,
  validateUsername,
  validateOptionalEmail,
  validatePassword,
  validateRequiredEthiopianPhone,
  ok,
  fail,
} from '../utils/validation';
import FieldError from './FieldError';
import { DateField } from './DateField';
import { PAYMENT_METHOD_OPTIONS, translatePaymentMethod } from '../i18n/helpers.js';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import MoneyAmountInput from './ui/MoneyAmountInput';
import Card from './ui/Card';
import PageHeader from './PageHeader';
import EnrollStepProgress from './EnrollStepProgress';
import { formatMoney } from '../utils/formatMoney';
import { modalBody, modalHeader, modalFooter, modalStepFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';


function validateRegisterStep1({ gymName, ownerName, username, email, password, phone }) {
  return firstFailure(
    validateRequiredName(gymName, { field: 'gymName' }),
    validateRequiredName(ownerName, { field: 'ownerName' }),
    validateUsername(username),
    validateOptionalEmail(email),
    validatePassword(password),
    validateRequiredEthiopianPhone(phone)
  );
}

/**
 * Register a gym tenant. Use variant="page" for stepped full-page flow (admin).
 * Modal variant keeps a single-scroll form for compact use.
 */
export default function RegisterGymModal({
  isOpen = true,
  onClose,
  onSubmit,
  saasPlans = [],
  saving = false,
  error: externalError,
  variant = 'modal',
}) {
  const { t } = useTranslation();
  const isPage = variant === 'page';

  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [saasPlanId, setSaasPlanId] = useState('');
  const [skipPayment, setSkipPayment] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState('');
  const [error, setError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const [registerStep, setRegisterStep] = useState(1);
  const [registerMaxStep, setRegisterMaxStep] = useState(1);
  const [registerDone, setRegisterDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(FORM_INPUT_CLASS, fieldErrors, field);
  const isBusy = saving || submitting;

  const initDefaults = useCallback(() => {
    setGymName('');
    setOwnerName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setPhone('');
    setSaasPlanId('');
    setSkipPayment(false);
    setAmount('');
    setMethod('Bank Transfer');
    setPaymentDate(todayString());
    setError('');
    clearAllFieldErrors(setLocalFieldErrors);
    setRegisterStep(1);
    setRegisterMaxStep(1);
    setRegisterDone(null);
  }, []);

  const { markTouched, resetDraft } = useModalFormDraft({
    isOpen,
    scopeKey: 'register',
    initialize: initDefaults,
    saving: isBusy,
  });

  if (!isOpen) return null;

  const selectedPlan = saasPlans.find((p) => String(p.id) === String(saasPlanId));
  const registerSteps = [
    { id: 'gym', label: t('modals.registerGym.stepGym') },
    { id: 'plan', label: t('modals.registerGym.stepPlan') },
    { id: 'payment', label: t('modals.registerGym.stepPayment') },
  ];

  const displayError = error || externalError;
  const bannerError = displayError && !Object.keys(fieldErrors).length ? displayError : '';

  const validateStep = (step) => {
    if (step === 1) {
      return showValidationError(
        validateRegisterStep1({ gymName, ownerName, username, email, password, phone }),
        setError,
        t,
        { setFieldErrors: setLocalFieldErrors }
      );
    }
    if (step === 2) {
      if (saasPlans.length === 0) {
        setError(t('modals.registerGym.needSaasPlanFirst'));
        return false;
      }
      return showValidationError(
        saasPlanId ? ok() : fail('validation.selectSaasPlan', 'saasPlanId'),
        setError,
        t,
        { setFieldErrors: setLocalFieldErrors }
      );
    }
    return true;
  };

  const goNext = () => {
    setError('');
    if (registerStep === 1) {
      if (!validateStep(1)) return;
      window.setTimeout(() => {
        setRegisterStep(2);
        setRegisterMaxStep((m) => Math.max(m, 2));
      }, 0);
      return;
    }
    if (registerStep === 2) {
      if (!validateStep(2)) return;
      window.setTimeout(() => {
        setRegisterStep(3);
        setRegisterMaxStep((m) => Math.max(m, 3));
      }, 0);
    }
  };

  const selectStep = (n) => {
    if (n < 1 || n > registerMaxStep || n === registerStep) return;
    if (n > registerStep) {
      for (let s = registerStep; s < n; s += 1) {
        if (!validateStep(s)) return;
      }
    }
    setError('');
    clearAllFieldErrors(setLocalFieldErrors);
    setRegisterStep(n);
  };

  const buildPayload = () => {
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const base = {
      gymName: gymName.trim(),
      ownerName: ownerName.trim(),
      username: username.trim().toLowerCase(),
      password,
      phone: trimmedPhone,
      saasPlanId: parseInt(saasPlanId, 10),
    };
    if (trimmedEmail) base.email = trimmedEmail;
    if (skipPayment) {
      return { ...base, skipPayment: true, start_date: todayString() };
    }
    return {
      ...base,
      skipPayment: false,
      amount: parseFloat(amount),
      date: paymentDate,
      start_date: paymentDate,
      method,
    };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isPage && registerStep < 3) return;
    if (isBusy) return;
    setError('');
    clearAllFieldErrors(setLocalFieldErrors);

    const registerResult = validateAdminGymRegister({
      gymName,
      ownerName,
      username,
      email,
      password,
      phone,
      saasPlanId,
      skipPayment,
      amount,
      paymentDate,
    });
    if (!showValidationError(registerResult, setError, t, { setFieldErrors: setLocalFieldErrors })) return;

    const payload = buildPayload();
    const endIso = selectedPlan
      ? calculateEndDate(payload.start_date || todayString(), selectedPlan.duration)
      : '';

    setSubmitting(true);
    try {
      await onSubmit(payload);
      if (isPage) {
        setRegisterDone({
          gymName: payload.gymName,
          ownerName: payload.ownerName,
          username: payload.username,
          planName: selectedPlan?.name || '',
          skipPayment: payload.skipPayment,
          amount: payload.skipPayment ? null : payload.amount,
          method: payload.skipPayment ? null : payload.method,
          startDate: payload.start_date,
          endDate: endIso && endIso !== '—' ? endIso : '',
        });
      }
    } catch {
      // Parent sets externalError / throws; keep form open.
    } finally {
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    resetDraft();
    setRegisterDone(null);
    setRegisterStep(1);
    setRegisterMaxStep(1);
  };

  const step1Fields = (
    <section className="space-y-4">
      <div>
        <label className="form-label">
          {t('modals.registerGym.gymName')}
          <RequiredMark />
        </label>
        <input
          type="text"
          required={!isPage}
          placeholder={t('modals.registerGym.gymNamePlaceholder')}
          className={fc('gymName')}
          value={gymName}
          onChange={(e) => {
            setGymName(e.target.value);
            clearFieldError(setLocalFieldErrors, 'gymName');
          }}
        />
        <FieldError message={fieldErrorMessage(fieldErrors, 'gymName')} />
      </div>
      <div>
        <label className="form-label">
          {t('modals.registerGym.ownerName')}
          <RequiredMark />
        </label>
        <input
          type="text"
          required={!isPage}
          className={fc('ownerName')}
          value={ownerName}
          onChange={(e) => {
            setOwnerName(e.target.value);
            clearFieldError(setLocalFieldErrors, 'ownerName');
          }}
        />
        <FieldError message={fieldErrorMessage(fieldErrors, 'ownerName')} />
      </div>
      <div>
        <label className="form-label">
          {t('modals.registerGym.ownerEmail')}
          <span className="ml-1 text-xs font-normal text-app-muted">({t('account.optional')})</span>
        </label>
        <input
          type="email"
          className={fc('email')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError(setLocalFieldErrors, 'email');
          }}
        />
        <FieldError message={fieldErrorMessage(fieldErrors, 'email')} />
      </div>
      <div>
        <label className="form-label">
          {t('modals.registerGym.username')}
          <RequiredMark />
        </label>
        <input
          type="text"
          required={!isPage}
          autoComplete="username"
          pattern="[a-z0-9._]{3,30}"
          title={t('account.usernamePattern')}
          placeholder={t('modals.registerGym.usernamePlaceholder')}
          className={fc('username')}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value.toLowerCase());
            clearFieldError(setLocalFieldErrors, 'username');
          }}
        />
        <FieldError message={fieldErrorMessage(fieldErrors, 'username')} />
        <p className="mt-1.5 text-xs text-app-muted">{t('modals.registerGym.usernameHint')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">
            {t('auth.password')}
            <RequiredMark />
          </label>
          <input
            type="password"
            required={!isPage}
            className={fc('password')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError(setLocalFieldErrors, 'password');
            }}
          />
          <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
        </div>
        <div>
          <label className="form-label">
            {t('modals.registerGym.phone')}
            <RequiredMark />
          </label>
          <input
            type="tel"
            required={!isPage}
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('auth.phonePlaceholder')}
            className={fc('phone')}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearFieldError(setLocalFieldErrors, 'phone');
            }}
          />
          <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
        </div>
      </div>
    </section>
  );

  const step2Fields = (
    <section className="space-y-4">
      {saasPlans.length === 0 ? (
        <div className="ui-alert-amber">{t('modals.registerGym.needSaasPlanFirst')}</div>
      ) : null}
      <div>
        <label className="form-label">
          {t('modals.registerGym.saasPlan')}
          <RequiredMark />
        </label>
        <select
          required={!isPage}
          className={`ui-select ${fc('saasPlanId')} cursor-pointer`}
          value={saasPlanId}
          onChange={(e) => {
            const nextId = e.target.value;
            setSaasPlanId(nextId);
            clearFieldError(setLocalFieldErrors, 'saasPlanId');
            if (!skipPayment) {
              const plan = saasPlans.find((p) => String(p.id) === String(nextId));
              if (plan) setAmount(String(plan.price));
            }
          }}
        >
          <option value="">{t('modals.registerGym.selectPlan')}</option>
          {saasPlans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatMoney(p.price)} / {p.duration}mo
            </option>
          ))}
        </select>
        <FieldError message={fieldErrorMessage(fieldErrors, 'saasPlanId')} />
      </div>
    </section>
  );

  const step3Fields = (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-app-text-strong">{t('modals.registerGym.initialPayment')}</h3>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-app-text">
          <input
            type="checkbox"
            checked={skipPayment}
            onChange={(e) => {
              const next = e.target.checked;
              setSkipPayment(next);
              if (!next && saasPlanId) {
                const plan = saasPlans.find((p) => String(p.id) === String(saasPlanId));
                if (plan) setAmount(String(plan.price));
              }
            }}
            className="rounded border-app-border-subtle"
          />
          {t('modals.registerGym.skipPayment')}
        </label>
      </div>

      {!skipPayment ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">
                {t('modals.member.amount')}
                <RequiredMark />
              </label>
              <MoneyAmountInput
                required={!isPage}
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
            <label className="form-label">
              {t('modals.member.paymentDate')}
              <RequiredMark />
            </label>
            <DateField
              required={!isPage}
              min={boundsForLicensePayment().min}
              max={boundsForLicensePayment().max}
              className={fc('paymentDate')}
              value={paymentDate}
              onChange={(v) => {
                setPaymentDate(v);
                clearFieldError(setLocalFieldErrors, 'paymentDate');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'paymentDate')} />
            <p className="mt-1.5 text-xs text-app-muted">{t('modals.registerGym.licenseStartHint')}</p>
          </div>
        </div>
      ) : (
        <div className="ui-alert-amber">
          <span dangerouslySetInnerHTML={{ __html: t('modals.registerGym.unpaidBanner') }} />
        </div>
      )}
    </section>
  );

  const formFields = isPage ? (
    <>
      {registerStep === 1 ? step1Fields : null}
      {registerStep === 2 ? step2Fields : null}
      {registerStep === 3 ? step3Fields : null}
    </>
  ) : (
    <div className="space-y-6">
      {step1Fields}
      {step2Fields}
      {step3Fields}
    </div>
  );

  const formInner = isPage ? (
    <>
      {bannerError ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {bannerError}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-6">
        {formFields}
        <div className={modalStepFooter}>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs text-app-muted sm:text-left">
              {t('modals.registerGym.stepOf', { current: registerStep, total: 3 })}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              {registerStep > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setError('');
                    setRegisterStep((s) => s - 1);
                  }}
                  className="w-full sm:w-auto"
                >
                  {t('common.back')}
                </Button>
              ) : null}
              {registerStep < 3 ? (
                <Button
                  type="button"
                  disabled={isBusy || (registerStep === 2 && saasPlans.length === 0)}
                  onClick={goNext}
                  className="w-full sm:w-auto"
                >
                  {t('common.continue')}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isBusy || saasPlans.length === 0}
                  onClick={(e) => void handleSubmit(e)}
                  className="w-full sm:w-auto"
                >
                  {isBusy ? t('common.processing') : t('modals.registerGym.save')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </>
  ) : (
    <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="flex min-h-0 flex-1 flex-col">
      <div className={`${modalBody} space-y-4`}>
        {saasPlans.length === 0 ? (
          <div className="ui-alert-amber">{t('modals.registerGym.needSaasPlanFirst')}</div>
        ) : null}
        {bannerError ? <div className="ui-alert-rose">{bannerError}</div> : null}
        {formFields}
      </div>
      <div className={modalFooter}>
        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isBusy || saasPlans.length === 0} className="w-full sm:w-auto">
          {isBusy ? t('common.processing') : t('modals.registerGym.save')}
        </Button>
      </div>
    </form>
  );

  if (isPage) {
    if (registerDone) {
      const termLabel =
        registerDone.startDate && registerDone.endDate
          ? `${formatDisplayDate(registerDone.startDate)} → ${formatDisplayDate(registerDone.endDate)}`
          : registerDone.startDate
            ? formatDisplayDate(registerDone.startDate)
            : '';
      const paymentLabel = registerDone.skipPayment
        ? t('status.unpaid')
        : [
            registerDone.amount != null ? formatMoney(registerDone.amount) : null,
            registerDone.method ? translatePaymentMethod(registerDone.method) : null,
          ]
            .filter(Boolean)
            .join(' · ');

      return (
        <div className="mx-auto w-full max-w-xl enroll-success-in">
          <Card className="overflow-hidden p-6 sm:p-8">
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="enroll-success-check mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-600/25 bg-emerald-500/10 dark:border-emerald-400/25">
                <Check className="h-12 w-12 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
              </div>
              <h2 className={`${modalTitle} text-xl sm:text-xl`}>{t('modals.registerGym.successTitle')}</h2>
              <p className="mt-2 text-base font-semibold text-app-text-strong">{registerDone.gymName}</p>
              <p className="mt-1 text-sm text-app-muted">
                {registerDone.skipPayment
                  ? t('modals.registerGym.successUnpaid')
                  : t('modals.registerGym.successPaid')}
              </p>
              <dl className="mt-5 w-full space-y-2 text-left text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-app-muted">{t('modals.registerGym.ownerName')}</dt>
                  <dd className="truncate font-medium text-app-text-strong">{registerDone.ownerName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-app-muted">{t('modals.registerGym.username')}</dt>
                  <dd className="truncate font-medium text-app-text-strong">@{registerDone.username}</dd>
                </div>
                {registerDone.planName ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-app-muted">{t('modals.registerGym.saasPlan')}</dt>
                    <dd className="truncate font-medium text-app-text-strong">{registerDone.planName}</dd>
                  </div>
                ) : null}
                {termLabel ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-app-muted">{t('modals.gymEdit.licenseLabel')}</dt>
                    <dd className="font-medium text-app-text-strong">{termLabel}</dd>
                  </div>
                ) : null}
                {paymentLabel ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-app-muted">{t('modals.registerGym.initialPayment')}</dt>
                    <dd className="font-medium text-app-text-strong">{paymentLabel}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                  {t('modals.registerGym.backToGyms')}
                </Button>
                <Button type="button" onClick={startAnother} className="w-full sm:w-auto">
                  {t('modals.registerGym.registerAnother')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-xl space-y-4 sm:space-y-5">
        <PageHeader
          title={t('modals.registerGym.title')}
          subtitle={t('modals.registerGym.subtitle')}
          actions={
            <Button type="button" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
              {t('modals.registerGym.backToGyms')}
            </Button>
          }
        />
        <Card className="overflow-visible p-4 sm:p-6">
          <div className="mb-5">
            <EnrollStepProgress
              steps={registerSteps}
              current={registerStep}
              maxReached={registerMaxStep}
              onSelect={selectStep}
              label={t('modals.registerGym.enrollProgress')}
            />
          </div>
          {formInner}
        </Card>
      </div>
    );
  }

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="3xl" zIndexClass="z-[60]">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0 pr-2">
          <h2 className={modalTitle}>{t('modals.registerGym.title')}</h2>
          <p className="mt-1 text-xs text-app-muted">{t('modals.registerGym.subtitle')}</p>
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
      {formInner}
    </ResponsiveModal>
  );
}
