import React, { useRef, useState } from 'react';
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
  normalizeEthiopianPhone,
} from '../../utils/validation';
import FieldError from '../../components/FieldError';
import RequiredMark from '../../components/ui/RequiredMark';
import AuthScreen from '../../components/auth/AuthScreen';
import AuthFormShell, { AuthStepDots } from '../../components/auth/AuthFormShell';
import AuthSuccessPanel from '../../components/auth/AuthSuccessPanel';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import AuthOtpField from '../../components/auth/AuthOtpField';
import PasswordRule from '../../components/auth/PasswordRule';
import { useOtpResendCooldown } from '../../hooks/useOtpResendCooldown';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState('username');
  const [identifier, setIdentifier] = useState('');
  const [otpDestinationPhone, setOtpDestinationPhone] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLengthRule, setShowLengthRule] = useState(false);
  const [showMatchRule, setShowMatchRule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showSupportOption, setShowSupportOption] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const { cooldown, startCooldown, canResend } = useOtpResendCooldown();
  const otpRequestInFlight = useRef(false);

  const inputClass = 'auth-field';
  const fc = (field) => fieldInputClass(inputClass, fieldErrors, field);
  const bannerError = error && !Object.keys(fieldErrors).length ? error : '';
  const onReset = step === 'reset';
  const lengthOk = password.length >= 8;
  const matchOk = confirm.length > 0 && confirm === password;
  const stepSubtitle = onReset ? t('auth.forgotResetSubtitle') : t('auth.forgotSubtitle');

  const resetToIdentifier = () => {
    setStep('username');
    setCode('');
    setPassword('');
    setConfirm('');
    setError('');
    setOtpDestinationPhone('');
    setShowLengthRule(false);
    setShowMatchRule(false);
    clearAllFieldErrors(setFieldErrors);
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (otpRequestInFlight.current || loading) return;
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validateForgotIdentifier(identifier), setError, t, { setFieldErrors })) return;
    otpRequestInFlight.current = true;
    setLoading(true);
    try {
      const data = await requestForgotPasswordOtp(identifier);
      setSessionId(data.sessionId);
      setOtpDestinationPhone(normalizeEthiopianPhone(identifier.trim()) || '');
      setStep('reset');
      startCooldown();
    } catch (err) {
      setError(err.message);
    } finally {
      otpRequestInFlight.current = false;
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resendLoading || loading || otpRequestInFlight.current) return;
    setError('');
    clearFieldError(setFieldErrors, 'code');
    otpRequestInFlight.current = true;
    setResendLoading(true);
    try {
      const data = await requestForgotPasswordOtp(identifier);
      setSessionId(data.sessionId);
      setOtpDestinationPhone(normalizeEthiopianPhone(identifier.trim()) || '');
      startCooldown();
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      otpRequestInFlight.current = false;
      setResendLoading(false);
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
      setResetDone(true);
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
          <AuthStepDots
            activeIndex={onReset ? 1 : 0}
            stepLabels={[t('auth.forgotStepRequest'), t('auth.forgotStepReset')]}
            progressLabel={t('auth.forgotStepProgress', { current: onReset ? 2 : 1, total: 2 })}
          />
          <div>
            <h2 className="auth-title">{t('auth.forgotTitle')}</h2>
            <p className="auth-subtitle">{stepSubtitle}</p>
          </div>
        </div>

        {bannerError && (
          <div className="auth-banner-error" role="alert">
            {bannerError}
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
            <AuthOtpField
              id="forgot-code"
              label={t('auth.otpCode')}
              phone={otpDestinationPhone}
              destinationFallback={t('auth.otpSentRegisteredPhone')}
              value={code}
              onChange={(next) => {
                setCode(next);
                clearFieldError(setFieldErrors, 'code');
              }}
              inputClassName={fc('code')}
              hasFieldError={Boolean(fieldErrorMessage(fieldErrors, 'code'))}
              fieldError={fieldErrorMessage(fieldErrors, 'code')}
              devHint={import.meta.env.DEV ? t('auth.otpDevHint') : undefined}
              cooldown={cooldown}
              canResend={canResend}
              resendLoading={resendLoading}
              onResend={handleResendOtp}
              onChangePhone={resetToIdentifier}
              changePhoneLabel={t('auth.forgotChangeIdentifier')}
            />

            <hr className="auth-form-step-divider" />
            <p className="auth-section-title">{t('auth.forgotPasswordSection')}</p>

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
                onFocus={() => setShowLengthRule(true)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setShowLengthRule(true);
                  clearFieldError(setFieldErrors, 'password');
                }}
                className={fc('password')}
              />
              <PasswordRule
                variant="auth"
                show={showLengthRule || password.length > 0}
                ok={lengthOk}
                label={t('account.passwordMin8')}
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
                onFocus={() => setShowMatchRule(true)}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setShowMatchRule(true);
                  clearFieldError(setFieldErrors, 'confirmPassword');
                }}
                className={fc('confirmPassword')}
              />
              <PasswordRule
                variant="auth"
                show={showMatchRule || confirm.length > 0}
                ok={matchOk}
                label={t('account.passwordsMatch')}
              />
              <FieldError
                message={fieldErrorMessage(fieldErrors, 'confirmPassword')}
                className="text-sm text-rose-300"
              />
            </div>
            <AuthCtaButton loading={loading} disabled={!sessionId} busyLabel={t('auth.saving')}>
              {t('auth.updatePassword')}
            </AuthCtaButton>
          </form>
        )}

        {showSupportOption ? (
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
            <p className="font-semibold tracking-tight text-white/85">{t('auth.supportResetTitle')}</p>
            <p>{t('auth.supportResetBody')}</p>
            <p>{t('auth.supportResetAfter')}</p>
            <p className="pt-1 text-xs text-white/40">{t('auth.forgotAdminHint')}</p>
            <p className="text-center pt-1">
              <button type="button" onClick={() => setShowSupportOption(false)} className="auth-text-btn">
                {t('common.close')}
              </button>
            </p>
          </div>
        ) : (
          <p className="text-center">
            <button type="button" onClick={() => setShowSupportOption(true)} className="auth-text-btn">
              {t('auth.tryOtherOption')}
            </button>
          </p>
        )}

        <p className="text-center text-sm text-white/55">
          <Link to="/login" className="auth-link">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </AuthFormShell>
    </AuthScreen>
  );
}
