import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestForgotPasswordOtp, resetPasswordWithOtp } from '../../services/authService';
import {
  validateLoginIdentifier,
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

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState('username');
  const [username, setUsername] = useState('');
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
    'mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900/40 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none dark:border-app-border dark:bg-app-input dark:text-app-text-strong sm:text-sm';
  const fc = (field) => fieldInputClass(inputClass, fieldErrors, field);
  const bannerError = error && !Object.keys(fieldErrors).length ? error : '';

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validateLoginIdentifier(username), setError, t, { setFieldErrors })) return;
    setLoading(true);
    try {
      const data = await requestForgotPasswordOtp(username);
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setStep('reset');
      }
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
    <div className="safe-top safe-bottom flex min-h-[100dvh] items-center justify-center bg-slate-900 px-4 py-8 dark:bg-app-bg">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-xl dark:border-app-border-subtle dark:bg-app-raised sm:p-8">
        <div>
          <h2 className="text-center text-2xl font-bold text-white dark:text-app-text-strong">
            {t('auth.forgotTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400 dark:text-app-muted">{t('auth.forgotSubtitle')}</p>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-app-muted">{t('auth.forgotAdminHint')}</p>
        </div>

        {bannerError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">{bannerError}</div>
        )}
        {message && step === 'reset' && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            {message}
            {import.meta.env.DEV && (
              <p className="mt-2 text-xs text-slate-400">{t('auth.otpDevHint')}</p>
            )}
          </div>
        )}

        {step === 'username' ? (
          <form className="space-y-4" onSubmit={handleRequestOtp}>
            <div>
              <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                {t('account.username')}
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  clearFieldError(setFieldErrors, 'email');
                }}
                className={fc('email')}
                placeholder={t('auth.forgotUsernamePlaceholder')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'email')} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? t('auth.sending') : t('auth.sendOtp')}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <div>
              <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                {t('auth.otpCode')}
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
              <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                {t('auth.newPassword')}
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
              <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                {t('auth.confirmPassword')}
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
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
              className="w-full text-center text-sm text-slate-400 hover:text-slate-300"
            >
              {t('auth.resendOtp')}
            </button>
          </form>
        )}

        <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/30 p-4 dark:border-app-border-subtle dark:bg-app-surface/60">
          <button
            type="button"
            onClick={() => setShowSupportOption((show) => !show)}
            className="w-full text-left text-sm font-semibold text-indigo-300 hover:text-indigo-200"
          >
            {t('auth.tryOtherOption')}
          </button>
          {showSupportOption && (
            <div className="space-y-2 text-sm text-slate-400 dark:text-app-muted">
              <p className="font-semibold text-slate-300 dark:text-app-text">{t('auth.supportResetTitle')}</p>
              <p>{t('auth.supportResetBody')}</p>
              <p>{t('auth.supportResetAfter')}</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-400">
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
