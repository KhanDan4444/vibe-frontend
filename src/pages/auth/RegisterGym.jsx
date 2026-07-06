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

  const inputClass =
    'mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900/40 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none dark:border-app-border dark:bg-app-input dark:text-app-text-strong sm:text-sm';
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-900 dark:bg-app-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="safe-top safe-bottom flex min-h-[100dvh] items-center justify-center bg-slate-900 px-4 dark:bg-app-bg">
        <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center dark:border-app-border-subtle dark:bg-app-raised">
          <p className="text-slate-300 dark:text-app-text">{t('auth.signupUnavailable')}</p>
          <Link to="/login" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">
            {t('auth.backToSignIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-top safe-bottom flex min-h-[100dvh] items-center justify-center bg-slate-900 px-4 py-8 dark:bg-app-bg">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-xl dark:border-app-border-subtle dark:bg-app-raised sm:p-8">
        <div>
          <h2 className="text-center text-2xl font-bold text-white dark:text-app-text-strong">
            {t('auth.signupTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400 dark:text-app-muted">{t('auth.signupSubtitle')}</p>
        </div>

        {bannerError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">{bannerError}</div>
        )}
        {message && step === 'details' && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            {message}
            {import.meta.env.DEV && (
              <p className="mt-2 text-xs text-slate-400">{t('auth.otpDevHint')}</p>
            )}
          </div>
        )}

        {step === 'phone' ? (
          <form className="space-y-4" onSubmit={handleRequestOtp}>
            <div>
              <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                {t('auth.ownerPhone')} *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError(setFieldErrors, 'phone');
                }}
                className={fc('phone')}
                placeholder={t('auth.phonePlaceholder')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
              <p className="mt-1 text-xs text-slate-500 dark:text-app-muted">{t('auth.signupPhoneHint')}</p>
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
          <form className="space-y-4" onSubmit={handleComplete}>
            <div>
              <label className="block text-sm font-medium text-slate-300 dark:text-app-text">{t('auth.otpCode')} *</label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.trim());
                  clearFieldError(setFieldErrors, 'code');
                }}
                className={fc('code')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'code')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                  {t('modals.registerGym.gymName')} *
                </label>
                <input type="text" required value={gymName} onChange={(e) => { setGymName(e.target.value); clearFieldError(setFieldErrors, 'gymName'); }} className={fc('gymName')} />
                <FieldError message={fieldErrorMessage(fieldErrors, 'gymName')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                  {t('modals.registerGym.ownerName')} *
                </label>
                <input type="text" required value={ownerName} onChange={(e) => { setOwnerName(e.target.value); clearFieldError(setFieldErrors, 'ownerName'); }} className={fc('ownerName')} />
                <FieldError message={fieldErrorMessage(fieldErrors, 'ownerName')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                  {t('modals.registerGym.username')} *
                </label>
                <input
                  type="text"
                  required
                  pattern="[a-z0-9._]{3,30}"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.toLowerCase()); clearFieldError(setFieldErrors, 'username'); }}
                  className={fc('username')}
                />
                <FieldError message={fieldErrorMessage(fieldErrors, 'username')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                  {t('auth.email')} ({t('account.optional')})
                </label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearFieldError(setFieldErrors, 'email'); }} className={fc('email')} />
                <FieldError message={fieldErrorMessage(fieldErrors, 'email')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-app-text">{t('table.plan')} *</label>
                <select
                  required
                  value={saasPlanId}
                  onChange={(e) => { setSaasPlanId(e.target.value); clearFieldError(setFieldErrors, 'saasPlanId'); }}
                  className={fc('saasPlanId')}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${Number(p.price).toLocaleString()} / {p.duration}mo
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrorMessage(fieldErrors, 'saasPlanId')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-app-text">{t('auth.password')} *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError(setFieldErrors, 'password'); }}
                  className={fc('password')}
                />
                <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-app-text">
                  {t('auth.confirmPassword')} *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); clearFieldError(setFieldErrors, 'confirmPassword'); }}
                  className={fc('confirmPassword')}
                />
                <FieldError message={fieldErrorMessage(fieldErrors, 'confirmPassword')} />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-app-muted">{t('auth.signupPaymentNote')}</p>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? t('auth.processing') : t('auth.createGymAccount')}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-400">
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
