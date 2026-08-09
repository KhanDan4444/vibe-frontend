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
  validateGymSignupDetails,
  validateOtpCode,
  showValidationError,
  inputClass as fieldInputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
} from '../../utils/validation';
import FieldError from '../../components/FieldError';
import RequiredMark from '../../components/ui/RequiredMark';
import AuthScreen from '../../components/auth/AuthScreen';
import AuthFormShell, { AuthStepDots } from '../../components/auth/AuthFormShell';
import { formatMoney } from '../../utils/formatMoney';

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const inputClass = 'auth-field';
  const fc = (field) => fieldInputClass(inputClass, fieldErrors, field);
  const bannerError = error && !Object.keys(fieldErrors).length ? error : '';

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
      setStep('details');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    const detailsResult = validateGymSignupDetails({
      gymName,
      ownerName,
      username,
      email,
      password,
      confirm,
      saasPlanId,
    });
    if (!showValidationError(detailsResult, setError, t, { setFieldErrors })) return;
    if (!showValidationError(validateOtpCode(code), setError, t, { setFieldErrors })) return;
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

      const data = await completeGymSignup(payload);
      navigate('/login', {
        replace: true,
        state: { message: data.message || t('auth.signupSuccess') },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (plansLoading) {
    return (
      <AuthScreen>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0f766e] border-t-transparent" />
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

  const onDetails = step === 'details';

  return (
    <AuthScreen>
      <AuthFormShell>
        <div className="space-y-3 text-center">
          <AuthStepDots activeIndex={onDetails ? 1 : 0} />
          <div>
            <h2 className="text-2xl font-bold text-white">{t('auth.signupTitle')}</h2>
            <p className="mt-2 text-sm text-white/55">
              {onDetails ? t('auth.signupStepDetails') : t('auth.signupStepVerify')}
            </p>
          </div>
        </div>

        {bannerError && (
          <div className="auth-banner-error" role="alert">
            {bannerError}
          </div>
        )}
        {message && onDetails && (
          <div className="auth-banner-success" role="status">
            {message}
            {import.meta.env.DEV && <p className="auth-hint mt-2">{t('auth.otpDevHint')}</p>}
          </div>
        )}

        {!onDetails ? (
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
            <button type="submit" disabled={loading} className="auth-cta-btn">
              {loading ? t('auth.sending') : t('auth.sendOtp')}
            </button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleComplete} noValidate>
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
                aria-invalid={Boolean(fieldErrorMessage(fieldErrors, 'code'))}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'code')} className="text-sm text-rose-300" />
            </div>

            <div className="space-y-4">
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
                />
                <FieldError message={fieldErrorMessage(fieldErrors, 'gymName')} className="text-sm text-rose-300" />
              </div>
              <div>
                <label htmlFor="signup-plan" className="auth-label">
                  {t('table.plan')}
                  <RequiredMark />
                </label>
                <select
                  id="signup-plan"
                  value={saasPlanId}
                  onChange={(e) => {
                    setSaasPlanId(e.target.value);
                    clearFieldError(setFieldErrors, 'saasPlanId');
                  }}
                  className={fc('saasPlanId')}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatMoney(p.price)} / {p.duration}mo
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrorMessage(fieldErrors, 'saasPlanId')} className="text-sm text-rose-300" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="auth-section-title">{t('auth.signupSectionAccount')}</p>
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError(setFieldErrors, 'password');
                  }}
                  className={fc('password')}
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
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    clearFieldError(setFieldErrors, 'confirmPassword');
                  }}
                  className={fc('confirmPassword')}
                />
                <FieldError message={fieldErrorMessage(fieldErrors, 'confirmPassword')} className="text-sm text-rose-300" />
              </div>
            </div>

            <p className="auth-hint">{t('auth.signupPaymentNote')}</p>
            <button type="submit" disabled={loading} className="auth-cta-btn">
              {loading ? t('auth.processing') : t('auth.createGymAccount')}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError('');
                clearAllFieldErrors(setFieldErrors);
              }}
              className="w-full text-center text-sm text-white/45 transition-colors hover:text-white/70"
            >
              {t('auth.resendOtp')}
            </button>
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
