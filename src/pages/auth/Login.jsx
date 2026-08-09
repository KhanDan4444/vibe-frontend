// src/pages/auth/Login.jsx — light auth hero; app theme default remains dark after login
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
    'auth-login-input block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 caret-slate-900 shadow-sm transition-[border-color,background-color,box-shadow] focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

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
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
                  aria-label={showPassword ? t('modals.staff.hidePassword') : t('modals.staff.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label htmlFor="login-remember" className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 bg-white text-teal-700 focus:ring-teal-600/40"
                />
                {t('auth.rememberMe')}
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-2xl bg-brand px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:opacity-50"
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

          <p className="mt-6 text-center text-sm text-slate-600">
            {t('auth.noAccount')}{' '}
            <Link to="/register-gym" className="font-semibold text-teal-700 hover:text-teal-800">
              {t('auth.registerGymLink')}
            </Link>
          </p>

          {import.meta.env.DEV && (
            <div className="mt-8 space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 text-xs text-slate-500 shadow-sm">
              <p className="flex items-center gap-1 font-semibold text-slate-700">
                Developer Quick-Access (Sandbox Active):
              </p>
              <p>
                • Gym Owner: <code className="font-mono text-teal-700">owner@gym.com</code> /{' '}
                <code className="font-mono text-teal-700">password</code>
              </p>
              <p>
                • Front Desk: <code className="font-mono text-teal-700">helpdesk@gym.com</code> /{' '}
                <code className="font-mono text-teal-700">password</code>
              </p>
              <p>
                • SaaS Admin: <code className="font-mono text-teal-700">admin@saas.com</code> /{' '}
                <code className="font-mono text-teal-700">password</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthScreen>
  );
}
