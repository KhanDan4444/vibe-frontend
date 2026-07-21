// src/pages/auth/Login.jsx (Asynchronous Sync & Environment Guarded)
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getRememberMePreference } from '../../utils/authStorage';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { isPlatformAdmin, hasGymPortalAccess } from '../../utils/roles';
import AuthHeroBackground from '../../components/auth/AuthHeroBackground';
import LoginBrandPanel from '../../components/auth/LoginBrandPanel';
import {
  validateLogin,
  showValidationError,
  mutationErrorState,
  inputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
} from '../../utils/validation';
import FieldError from '../../components/FieldError';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const inputBase =
    'mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:border-teal-600 focus:outline-none dark:focus:border-brand border-slate-300 bg-white text-slate-900 placeholder-slate-400 caret-slate-900 dark:border-app-border dark:bg-app-input dark:text-app-text-strong dark:placeholder-app-muted dark:caret-app-text-strong';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validateLogin(email, password), setError, t, { setFieldErrors })) return;
    setLoading(true);

    try {
      const profile = await login(email.trim(), password, rememberMe);

      if (isPlatformAdmin(profile?.role)) {
        navigate('/admin/dashboard', { replace: true });
      } else if (hasGymPortalAccess(profile?.role)) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const next = mutationErrorState(err, { email: 'email' });
      setError(next.error);
      setFieldErrors(next.fieldErrors);
    } finally {
      setLoading(false);
    }
  };

  const formCard = (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 dark:border-app-border-subtle dark:bg-app-raised sm:p-8 lg:max-w-[420px]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-teal-600 dark:bg-brand" />

      <div className="lg:hidden">
        <LoginBrandPanel variant="compact" />
        <p className="mb-6 text-center text-sm text-slate-500 dark:text-app-muted">{t('auth.signInSubtitle')}</p>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-400">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-app-text">{t('auth.emailOrUsername')}</label>
            <input
              id="login-email"
              type="text"
              required
              autoComplete="username"
              className={inputClass(inputBase, fieldErrors, 'email')}
              placeholder={t('auth.emailOrUsernamePlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError(setFieldErrors, 'email');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'email')} />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-app-text">{t('auth.password')}</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              className={inputClass(inputBase, fieldErrors, 'password')}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError(setFieldErrors, 'password');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="login-remember" className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-app-text">
              <input
                id="login-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 bg-white text-teal-700 focus:ring-teal-600 dark:border-app-border dark:bg-app-input"
              />
              {t('auth.rememberMe')}
            </label>
            <Link to="/forgot-password" className="text-sm text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg bg-teal-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 dark:bg-brand dark:hover:bg-brand-hover dark:focus:ring-brand dark:focus:ring-offset-app-raised"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t('auth.processing')}
            </span>
          ) : (
            t('auth.signIn')
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-app-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register-gym" className="font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
          {t('auth.registerGymLink')}
        </Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-6 animate-pulse space-y-2 rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-xs text-slate-400">
          <p className="flex items-center gap-1 font-semibold text-slate-300">
            💡 Developer Quick-Access (Sandbox Active):
          </p>
          <p>• Gym Owner portal: Use <code className="font-mono text-teal-400">owner@gym.com</code> with password <code className="font-mono text-teal-400">password</code></p>
          <p>• Help Desk portal: Use <code className="font-mono text-teal-400">helpdesk@gym.com</code> with password <code className="font-mono text-teal-400">password</code></p>
          <p>• SaaS Admin portal: Use <code className="font-mono text-teal-400">admin@saas.com</code> with password <code className="font-mono text-teal-400">password</code></p>
        </div>
      )}
    </div>
  );

  return (
    <AuthHeroBackground>
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-[920px] flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <LoginBrandPanel variant="panel" />
          </div>
          <div className="flex w-full flex-1 justify-center lg:max-w-[420px] lg:justify-start">
            {formCard}
          </div>
        </div>
      </div>
    </AuthHeroBackground>
  );
}
