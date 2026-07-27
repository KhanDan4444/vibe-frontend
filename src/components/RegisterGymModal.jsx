// src/components/RegisterGymModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString } from '../utils/date';
import { boundsForLicensePayment } from '../utils/datePickerBounds';
import {
  validateAdminGymRegister,
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
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import { formatMoney } from '../utils/formatMoney';
import { modalBody } from '../utils/modalLayout';

export default function RegisterGymModal({ isOpen, onClose, onSubmit, saasPlans, saving = false, error: externalError }) {
  const { t } = useTranslation();
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
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(`${FORM_INPUT_CLASS} dark:bg-app-raised`, fieldErrors, field);

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
  }, []);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: 'register',
    initialize: initDefaults,
    saving,
  });

  useEffect(() => {
    if (!isOpen || skipPayment || !saasPlanId) return;
    const plan = saasPlans.find((p) => p.id === parseInt(saasPlanId, 10));
    if (plan) setAmount(String(plan.price));
  }, [saasPlanId, saasPlans, isOpen, skipPayment]);

  if (!isOpen) return null;

  const canSubmit =
    !saving &&
    saasPlans.length > 0 &&
    validateAdminGymRegister({
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
    }).ok;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
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
    setError('');
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const base = {
      gymName,
      ownerName,
      username: username.trim().toLowerCase(),
      password,
      phone: trimmedPhone,
      saasPlanId: parseInt(saasPlanId, 10),
    };
    if (trimmedEmail) base.email = trimmedEmail;
    if (skipPayment) {
      onSubmit({ ...base, skipPayment: true, start_date: todayString() });
    } else {
      onSubmit({
        ...base,
        skipPayment: false,
        amount: parseFloat(amount),
        date: paymentDate,
        start_date: paymentDate,
        method,
      });
    }
  };

  const displayError = error || externalError;
  const bannerError = displayError && !Object.keys(fieldErrors).length ? displayError : '';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="3xl" zIndexClass="z-[60]">
      <div className={`${modalBody} relative`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-app-text"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong mb-1 pr-8">{t('modals.registerGym.title')}</h2>
        <p className="text-xs text-slate-500 dark:text-app-muted mb-5">{t('modals.registerGym.subtitle')}</p>

        {saasPlans.length === 0 && (
          <div className="ui-alert-amber mb-4">
            Create a SaaS plan first, then register gyms.
          </div>
        )}

        {bannerError && (
          <div className="ui-alert-rose mb-4">
            {bannerError}
          </div>
        )}

        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-4">
          <div>
            <label className="form-label">{t('modals.registerGym.gymName')} *</label>
            <input
              type="text"
              required
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
            <label className="form-label">{t('modals.registerGym.ownerName')} *</label>
            <input
              type="text"
              required
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
              <span className="ml-1 text-xs font-normal text-slate-400">({t('account.optional')})</span>
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
            <p className="mt-1 text-xs text-slate-400 dark:text-app-muted">{t('modals.registerGym.ownerEmailHint')}</p>
          </div>
          <div>
            <label className="form-label">
              {t('modals.registerGym.username')} *
            </label>
            <input
              type="text"
              required
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
            <p className="mt-1 text-xs text-slate-400 dark:text-app-muted">{t('modals.registerGym.usernameHint')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Password *</label>
              <input
                type="password"
                required
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
              <label className="form-label">{t('modals.registerGym.phone')} *</label>
              <input
                type="tel"
                required
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
          <div>
            <label className="form-label">{t('modals.registerGym.saasPlan')} *</label>
            <select
              required
              className={`${fc('saasPlanId')} cursor-pointer`}
              value={saasPlanId}
              onChange={(e) => {
                setSaasPlanId(e.target.value);
                clearFieldError(setLocalFieldErrors, 'saasPlanId');
              }}
            >
              <option value="">-- Select a Plan --</option>
              {saasPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.price)} / {p.duration}mo
                </option>
              ))}
            </select>
            <FieldError message={fieldErrorMessage(fieldErrors, 'saasPlanId')} />
          </div>

          <div className="border-t border-slate-100 dark:border-app-border-subtle pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-app-text-strong">{t('modals.registerGym.initialPayment')}</h3>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-app-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipPayment}
                  onChange={(e) => setSkipPayment(e.target.checked)}
                  className="rounded border-slate-300"
                />
                {t('modals.registerGym.skipPayment')}
              </label>
            </div>

            {!skipPayment && (
              <div className="space-y-4">
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
                      className="mt-1 block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised px-3 py-2 text-sm text-slate-700 dark:text-app-text cursor-pointer focus:border-teal-600 focus:outline-none"
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
                  <label className="form-label">{t('modals.member.paymentDate')}</label>
                  <DateField
                    required
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
                  <p className="mt-1 text-xs text-slate-400 dark:text-app-muted">
                    {t('modals.registerGym.licenseStartHint')}
                  </p>
                </div>
              </div>
            )}
            {skipPayment && (
              <div className="ui-alert-amber">
                <span dangerouslySetInnerHTML={{ __html: t('modals.registerGym.unpaidBanner') }} />
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              {saving ? t('common.processing') : t('modals.registerGym.save')}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
