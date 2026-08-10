// src/pages/auth/Login.jsx — cardless glass login matching mobile brand treatment
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRememberMePreference } from '../../utils/authStorage';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { isPlatformAdmin, hasGymPortalAccess } from '../../utils/roles';
import AuthScreen from '../../components/auth/AuthScreen';
import LoginBrandPanel from '../../components/auth/LoginBrandPanel';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import {
  validateLoginFields,
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
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const inputBase =
    'auth-login-input block w-full rounded-2xl border border-white/20 bg-white/[0.1] px-4 py-3.5 text-base text-white placeholder-white/40 caret-white shadow-none transition-[border-color,background-color,box-shadow] focus:border-teal-600/70 focus:bg-white/[0.14] focus:outline-none focus:ring-2 focus:ring-teal-700/35';

  const focusFirstInvalid = (errors) => {
    requestAnimationFrame(() => {
      if (errors.email) emailRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const failureKeys = validateLoginFields(email, password);
    if (Object.keys(failureKeys).length > 0) {
      const nextErrors = Object.fromEntries(
        Object.entries(failureKeys).map(([field, key]) => [field, t(key)])
      );
      setFieldErrors(nextErrors);
      focusFirstInvalid(nextErrors);
      return;
    }

    clearAllFieldErrors(setFieldErrors);
    setLoading(true);
    const startedAt = Date.now();

    try {
      const profile = await login(email.trim(), password, rememberMe);

      // Keep "Processing…" visible briefly so fast logins don’t flash past it.
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 500;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, minVisibleMs - elapsed);
        });
      }

      if (isPlatformAdmin(profile?.role)) {
        navigate('/admin/dashboard', { replace: true });
      } else if (hasGymPortalAccess(profile?.role)) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      // Leave loading true until this screen unmounts after navigation.
    } catch (err) {
      const next = mutationErrorState(err, { email: 'email' });
      setError(next.error);
      setFieldErrors(next.fieldErrors);
      focusFirstInvalid(next.fieldErrors);
      setLoading(false);
    }
  };

  const emailError = fieldErrorMessage(fieldErrors, 'email');
  const passwordError = fieldErrorMessage(fieldErrors, 'password');

  return (
    <AuthScreen hero>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="pointer-events-auto">
          <LanguageSwitcher tone="auth" />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500">
          <LoginBrandPanel />

          {successMessage && (
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-300">
              {successMessage}
            </div>
          )}

          {error && (
            <div
              className="mb-4 rounded-2xl border border-rose-400/35 bg-rose-500/15 p-4 text-sm font-medium text-rose-200"
              role="alert"
            >
              {error}
            </div>
          )}

          <form className="space-y-3" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="login-email" className="sr-only">
                {t('auth.emailOrUsername')}
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="text"
                autoComplete="username"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'login-email-error' : undefined}
                className={inputClass(inputBase, fieldErrors, 'email')}
                placeholder={t('auth.emailOrUsername')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError(setFieldErrors, 'email');
                }}
              />
              <FieldError id="login-email-error" message={emailError} className="text-sm text-rose-300" />
            </div>
            <div>
              <label htmlFor="login-password" className="sr-only">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'login-password-error' : undefined}
                  className={inputClass(`${inputBase} pr-12`, fieldErrors, 'password')}
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError(setFieldErrors, 'password');
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/45 transition-colors hover:text-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-700/40"
                  aria-label={showPassword ? t('modals.staff.hidePassword') : t('modals.staff.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FieldError id="login-password-error" message={passwordError} className="text-sm text-rose-300" />
            </div>

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <label htmlFor="login-remember" className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#0f766e] focus:ring-teal-700/40"
                />
                {t('auth.rememberMe')}
              </label>
              <Link to="/forgot-password" className="auth-link text-sm">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="mt-1 flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-2xl bg-[#0f766e] px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#0d9488] focus:outline-none focus:ring-2 focus:ring-teal-700/40 disabled:cursor-wait disabled:opacity-95"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      opacity="0.75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('auth.processing')}
                </span>
              ) : (
                t('auth.signIn')
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/70">
            {t('auth.noAccount')}{' '}
            <Link to="/register-gym" className="auth-link">
              {t('auth.registerGymLink')}
            </Link>
          </p>

          {import.meta.env.DEV && (
            <div className="mt-8 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/55">
              <p className="flex items-center gap-1 font-semibold text-white/80">
                Developer Quick-Access (Sandbox Active):
              </p>
              <p>
                • Gym Owner: <code className="font-mono text-teal-300">owner@gym.com</code> /{' '}
                <code className="font-mono text-teal-300">password</code>
              </p>
              <p>
                • Front Desk: <code className="font-mono text-teal-300">helpdesk@gym.com</code> /{' '}
                <code className="font-mono text-teal-300">password</code>
              </p>
              <p>
                • SaaS Admin: <code className="font-mono text-teal-300">admin@saas.com</code> /{' '}
                <code className="font-mono text-teal-300">password</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthScreen>
  );
}
