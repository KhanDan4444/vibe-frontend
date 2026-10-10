import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestGymSignupOtp, verifyGymSignupOtp, completeGymSignup } from '../../services/authService';
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
import EthiopianPhoneField from '../../components/EthiopianPhoneField';
import AuthScreen from '../../components/auth/AuthScreen';
import AuthFormShell, { AuthStepDots } from '../../components/auth/AuthFormShell';
import AuthSuccessPanel from '../../components/auth/AuthSuccessPanel';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import AuthOtpField from '../../components/auth/AuthOtpField';
import PasswordRule from '../../components/auth/PasswordRule';
import { formatDisplayDate } from '../../utils/date';
import { useOtpResendCooldown } from '../../hooks/useOtpResendCooldown';
import { clearLocalStorageDraft, useLocalStorageDraft } from '../../utils/useLocalStorageDraft';

const STEPS = ['phone', 'gym', 'account'];
const SIGNUP_STEP_LABEL_KEYS = ['auth.signupStepVerify', 'auth.signupStepGym', 'auth.signupStepAccount'];
const REGISTER_GYM_DRAFT_KEY = 'vibe.draft.register-gym';

function isRegisterGymDraft(raw) {
  return (
    raw &&
    typeof raw === 'object' &&
    (raw.step === 'phone' || raw.step === 'gym' || raw.step === 'account') &&
    typeof raw.phone === 'string' &&
    typeof raw.gymName === 'string'
  );
}

function registerGymDraftIsDirty(draft) {
  return Boolean(
    draft.phone?.trim() ||
      draft.verifiedPhone?.trim() ||
      draft.gymName?.trim() ||
      draft.city?.trim() ||
      draft.address?.trim() ||
      draft.ownerName?.trim() ||
      draft.username?.trim() ||
      draft.email?.trim() ||
      draft.otpVerified ||
      draft.step !== 'phone'
  );
}

function formatSignupLocation(city, address) {
  const cityLabel = city?.trim();
  const addressLabel = address?.trim();
  if (cityLabel && addressLabel) return `${cityLabel}, ${addressLabel}`;
  return cityLabel || addressLabel || '';
}

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
  const [otpVerified, setOtpVerified] = useState(false);
  const [registerDone, setRegisterDone] = useState(null);
  const { cooldown, startCooldown, canResend } = useOtpResendCooldown();
  const otpRequestInFlight = useRef(false);

  const registerDraft = useMemo(
    () => ({
      step,
      phone,
      verifiedPhone,
      sessionId,
      otpVerified,
      gymName,
      city,
      address,
      ownerName,
      username,
      email,
    }),
    [
      step,
      phone,
      verifiedPhone,
      sessionId,
      otpVerified,
      gymName,
      city,
      address,
      ownerName,
      username,
      email,
    ]
  );

  const applyRegisterDraft = useCallback((next) => {
    setStep(next.step);
    setPhone(next.phone || '');
    setVerifiedPhone(next.verifiedPhone || '');
    setSessionId(next.sessionId || '');
    setOtpVerified(Boolean(next.otpVerified));
    setGymName(next.gymName || '');
    setCity(next.city || '');
    setAddress(next.address || '');
    setOwnerName(next.ownerName || '');
    setUsername(next.username || '');
    setEmail(next.email || '');
  }, []);

  useLocalStorageDraft({
    key: REGISTER_GYM_DRAFT_KEY,
    enabled: !registerDone,
    value: registerDraft,
    isDirty: registerGymDraftIsDirty,
    isValid: isRegisterGymDraft,
    apply: applyRegisterDraft,
  });

  const inputClass = 'auth-field';
  const fc = (field) => fieldInputClass(inputClass, fieldErrors, field);
  const bannerError = error && !Object.keys(fieldErrors).length ? error : '';
  const lengthOk = password.length >= 8;
  const matchOk = confirm.length > 0 && confirm === password;
  const stepIndex = Math.max(0, STEPS.indexOf(step));

  const signupStepLabels = SIGNUP_STEP_LABEL_KEYS.map((key) => t(key));
  const stepSubtitle = signupStepLabels[stepIndex] || signupStepLabels[0];

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
      setOtpVerified(false);
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
      setOtpVerified(false);
    } catch (err) {
      setError(err.message);
    } finally {
      otpRequestInFlight.current = false;
      setResendLoading(false);
    }
  };

  const handleGymContinue = async (e) => {
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
    const phoneForSession = verifiedPhone || normalizeEthiopianPhone(phone.trim()) || phone.trim();
    setLoading(true);
    try {
      await verifyGymSignupOtp({ sessionId, code, phone: phoneForSession });
      setOtpVerified(true);
      setStep('account');
    } catch (err) {
      setOtpVerified(false);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (
      !showValidationError(validateGymSignupAccountStep({ ownerName, username, email, password, confirm }), setError, t, {
        setFieldErrors,
      })
    ) {
      return;
    }
    if (!otpVerified) {
      if (
        !showValidationError(validateGymSignupGymStep({ code, gymName, city, address }), setError, t, {
          setFieldErrors,
        })
      ) {
        setStep('gym');
        return;
      }
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
      clearLocalStorageDraft(REGISTER_GYM_DRAFT_KEY);
      setRegisterDone({
        gymName: gymName.trim(),
        username: username.trim().toLowerCase(),
        ownerName: ownerName.trim(),
        location: formatSignupLocation(city, address),
        phone: normalizeEthiopianPhone(phone.trim()) || phone.trim(),
        email: trimmedEmail || undefined,
        planName: data.subscription?.plan_name,
        endDate: data.subscription?.end_date,
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
      registerDone.ownerName ? { label: t('auth.accountOwnerName'), value: registerDone.ownerName } : null,
      registerDone.phone ? { label: t('auth.accountPhone'), value: registerDone.phone } : null,
      registerDone.email ? { label: t('auth.accountEmail'), value: registerDone.email } : null,
      registerDone.location ? { label: t('auth.accountLocation'), value: registerDone.location } : null,
      registerDone.planName ? { label: t('auth.accountPlan'), value: registerDone.planName } : null,
      registerDone.endDate
        ? {
            label: t('auth.accountAccessUntil'),
            value: formatDisplayDate(registerDone.endDate),
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
            hint={t('auth.signupSuccessHint')}
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
            activeIndex={stepIndex}
            steps={STEPS.length}
            stepLabels={signupStepLabels}
            progressLabel={t('auth.signupStepProgress', { current: stepIndex + 1, total: STEPS.length })}
          />
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
              <EthiopianPhoneField
                id="signup-phone"
                name="tel"
                variant="auth"
                value={phone}
                error={Boolean(fieldErrorMessage(fieldErrors, 'phone'))}
                onChange={(next) => {
                  setPhone(next);
                  clearFieldError(setFieldErrors, 'phone');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} className="text-sm text-rose-300" />
              <p className="auth-hint">{t('auth.signupPhoneHint')}</p>
            </div>
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
                setOtpVerified(false);
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
                setOtpVerified(false);
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
                name="organization"
                type="text"
                autoComplete="organization"
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
                name="address-level2"
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
                name="street-address"
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
            <AuthCtaButton loading={loading} busyLabel={t('auth.verifying')}>
              {t('common.continue')}
            </AuthCtaButton>
          </form>
        )}

        {step === 'account' && (
          <form className="space-y-5" onSubmit={handleComplete} noValidate>
            <hr className="auth-form-step-divider" />
            <p className="auth-section-title">{t('auth.signupSectionAccount')}</p>

            <div>
              <label htmlFor="signup-owner" className="auth-label">
                {t('modals.registerGym.ownerName')}
                <RequiredMark />
              </label>
              <input
                id="signup-owner"
                name="name"
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
                name="username"
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
              <p className="auth-hint">{t('auth.signupUsernameHint')}</p>
            </div>
            <div>
              <label htmlFor="signup-email" className="auth-label">
                {t('auth.email')} ({t('account.optional')})
              </label>
              <input
                id="signup-email"
                name="email"
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
              <p className="auth-hint">{t('auth.signupEmailHint')}</p>
            </div>
            <div>
              <label htmlFor="signup-password" className="auth-label">
                {t('auth.password')}
                <RequiredMark />
              </label>
              <input
                id="signup-password"
                name="new-password"
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
                name="new-password-confirm"
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
            <AuthCtaButton loading={loading} busyLabel={t('auth.processing')}>
              {t('auth.createGymAccount')}
            </AuthCtaButton>
            <p className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('gym');
                  setOtpVerified(false);
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
