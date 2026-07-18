import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validatePassword, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors } from '../utils/validation';
import FieldError from './FieldError';
import ResponsiveModal from './ResponsiveModal';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';

/**
 * Admin sets a new password on behalf of another user (platform admin → owner, owner → staff).
 */
export default function ResetPasswordModal({
  isOpen,
  onClose,
  onSubmit,
  accountName,
  title,
  subtitle,
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;

  const initDefaults = useCallback(() => {
    setPassword('');
    setShowPassword(false);
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
  }, []);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: accountName ?? 'reset',
    initialize: initDefaults,
    saving,
  });

  const canSubmit = !saving && validatePassword(password).ok;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    if (!showValidationError(validatePassword(password), setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    setValidationError('');
    onSubmit(password);
  };

  const displayError = (validationError || error) && !Object.keys(fieldErrors).length ? (validationError || error) : '';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-[110]">
      <form onSubmit={handleSubmit} onChangeCapture={markTouched}>
        <div className={`${modalHeader} flex items-center justify-between gap-3`}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-app-surface/80"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={modalBody}>
          {subtitle && <p className="mb-4 text-sm text-slate-500">{subtitle}</p>}

          {displayError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {displayError}
            </div>
          )}

          <div>
            <label htmlFor="reset-password" className="form-label">
              {t('modals.resetPassword.password')}
            </label>
            <div className="relative mt-1.5">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'password');
                }}
                className={inputClass('block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2.5 pr-10 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20', fieldErrors, 'password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? t('modals.staff.hidePassword') : t('modals.staff.showPassword')}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
            <p className="mt-1 text-xs text-slate-400">{t('modals.resetPassword.passwordHint')}</p>
          </div>
        </div>

        <div className={modalFooter}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('modals.resetPassword.submit')}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
