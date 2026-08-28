import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestGymSignupOtp, completeGymSignup } from '../../services/authService';
import {
  validateRequiredEthiopianPhone,
  validateGymSignupGymStep,
  validateGymSignupAccountStep,
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
import { formatDisplayDate } from '../../utils/date';
import { useOtpResendCooldown } from '../../hooks/useOtpResendCooldown';

const STEPS = ['phone', 'gym', 'account'];
const SIGNUP_TRIAL_DAYS = 30;

export default function RegisterGym() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState('phone');
  const [sessionId, setSessionId] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [gymName, setGymName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLengthRule, setShowLengthRule] = useState(false);
  const [showMatchRule, setShowMatchRule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [registerDone, setRegisterDone] = useState(null);
  const { cooldown, startCooldown, canResend } = useOtpResendCooldown();
  const otpRequestInFlight = useRef(false);

  const inputClass = 'auth-field';
  const fc = (field) => fieldInputClass(inputClass, fieldErrors, field);
  const bannerError = error && !Object.keys(fieldErrors).length ? error : '';
  const lengthOk = password.length >= 8;
  const matchOk = confirm.length > 0 && confirm === password;
  const stepIndex = Math.max(0, STEPS.indexOf(step));

  const stepSubtitle =
    step === 'phone'
      ? t('auth.signupStepVerify')
      : step === 'gym'
        ? t('auth.signupStepGym')
        : t('auth.signupStepAccount');

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (otpRequestInFlight.current || loading) return;
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validateRequiredEthiopianPhone(phone), setError, t, { setFieldErrors })) return;
    otpRequestInFlight.current = true;
    setLoading(true);
    try {
      const data = await requestGymSignupOtp(phone);
      setSessionId(data.sessionId);
      setVerifiedPhone(normalizeEthiopianPhone(phone.trim()) || phone.trim());
      startCooldown();
      setStep('gym');
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
    clearAllFieldErrors(setFieldErrors);
    otpRequestInFlight.current = true;
    setResendLoading(true);
    try {
      const data = await requestGymSignupOtp(phone);
      setSessionId(data.sessionId);
      setVerifiedPhone(normalizeEthiopianPhone(phone.trim()) || phone.trim());
      startCooldown();
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      otpRequestInFlight.current = false;
      setResendLoading(false);
    }
  };

  const handleGymContinue = (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (
      !showValidationError(validateGymSignupGymStep({ code, gymName, city, address }), setError, t, {
        setFieldErrors,
      })
    ) {
      return;
    }
    setStep('account');
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (
      !showValidationError(
        validateGymSignupAccountStep({ ownerName, username, email, password, confirm }),
        setError,
        t,
        { setFieldErrors }
      )
    ) {
      return;
    }
    if (
      !showValidationError(validateGymSignupGymStep({ code, gymName, city, address }), setError, t, {
        setFieldErrors,
      })
    ) {
      setStep('gym');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        sessionId,
        code: code.trim(),
        gym_name: gymName.trim(),
        city: city.trim(),
        owner_name: ownerName.trim(),
        username: username.trim().toLowerCase(),
        password,
        phone: verifiedPhone || normalizeEthiopianPhone(phone.trim()) || phone.trim(),
      };
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail) payload.email = trimmedEmail;
      const trimmedAddress = address.trim();
      if (trimmedAddress) payload.address = trimmedAddress;

      const data = await completeGymSignup(payload);
      const trialDays = data.subscription?.trial_days ?? SIGNUP_TRIAL_DAYS;
      setRegisterDone({
        gymName: gymName.trim(),
        username: username.trim().toLowerCase(),
        phone: normalizeEthiopianPhone(phone.trim()) || phone.trim(),
        trialEndDate: data.subscription?.end_date,
        trialDays,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (registerDone) {
    const rows = [
      { label: t('auth.accountUsername'), value: `@${registerDone.username}` },
      registerDone.phone ? { label: t('auth.accountPhone'), value: registerDone.phone } : null,
      registerDone.trialEndDate
        ? {
            label: t('auth.accountTrialEnds'),
            value: formatDisplayDate(registerDone.trialEndDate),
          }
        : null,
    ].filter(Boolean);

    return (
      <AuthScreen>
        <AuthFormShell>
          <AuthSuccessPanel
            title={t('auth.successAllSet')}
            hero={registerDone.gymName}
            body={t('auth.signupSuccessBody')}
            rows={rows}
            hint={t('auth.signupSuccessHint', { days: registerDone.trialDays ?? SIGNUP_TRIAL_DAYS })}
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
          <AuthStepDots activeIndex={stepIndex} steps={3} />
          <div>
            <h2 className="auth-title">{t('auth.signupTitle')}</h2>
            <p className="auth-subtitle">{stepSubtitle}</p>
          </div>
        </div>

        {bannerError && (
          <div className="auth-banner-error" role="alert">
            {bannerError}
          </div>
        )}

        {step === 'phone' && (
          <form className="space-y-5" onSubmit={handleRequestOtp} noValidate>
            <div>
              <label htmlFor="signup-phone" className="auth-label">
                {t('auth.ownerPhone')}
                <RequiredMark />
              </label>
              <input
                id="signup-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError(setFieldErrors, 'phone');
                }}
                className={fc('phone')}
                placeholder={t('auth.phonePlaceholder')}
                aria-invalid={Boolean(fieldErrorMessage(fieldErrors, 'phone'))}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} className="text-sm text-rose-300" />
              <p className="auth-hint">{t('auth.signupPhoneHint')}</p>
            </div>
            <p className="auth-hint">{t('auth.signupTrialNote', { days: SIGNUP_TRIAL_DAYS })}</p>
            <AuthCtaButton loading={loading} busyLabel={t('auth.sending')}>
              {t('auth.sendOtp')}
            </AuthCtaButton>
          </form>
        )}

        {step === 'gym' && (
          <form className="space-y-5" onSubmit={handleGymContinue} noValidate>
            <AuthOtpField
              id="signup-code"
              label={t('auth.otpCode')}
              phone={verifiedPhone || phone}
              value={code}
              onChange={(next) => {
                setCode(next);
                clearFieldError(setFieldErrors, 'code');
              }}
              inputClassName={fc('code')}
              hasFieldError={Boolean(fieldErrorMessage(fieldErrors, 'code'))}
              fieldError={fieldErrorMessage(fieldErrors, 'code')}
              placeholder={undefined}
              devHint={import.meta.env.DEV ? t('auth.otpDevHint') : undefined}
              cooldown={cooldown}
              canResend={canResend}
              resendLoading={resendLoading}
              onResend={handleResendOtp}
              onChangePhone={() => {
                setStep('phone');
                setCode('');
                setError('');
                clearAllFieldErrors(setFieldErrors);
              }}
              changePhoneLabel={t('auth.changePhone')}
            />

            <hr className="auth-form-step-divider" />
            <p className="auth-section-title">{t('auth.signupSectionGym')}</p>

            <div>
              <label htmlFor="signup-gym" className="auth-label">
                {t('modals.registerGym.gymName')}
                <RequiredMark />
              </label>
              <input
                id="signup-gym"
                type="text"
                value={gymName}
                onChange={(e) => {
                  setGymName(e.target.value);
                  clearFieldError(setFieldErrors, 'gymName');
                }}
                className={fc('gymName')}
                placeholder={t('modals.registerGym.gymNamePlaceholder')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'gymName')} className="text-sm text-rose-300" />
            </div>
            <div>
              <label htmlFor="signup-city" className="auth-label">
                {t('modals.registerGym.gymCity')}
                <RequiredMark />
              </label>
              <input
                id="signup-city"
                type="text"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  clearFieldError(setFieldErrors, 'city');
                }}
                className={fc('city')}
                placeholder={t('modals.registerGym.gymCityPlaceholder')}
                aria-invalid={Boolean(fieldErrorMessage(fieldErrors, 'city'))}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'city')} className="text-sm text-rose-300" />
            </div>
            <div>
              <label htmlFor="signup-address" className="auth-label">
                {t('modals.registerGym.gymAddress')} ({t('account.optional')})
              </label>
              <input
                id="signup-address"
                type="text"
                autoComplete="street-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  clearFieldError(setFieldErrors, 'address');
                }}
                className={fc('address')}
                placeholder={t('modals.registerGym.gymAddressPlaceholder')}
                aria-invalid={Boolean(fieldErrorMessage(fieldErrors, 'address'))}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'address')} className="text-sm text-rose-300" />
            </div>
            <p className="auth-hint">{t('auth.signupTrialNote', { days: SIGNUP_TRIAL_DAYS })}</p>
            <button type="submit" className="auth-cta-btn">
              {t('common.continue')}
            </button>
          </form>
        )}

        {step === 'account' && (
          <form className="space-y-5" onSubmit={handleComplete} noValidate>
            <div>
              <label htmlFor="signup-owner" className="auth-label">
                {t('modals.registerGym.ownerName')}
                <RequiredMark />
              </label>
              <input
                id="signup-owner"
                type="text"
                autoComplete="name"
                value={ownerName}
                onChange={(e) => {
                  setOwnerName(e.target.value);
                  clearFieldError(setFieldErrors, 'ownerName');
                }}
                className={fc('ownerName')}
                placeholder={t('modals.registerGym.ownerNamePlaceholder')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'ownerName')} className="text-sm text-rose-300" />
            </div>
            <div>
              <label htmlFor="signup-username" className="auth-label">
                {t('modals.registerGym.username')}
                <RequiredMark />
              </label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  clearFieldError(setFieldErrors, 'username');
                }}
                className={fc('username')}
                placeholder={t('modals.registerGym.usernamePlaceholder')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'username')} className="text-sm text-rose-300" />
            </div>
            <div>
              <label htmlFor="signup-email" className="auth-label">
                {t('auth.email')} ({t('account.optional')})
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError(setFieldErrors, 'email');
                }}
                className={fc('email')}
                placeholder={t('modals.registerGym.emailPlaceholder')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'email')} className="text-sm text-rose-300" />
            </div>
            <div>
              <label htmlFor="signup-password" className="auth-label">
                {t('auth.password')}
                <RequiredMark />
              </label>
              <input
                id="signup-password"
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
                placeholder={t('modals.registerGym.passwordPlaceholder')}
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
              <label htmlFor="signup-confirm" className="auth-label">
                {t('auth.confirmPassword')}
                <RequiredMark />
              </label>
              <input
                id="signup-confirm"
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
                placeholder={t('modals.registerGym.confirmPasswordPlaceholder')}
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
            <p className="auth-hint">{t('auth.signupTrialNote', { days: SIGNUP_TRIAL_DAYS })}</p>
            <AuthCtaButton loading={loading} busyLabel={t('auth.processing')}>
              {t('auth.createGymAccount')}
            </AuthCtaButton>
            <p className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('gym');
                  setError('');
                  clearAllFieldErrors(setFieldErrors);
                }}
                className="auth-text-btn"
              >
                {t('common.back')}
              </button>
            </p>
          </form>
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
