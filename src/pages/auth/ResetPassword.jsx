import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../../services/authService';
import {
  validatePassword,
  validatePasswordMatch,
  showValidationError,
  inputClass as fieldInputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
} from '../../utils/validation';
import FieldError from '../../components/FieldError';
import RequiredMark from '../../components/ui/RequiredMark';
import AuthScreen from '../../components/auth/AuthScreen';
import AuthFormShell from '../../components/auth/AuthFormShell';

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

  const baseInputClass = 'auth-field';
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
      <AuthFormShell>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{t('auth.resetTitle')}</h2>
          <p className="mt-2 text-sm text-white/55">{t('auth.resetSubtitle')}</p>
        </div>

        {bannerError && (
          <div className="auth-banner-error" role="alert">
            {bannerError}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="reset-password" className="auth-label">
              {t('auth.newPassword')}
              <RequiredMark />
            </label>
            <input
              id="reset-password"
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
            <label htmlFor="reset-confirm" className="auth-label">
              {t('auth.confirmPassword')}
              <RequiredMark />
            </label>
            <input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                clearFieldError(setFieldErrors, 'confirmPassword');
              }}
              className={fc('confirmPassword')}
            />
            <FieldError
              message={fieldErrorMessage(fieldErrors, 'confirmPassword')}
              className="text-sm text-rose-300"
            />
          </div>
          <button type="submit" disabled={loading} className="auth-cta-btn">
            {loading ? t('auth.saving') : t('auth.updatePassword')}
          </button>
        </form>

        <p className="text-center text-sm text-white/55">
          <Link to="/forgot-password" className="auth-link">
            {t('auth.requestNewLink')}
          </Link>
        </p>
      </AuthFormShell>
    </AuthScreen>
  );
}
