import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validatePassword, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors } from '../utils/validation';
import FieldError from './FieldError';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';


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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    if (!showValidationError(validatePassword(password), setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    setValidationError('');
    onSubmit(password);
  };

  const displayError = (validationError || error) && !Object.keys(fieldErrors).length ? (validationError || error) : '';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-[110]">
      <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="flex min-h-0 flex-1 flex-col">
        <div className={`${modalHeader} flex items-center justify-between gap-3`}>
          <h2 className={modalTitle}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text"
            aria-label={t('aria.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={modalBody}>
          {subtitle && <p className="mb-4 text-sm text-app-muted">{subtitle}</p>}

          {displayError && (
            <div className="ui-alert-rose mb-4">
              {displayError}
            </div>
          )}

          <div>
            <label htmlFor="reset-password" className="form-label">
              {t('modals.resetPassword.password')}
              <RequiredMark />
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
                className={inputClass('w-full app-field pr-10', fieldErrors, 'password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-app-muted hover:bg-app-surface hover:text-app-text"
                aria-label={showPassword ? t('modals.staff.hidePassword') : t('modals.staff.showPassword')}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={fieldErrorMessage(fieldErrors, 'password')} />
            <p className="mt-1 text-xs text-app-muted">{t('modals.resetPassword.passwordHint')}</p>
          </div>
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? t('common.saving') : t('modals.resetPassword.submit')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
