import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestForgotPasswordOtp, resetPasswordWithOtp } from '../../services/authService';
import {
  validateForgotIdentifier,
  validateOtpCode,
  validatePassword,
  validatePasswordMatch,
  showValidationError,
  inputClass as fieldInputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
} from '../../utils/validation';
import FieldError from '../../components/FieldError';
import RequiredMark from '../../components/ui/RequiredMark';
import AuthScreen from '../../components/auth/AuthScreen';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState('username');
  const [identifier, setIdentifier] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSupportOption, setShowSupportOption] = useState(false);

  const inputClass =
    'mt-1 block w-full rounded-md border border-app-border bg-app-input px-3 py-2.5 text-app-text-strong focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 sm:text-sm';
  const fc = (field) => fieldInputClass(inputClass, fieldErrors, field);
  const bannerError = error && !Object.keys(fieldErrors).length ? error : '';

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validateForgotIdentifier(identifier), setError, t, { setFieldErrors })) return;
    setLoading(true);
    try {
      const data = await requestForgotPasswordOtp(identifier);
      setSessionId(data.sessionId);
      setStep('reset');
      setMessage(data.message || t('auth.otpSent'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validateOtpCode(code), setError, t, { setFieldErrors })) return;
    if (!showValidationError(validatePassword(password), setError, t, { setFieldErrors })) return;
    if (!showValidationError(validatePasswordMatch(password, confirm), setError, t, { setFieldErrors })) return;
    setLoading(true);
    try {
      const data = await resetPasswordWithOtp({ sessionId, code, password });
      navigate('/login', { replace: true, state: { message: data.message || t('auth.passwordUpdated') } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-app-border-subtle bg-app-raised p-6 shadow-xl sm:p-8">
        <div>
          <h2 className="text-center text-2xl font-bold text-app-text-strong">
            {t('auth.forgotTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-app-muted">{t('auth.forgotSubtitle')}</p>
          <p className="mt-2 text-center text-xs text-app-muted">{t('auth.forgotAdminHint')}</p>
        </div>

        {bannerError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">{bannerError}</div>
        )}
        {message && step === 'reset' && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            {message}
            {import.meta.env.DEV && (
              <p className="mt-2 text-xs text-app-muted">{t('auth.otpDevHint')}</p>
            )}
          </div>
        )}

        {step === 'username' ? (
          <form className="space-y-4" onSubmit={handleRequestOtp}>
            <div>
              <label className="block text-sm font-medium text-app-text">
                {t('auth.forgotIdentifierLabel')}
                <RequiredMark />
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                inputMode="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  clearFieldError(setFieldErrors, 'email');
                  clearFieldError(setFieldErrors, 'username');
                }}
                className={fc('email')}
                placeholder={t('auth.forgotIdentifierPlaceholder')}
              />
              <FieldError
                message={
                  fieldErrorMessage(fieldErrors, 'email') ||
                  fieldErrorMessage(fieldErrors, 'username')
                }
              />
              <p className="mt-1.5 text-xs text-app-muted">
                {t('auth.forgotIdentifierHint')}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? t('auth.sending') : t('auth.sendOtp')}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <div>
              <label className="block text-sm font-medium text-app-text">
                {t('auth.otpCode')}
                <RequiredMark />
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.trim());
                  clearFieldError(setFieldErrors, 'code');
                }}
                className={fc('code')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'code')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text">
                {t('auth.newPassword')}
                <RequiredMark />
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError(setFieldErrors, 'password');
                }}
                className={fc('password')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text">
                {t('auth.confirmPassword')}
                <RequiredMark />
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  clearFieldError(setFieldErrors, 'confirmPassword');
                }}
                className={fc('confirmPassword')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'confirmPassword')} />
            </div>
            <button
              type="submit"
              disabled={loading || !sessionId}
              className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? t('auth.saving') : t('auth.updatePassword')}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('username');
                setCode('');
                setPassword('');
                setConfirm('');
                setMessage('');
                setError('');
              }}
              className="w-full text-center text-sm text-app-muted hover:text-app-text"
            >
              {t('auth.resendOtp')}
            </button>
          </form>
        )}

        <div className="space-y-3 rounded-xl border border-app-border-subtle bg-app-surface/60 p-4">
          <button
            type="button"
            onClick={() => setShowSupportOption((show) => !show)}
            className="w-full text-left text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            {t('auth.tryOtherOption')}
          </button>
          {showSupportOption && (
            <div className="space-y-2 text-sm text-app-muted">
              <p className="font-semibold text-app-text">{t('auth.supportResetTitle')}</p>
              <p>{t('auth.supportResetBody')}</p>
              <p>{t('auth.supportResetAfter')}</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-app-muted">
          <Link to="/login" className="text-teal-700 hover:text-teal-800">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
