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
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from '../../utils/validation';
import FieldError from '../../components/FieldError';
import RequiredMark from '../../components/ui/RequiredMark';
import AuthScreen from '../../components/auth/AuthScreen';
import AuthFormShell, { AuthStepDots } from '../../components/auth/AuthFormShell';
import AuthSuccessPanel from '../../components/auth/AuthSuccessPanel';
import AuthCtaButton from '../../components/auth/AuthCtaButton';

function formatAccount(identifier) {
  const trimmed = identifier.trim();
  if (isValidEthiopianPhone(trimmed)) {
    return {
      labelKey: 'auth.accountPhone',
      value: normalizeEthiopianPhone(trimmed) || trimmed,
    };
  }
  return {
    labelKey: 'auth.accountUsername',
    value: `@${trimmed.toLowerCase()}`,
  };
}

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
  const [resetDone, setResetDone] = useState(null);

  const inputClass = 'auth-field';
  const fc = (field) => fieldInputClass(inputClass, fieldErrors, field);
  const bannerError = error && !Object.keys(fieldErrors).length ? error : '';
  const onReset = step === 'reset';

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
      await resetPasswordWithOtp({ sessionId, code, password });
      setResetDone(formatAccount(identifier));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (resetDone) {
    return (
      <AuthScreen>
        <AuthFormShell>
          <AuthSuccessPanel
            title={t('auth.successAllSet')}
            hero={t('auth.forgotSuccessHero')}
            body={t('auth.forgotSuccessBody')}
            rows={[{ label: t(resetDone.labelKey), value: resetDone.value }]}
            ctaLabel={t('auth.signIn')}
            onCta={() => navigate('/login', { replace: true })}
          />
        </AuthFormShell>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthFormShell>
        <div className="space-y-3 text-center">
          <AuthStepDots activeIndex={onReset ? 1 : 0} />
          <div>
            <h2 className="auth-title">{t('auth.forgotTitle')}</h2>
            <p className="auth-subtitle">{t('auth.forgotSubtitle')}</p>
            <p className="mt-1.5 text-xs text-white/40">{t('auth.forgotAdminHint')}</p>
          </div>
        </div>

        {bannerError && (
          <div className="auth-banner-error" role="alert">
            {bannerError}
          </div>
        )}
        {message && onReset && (
          <div className="auth-banner-success" role="status">
            {message}
            {import.meta.env.DEV && <p className="auth-hint mt-2">{t('auth.otpDevHint')}</p>}
          </div>
        )}

        {!onReset ? (
          <form className="space-y-5" onSubmit={handleRequestOtp} noValidate>
            <div>
              <label htmlFor="forgot-identifier" className="auth-label">
                {t('auth.forgotIdentifierLabel')}
                <RequiredMark />
              </label>
              <input
                id="forgot-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  clearFieldError(setFieldErrors, 'email');
                  clearFieldError(setFieldErrors, 'username');
                }}
                className={fc('email')}
                placeholder={t('auth.forgotIdentifierPlaceholder')}
                aria-invalid={Boolean(
                  fieldErrorMessage(fieldErrors, 'email') || fieldErrorMessage(fieldErrors, 'username')
                )}
              />
              <FieldError
                message={
                  fieldErrorMessage(fieldErrors, 'email') || fieldErrorMessage(fieldErrors, 'username')
                }
                className="text-sm text-rose-300"
              />
              <p className="auth-hint">{t('auth.forgotIdentifierHint')}</p>
            </div>
            <AuthCtaButton loading={loading} busyLabel={t('auth.sending')}>
              {t('auth.sendOtp')}
            </AuthCtaButton>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleReset} noValidate>
            <div>
              <label htmlFor="forgot-code" className="auth-label">
                {t('auth.otpCode')}
                <RequiredMark />
              </label>
              <input
                id="forgot-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.trim());
                  clearFieldError(setFieldErrors, 'code');
                }}
                className={fc('code')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'code')} className="text-sm text-rose-300" />
            </div>
            <div>
              <label htmlFor="forgot-password" className="auth-label">
                {t('auth.newPassword')}
                <RequiredMark />
              </label>
              <input
                id="forgot-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError(setFieldErrors, 'password');
                }}
                className={fc('password')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'password')} className="text-sm text-rose-300" />
            </div>
            <div>
              <label htmlFor="forgot-confirm" className="auth-label">
                {t('auth.confirmPassword')}
                <RequiredMark />
              </label>
              <input
                id="forgot-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  clearFieldError(setFieldErrors, 'confirmPassword');
                }}
                className={fc('confirmPassword')}
              />
              <FieldError
                message={fieldErrorMessage(fieldErrors, 'confirmPassword')}
                className="text-sm text-rose-300"
              />
            </div>
            <AuthCtaButton
              loading={loading}
              disabled={!sessionId}
              busyLabel={t('auth.saving')}
            >
              {t('auth.updatePassword')}
            </AuthCtaButton>
            <p className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('username');
                  setCode('');
                  setPassword('');
                  setConfirm('');
                  setMessage('');
                  setError('');
                  clearAllFieldErrors(setFieldErrors);
                }}
                className="auth-text-btn"
              >
                {t('auth.resendOtp')}
              </button>
            </p>
          </form>
        )}

        <div className="space-y-3 rounded-2xl border border-white/[0.1] bg-white/[0.04] p-4">
          <p>
            <button
              type="button"
              onClick={() => setShowSupportOption((show) => !show)}
              className="auth-text-btn"
            >
              {t('auth.tryOtherOption')}
            </button>
          </p>
          {showSupportOption && (
            <div className="space-y-2 text-sm text-white/50">
              <p className="font-semibold tracking-tight text-white/85">{t('auth.supportResetTitle')}</p>
              <p>{t('auth.supportResetBody')}</p>
              <p>{t('auth.supportResetAfter')}</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-white/55">
          <Link to="/login" className="auth-link">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </AuthFormShell>
    </AuthScreen>
  );
}
