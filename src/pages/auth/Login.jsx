// src/pages/auth/Login.jsx — cardless glass login matching mobile brand treatment
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRememberMePreference } from '../../utils/authStorage';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { isPlatformAdmin, hasGymPortalAccess } from '../../utils/roles';
import AuthScreen from '../../components/auth/AuthScreen';
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const inputBase =
    'auth-login-input block w-full rounded-2xl border border-white/20 bg-white/[0.1] px-4 py-3.5 text-base text-white placeholder-white/45 caret-white shadow-none transition-[border-color,background-color] focus:border-teal-300/55 focus:bg-white/[0.14] focus:outline-none focus:ring-2 focus:ring-teal-400/25';


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

  return (
    <AuthScreen hero>
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500">
          <LoginBrandPanel />

          {successMessage && (
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-300">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-300">
              {error}
            </div>
          )}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="sr-only">
                {t('auth.emailOrUsername')}
              </label>
              <input
                id="login-email"
                type="text"
                required
                autoComplete="username"
                className={inputClass(inputBase, fieldErrors, 'email')}
                placeholder={t('auth.emailOrUsername')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError(setFieldErrors, 'email');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'email')} />
            </div>
            <div>
              <label htmlFor="login-password" className="sr-only">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/45 transition-colors hover:text-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                  aria-label={showPassword ? t('modals.staff.hidePassword') : t('modals.staff.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label htmlFor="login-remember" className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-teal-500 focus:ring-teal-400/40"
                />
                {t('auth.rememberMe')}
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-teal-300 hover:text-teal-200">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-2xl bg-brand px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-teal-300/50 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
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
            <Link to="/register-gym" className="font-semibold text-teal-300 hover:text-teal-200">
              {t('auth.registerGymLink')}
            </Link>
          </p>

          {import.meta.env.DEV && (
            <div className="mt-8 animate-pulse space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/55">
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
