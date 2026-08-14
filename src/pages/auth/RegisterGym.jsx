import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getPublicSaasPlans,
  requestGymSignupOtp,
  completeGymSignup,
} from '../../services/authService';
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
import AuthSelect from '../../components/auth/AuthSelect';
import AuthSuccessPanel from '../../components/auth/AuthSuccessPanel';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import PasswordRule from '../../components/auth/PasswordRule';
import { formatMoney } from '../../utils/formatMoney';

const STEPS = ['phone', 'gym', 'account'];

export default function RegisterGym() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState('phone');
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saasPlanId, setSaasPlanId] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLengthRule, setShowLengthRule] = useState(false);
  const [showMatchRule, setShowMatchRule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [registerDone, setRegisterDone] = useState(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getPublicSaasPlans();
        if (!cancelled) {
          setPlans(list);
          if (list.length > 0) setSaasPlanId(String(list[0].id));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validateRequiredEthiopianPhone(phone), setError, t, { setFieldErrors })) return;
    setLoading(true);
    try {
      const data = await requestGymSignupOtp(phone);
      setSessionId(data.sessionId);
      setMessage(data.message || t('auth.otpSent'));
      setStep('gym');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGymContinue = (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (
      !showValidationError(validateGymSignupGymStep({ code, gymName, saasPlanId }), setError, t, {
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
      !showValidationError(validateGymSignupGymStep({ code, gymName, saasPlanId }), setError, t, {
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
        owner_name: ownerName.trim(),
        username: username.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        saas_plan_id: parseInt(saasPlanId, 10),
      };
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail) payload.email = trimmedEmail;

      await completeGymSignup(payload);
      const planName = plans.find((p) => String(p.id) === saasPlanId)?.name;
      setRegisterDone({
        gymName: gymName.trim(),
        username: username.trim().toLowerCase(),
        phone: normalizeEthiopianPhone(phone.trim()) || phone.trim(),
        planName,
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
      registerDone.planName ? { label: t('auth.accountPlan'), value: registerDone.planName } : null,
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

  if (plansLoading) {
    return (
      <AuthScreen>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0f766e] border-t-transparent" />
        </div>
      </AuthScreen>
    );
  }

  if (plans.length === 0) {
    return (
      <AuthScreen>
        <AuthFormShell>
          <p className="text-center text-sm text-white/75">{t('auth.signupUnavailable')}</p>
          <p className="text-center">
            <Link to="/login" className="auth-link">
              {t('auth.backToSignIn')}
            </Link>
          </p>
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
        {message && step === 'gym' && (
          <div className="auth-banner-success" role="status">
            {message}
            {import.meta.env.DEV && <p className="auth-hint mt-2">{t('auth.otpDevHint')}</p>}
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
            <AuthCtaButton loading={loading} busyLabel={t('auth.sending')}>
              {t('auth.sendOtp')}
            </AuthCtaButton>
          </form>
        )}

        {step === 'gym' && (
          <form className="space-y-5" onSubmit={handleGymContinue} noValidate>
            <div>
              <label htmlFor="signup-code" className="auth-label">
                {t('auth.otpCode')}
                <RequiredMark />
              </label>
              <input
                id="signup-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.trim());
                  clearFieldError(setFieldErrors, 'code');
                }}
                className={fc('code')}
                placeholder={t('modals.registerGym.otpPlaceholder')}
                aria-invalid={Boolean(fieldErrorMessage(fieldErrors, 'code'))}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'code')} className="text-sm text-rose-300" />
            </div>
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
              <label htmlFor="signup-plan" className="auth-label">
                {t('table.plan')}
                <RequiredMark />
              </label>
              <AuthSelect
                id="signup-plan"
                value={saasPlanId}
                onChange={(next) => {
                  setSaasPlanId(next);
                  clearFieldError(setFieldErrors, 'saasPlanId');
                }}
                options={plans.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} — ${formatMoney(p.price)} / ${p.duration}mo`,
                }))}
                error={Boolean(fieldErrorMessage(fieldErrors, 'saasPlanId'))}
                aria-invalid={Boolean(fieldErrorMessage(fieldErrors, 'saasPlanId'))}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'saasPlanId')} className="text-sm text-rose-300" />
            </div>
            <button type="submit" className="auth-cta-btn">
              {t('common.continue')}
            </button>
            <p className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                  setMessage('');
                  clearAllFieldErrors(setFieldErrors);
                }}
                className="auth-text-btn"
              >
                {t('auth.resendOtp')}
              </button>
            </p>
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
            <p className="auth-hint">{t('auth.signupPaymentNote')}</p>
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
