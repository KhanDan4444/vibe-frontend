import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../../services/authService';
import { validatePassword, validatePasswordMatch, showValidationError, inputClass as fieldInputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors } from '../../utils/validation';
import FieldError from '../../components/FieldError';
import AuthScreen from '../../components/auth/AuthScreen';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const baseInputClass =
    'mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900/40 px-3 py-2 text-white focus:border-teal-600 focus:outline-none dark:border-app-border dark:bg-app-input dark:text-app-text-strong sm:text-sm';
  const fc = (field) => fieldInputClass(baseInputClass, fieldErrors, field);
  const bannerError = error && !Object.keys(fieldErrors).length ? error : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validatePassword(password), setError, t, { setFieldErrors })) return;
    if (!showValidationError(validatePasswordMatch(password, confirm), setError, t, { setFieldErrors })) return;
    if (!token) {
      setError(t('auth.invalidResetLink'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate('/login', { replace: true, state: { message: t('auth.passwordUpdated') } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-app-border-subtle bg-app-raised p-6 shadow-xl sm:p-8">
        <div>
          <h2 className="text-center text-2xl font-bold text-white dark:text-app-text-strong">{t('auth.resetTitle')}</h2>
          <p className="mt-2 text-center text-sm text-slate-400 dark:text-app-muted">{t('auth.resetSubtitle')}</p>
        </div>

        {bannerError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
            {bannerError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300 dark:text-app-text">{t('auth.newPassword')}</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError(setFieldErrors, 'password');
              }}
              className={fc('password')}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 dark:text-app-text">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                clearFieldError(setFieldErrors, 'confirmPassword');
              }}
              className={fc('confirmPassword')}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'confirmPassword')} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? t('auth.saving') : t('auth.updatePassword')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          <Link to="/forgot-password" className="text-teal-400 hover:text-teal-300">
            {t('auth.requestNewLink')}
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
