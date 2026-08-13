import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/authService';
import { getGymProfile, updateGymProfile } from '../../services/gymProfileService';
import { parseApiResponse } from '../../utils/api';
import { formatPhoneForInput, validateOwnerProfile, validatePasswordChange, showValidationError, inputClass as fieldInputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors } from '../../utils/validation';
import FieldError from '../FieldError';
import RequiredMark from '../ui/RequiredMark';
import { useModalFormDraft } from '../../utils/useModalFormDraft';
import { isGymOwner, isGymStaff } from '../../utils/roles';
import {
  Eye,
  EyeOff,
  Check,
  X as XIcon,
} from 'lucide-react';
import ResponsiveModal from '../ResponsiveModal';
import Button from '../ui/Button';
import AccountSuccessPanel from './AccountSuccessPanel';
import { modalBody, modalHeader, modalFooter } from '../../utils/modalLayout';
import { modalTitle } from '../../utils/surfaceClasses';


function Alert({ children }) {
  return (
    <div className="ui-alert-rose" role="alert">
      {children}
    </div>
  );
}

function FieldLabel({ htmlFor, children, hint, required = false }) {
  return (
    <label htmlFor={htmlFor} className="form-label">
      <span className="inline-flex items-center gap-1.5">
        {children}
        {required ? <RequiredMark /> : null}
      </span>
      {hint ? <span className="mt-0.5 block text-xs font-normal text-app-muted">{hint}</span> : null}
    </label>
  );
}

const inputClass = `mt-1.5 w-full app-field disabled:bg-app-surface disabled:text-app-muted`;

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  fieldErrors,
  field,
  error: forceError,
  hint,
}) {
  const { t } = useTranslation();
  const hasError = Boolean(forceError || (field && fieldErrors && fieldErrorMessage(fieldErrors, field)));
  const cls = fieldInputClass(inputClass, hasError ? { [field || 'password']: 'x' } : {}, field || 'password');
  return (
    <div>
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          minLength={id !== 'modal-current-password' ? 8 : undefined}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`${cls} pr-10`}
          aria-invalid={hasError || undefined}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-app-muted hover:bg-app-surface/80 hover:text-app-text"
          aria-label={show ? t('modals.staff.hidePassword') : t('modals.staff.showPassword')}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint}
      {field && fieldErrors ? <FieldError message={fieldErrorMessage(fieldErrors, field)} /> : null}
    </div>
  );
}

function PasswordRule({ show, ok, label }) {
  if (!show) return null;
  return (
    <p
      className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
        ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      }`}
    >
      {ok ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <XIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span>{label}</span>
    </p>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-12 rounded-lg bg-app-surface" />
      <div className="h-12 rounded-lg bg-app-surface" />
      <div className="h-12 rounded-lg bg-app-surface" />
    </div>
  );
}

function AccountModal({ open, title, description, onClose, children }) {
  const { t } = useTranslation();
  return (
    <ResponsiveModal open={open} onClose={onClose} size="lg" zIndexClass="z-[100]" labelledBy="account-modal-title">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0 pr-2">
          <h2 id="account-modal-title" className={modalTitle}>
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-sm text-app-muted">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text"
          aria-label={t('aria.close')}
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      {children}
    </ResponsiveModal>
  );
}

export function ProfilePanel({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { apiFetch, user, updateUser } = useAuth();
  const showGymProfile = isGymOwner(user?.role);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const fc = (field) => fieldInputClass(inputClass, fieldErrors, field);
  const [ownerName, setOwnerName] = useState('');
  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState('');
  const [accountEmail, setAccountEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [savedProfile, setSavedProfile] = useState(null);
  const [profileDone, setProfileDone] = useState(null);

  const profileDirty = useMemo(() => {
    if (!savedProfile) return false;
    return (
      ownerName.trim() !== savedProfile.ownerName ||
      gymName.trim() !== savedProfile.gymName ||
      (phone.trim() || '') !== savedProfile.phone ||
      accountEmail.trim().toLowerCase() !== savedProfile.email ||
      username.trim().toLowerCase() !== savedProfile.username
    );
  }, [savedProfile, ownerName, gymName, phone, accountEmail, username]);

  const applyProfile = useCallback(
    (data) => {
      const nextOwner = data.user?.name || '';
      const nextGym = data.gym?.name || '';
      const nextPhone = data.gym?.phone || '';
      const nextEmail = data.user?.email || user?.email || '';
      const nextUsername = data.user?.username ?? user?.username ?? '';
      setOwnerName(nextOwner);
      setGymName(nextGym);
      setPhone(formatPhoneForInput(nextPhone));
      setAccountEmail(nextEmail);
      setUsername(nextUsername);
      setSavedProfile({
        ownerName: nextOwner,
        gymName: nextGym,
        phone: nextPhone || '',
        email: nextEmail.trim().toLowerCase(),
        username: nextUsername.trim().toLowerCase(),
      });
      if (nextOwner || nextEmail || nextUsername) {
        updateUser({ name: nextOwner, email: nextEmail, username: nextUsername });
      }
    },
    [updateUser, user?.email, user?.username]
  );

  const loadProfile = useCallback(async () => {
    if (!showGymProfile) {
      setAccountEmail(user?.email || '');
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    try {
      const res = await Promise.race([
        getGymProfile(apiFetch),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(t('common.requestTimedOut', { defaultValue: 'Request timed out. Please try again.' }))), 20000);
        }),
      ]);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');
      setError('');
      applyProfile(data);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
      setSavedProfile(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showGymProfile, applyProfile, user?.email, t]);

  const initializeProfile = useCallback(() => {
    setProfileDone(null);
    return loadProfile();
  }, [loadProfile]);

  const { markTouched } = useModalFormDraft({
    isOpen: open,
    scopeKey: 'profile',
    initialize: initializeProfile,
    saving,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(
      validateOwnerProfile({ gymName, ownerName, username, email: accountEmail, phone }),
      setError,
      t,
      { setFieldErrors }
    )) return;
    const trimmedPhone = phone.trim();
    setSaving(true);
    try {
      const res = await updateGymProfile(apiFetch, {
        name: ownerName.trim(),
        gym_name: gymName.trim(),
        phone: trimmedPhone,
        email: accountEmail.trim() || null,
        username: username.trim().toLowerCase(),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      applyProfile(data);
      setProfileDone({
        gymName: gymName.trim(),
        ownerName: ownerName.trim(),
        phone: trimmedPhone || '',
        username: username.trim().toLowerCase(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!savedProfile) return;
    setOwnerName(savedProfile.ownerName);
    setGymName(savedProfile.gymName);
    setPhone(savedProfile.phone);
    setAccountEmail(savedProfile.email);
    setUsername(savedProfile.username);
    setError('');
  };

  if (profileDone) {
    const rows = [
      { label: t('account.yourName'), value: profileDone.ownerName },
      profileDone.username
        ? { label: t('account.username'), value: `@${profileDone.username}` }
        : null,
      profileDone.phone ? { label: t('account.gymPhone'), value: profileDone.phone } : null,
    ].filter(Boolean);

    return (
      <AccountModal open={open} onClose={onClose} title={t('auth.successAllSet')} description={null}>
        <AccountSuccessPanel
          hero={profileDone.gymName}
          body={t('account.profileSuccessBody')}
          rows={rows}
          ctaLabel={t('common.done')}
          onCta={() => {
            setProfileDone(null);
            onClose();
          }}
        />
      </AccountModal>
    );
  }

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      title={showGymProfile ? t('account.gymProfile') : t('account.accountTitle')}
      description={
        showGymProfile
          ? t('account.gymProfileDesc')
          : isGymStaff(user?.role)
            ? t('account.staffEmailDesc')
            : t('account.platformEmailDesc')
      }
    >
      {loading && !error && !savedProfile ? (
        <div className={modalBody}>
          <ProfileSkeleton />
        </div>
      ) : showGymProfile && !savedProfile ? (
        <div className={`${modalBody} space-y-4`}>
          {error ? <Alert>{error}</Alert> : null}
          <p className="text-sm text-app-muted">{t('account.profileLoadFailed')}</p>
          <Button type="button" variant="secondary" loading={loading} disabled={loading} onClick={() => void loadProfile()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : showGymProfile ? (
        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="flex min-h-0 flex-1 flex-col">
          <div className={`${modalBody} space-y-5`}>
            {error && !Object.keys(fieldErrors).length ? <Alert>{error}</Alert> : null}

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-app-text-strong">{t('account.sectionGym')}</h3>
              <div>
                <FieldLabel htmlFor="modal-gym-name" required>
                  {t('account.gymName')}
                </FieldLabel>
                <input
                  id="modal-gym-name"
                  type="text"
                  required
                  value={gymName}
                  onChange={(e) => {
                    setGymName(e.target.value);
                    clearFieldError(setFieldErrors, 'gymName');
                  }}
                  className={fc('gymName')}
                />
                <FieldError message={fieldErrorMessage(fieldErrors, 'gymName')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="modal-owner-name" required>
                    {t('account.yourName')}
                  </FieldLabel>
                  <input
                    id="modal-owner-name"
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      clearFieldError(setFieldErrors, 'ownerName');
                    }}
                    className={fc('ownerName')}
                  />
                  <FieldError message={fieldErrorMessage(fieldErrors, 'ownerName')} />
                </div>
                <div>
                  <FieldLabel htmlFor="modal-gym-phone" required>
                    {t('account.gymPhone')}
                  </FieldLabel>
                  <input
                    id="modal-gym-phone"
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t('auth.phonePlaceholder')}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError(setFieldErrors, 'phone');
                    }}
                    className={fc('phone')}
                  />
                  <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-app-border-subtle pt-5">
              <h3 className="text-sm font-semibold text-app-text-strong">{t('account.sectionSignIn')}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="modal-login-username" required>
                    {t('account.username')}
                  </FieldLabel>
                  <input
                    id="modal-login-username"
                    type="text"
                    required
                    autoComplete="username"
                    pattern="[a-z0-9._]{3,30}"
                    title={t('account.usernamePattern')}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase());
                      clearFieldError(setFieldErrors, 'username');
                    }}
                    className={fc('username')}
                  />
                  <FieldError message={fieldErrorMessage(fieldErrors, 'username')} />
                </div>
                <div>
                  <FieldLabel htmlFor="modal-login-email" hint={t('account.loginEmailHint')}>
                    {t('account.loginEmail')}
                  </FieldLabel>
                  <input
                    id="modal-login-email"
                    type="email"
                    autoComplete="email"
                    value={accountEmail}
                    onChange={(e) => {
                      setAccountEmail(e.target.value);
                      clearFieldError(setFieldErrors, 'email');
                    }}
                    className={fc('email')}
                  />
                  <FieldError message={fieldErrorMessage(fieldErrors, 'email')} />
                </div>
              </div>
            </section>
          </div>

          <div className={modalFooter}>
            {profileDirty ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                disabled={saving}
                className="w-full sm:mr-auto sm:w-auto"
              >
                {t('account.discard')}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !profileDirty} className="w-full sm:w-auto">
              {saving ? t('auth.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      ) : (
        <div className={modalBody}>
          <FieldLabel htmlFor="modal-admin-email">{t('account.loginEmail')}</FieldLabel>
          <input
            id="modal-admin-email"
            type="email"
            readOnly
            value={accountEmail || user?.email || ''}
            className={`${inputClass} cursor-not-allowed border-app-border-subtle bg-app-surface text-app-muted`}
          />
        </div>
      )}
    </AccountModal>
  );
}

export function PasswordPanel({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);

  const passwordReady =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirm &&
    newPassword !== currentPassword;

  const clearForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    setError('');
    clearAllFieldErrors(setFieldErrors);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setPasswordDone(false);
  }, []);

  const { markTouched } = useModalFormDraft({
    isOpen: open,
    scopeKey: 'password',
    initialize: clearForm,
    saving: loading,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    clearAllFieldErrors(setFieldErrors);
    if (!showValidationError(validatePasswordChange(currentPassword, newPassword, confirm), setError, t, { setFieldErrors })) {
      return;
    }

    setLoading(true);
    try {
      await changePassword(apiFetch, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setPasswordDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (passwordDone) {
    return (
      <AccountModal open={open} onClose={onClose} title={t('auth.successAllSet')} description={null}>
        <AccountSuccessPanel
          hero={t('account.passwordSuccessHero')}
          body={t('account.passwordSuccessBody')}
          ctaLabel={t('common.done')}
          onCta={() => {
            setPasswordDone(false);
            onClose();
          }}
        />
      </AccountModal>
    );
  }

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      title={t('account.changePasswordTitle')}
      description={t('account.changePasswordDesc')}
    >
      <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="flex min-h-0 flex-1 flex-col">
        <div className={`${modalBody} space-y-4`}>
          {error && !Object.keys(fieldErrors).length ? <Alert>{error}</Alert> : null}

          <PasswordField
            id="modal-current-password"
            label={t('account.currentPassword')}
            value={currentPassword}
            onChange={(e) => {
              const v = e.target.value;
              setCurrentPassword(v);
              clearFieldError(setFieldErrors, 'currentPassword');
              setFieldErrors((prev) => {
                const next = { ...prev };
                if (newPassword && newPassword.length > 0 && newPassword.length < 8) {
                  next.newPassword = 'auth.passwordMinLength';
                } else if (newPassword && v && newPassword === v) {
                  next.newPassword = 'account.passwordDifferent';
                } else {
                  delete next.newPassword;
                }
                return next;
              });
            }}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
            fieldErrors={fieldErrors}
            field="currentPassword"
          />

          <PasswordField
            id="modal-new-password"
            label={t('auth.newPassword')}
            value={newPassword}
            onChange={(e) => {
              const v = e.target.value;
              setNewPassword(v);
              setFieldErrors((prev) => {
                const next = { ...prev };
                if (v.length > 0 && v.length < 8) next.newPassword = 'auth.passwordMinLength';
                else if (v && currentPassword && v === currentPassword) next.newPassword = 'account.passwordDifferent';
                else delete next.newPassword;
                if (confirm.length > 0 && confirm !== v) next.confirmPassword = 'account.passwordMismatch';
                else if (confirm.length > 0 && confirm === v) delete next.confirmPassword;
                return next;
              });
            }}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            autoComplete="new-password"
            fieldErrors={
              fieldErrors.newPassword && fieldErrors.newPassword !== 'auth.passwordMinLength'
                ? fieldErrors
                : {}
            }
            field="newPassword"
            error={newPassword.length > 0 && newPassword.length < 8}
            hint={
              <PasswordRule
                show={newPassword.length > 0}
                ok={newPassword.length >= 8}
                label={t('account.passwordMin8')}
              />
            }
          />

          <PasswordField
            id="modal-confirm-password"
            label={t('account.confirmNewPassword')}
            value={confirm}
            onChange={(e) => {
              const v = e.target.value;
              setConfirm(v);
              setFieldErrors((prev) => {
                const next = { ...prev };
                if (v.length > 0 && v !== newPassword) next.confirmPassword = 'account.passwordMismatch';
                else delete next.confirmPassword;
                return next;
              });
            }}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((v) => !v)}
            autoComplete="new-password"
            fieldErrors={{}}
            field="confirmPassword"
            error={confirm.length > 0 && confirm !== newPassword}
            hint={
              <PasswordRule
                show={confirm.length > 0}
                ok={confirm.length > 0 && confirm === newPassword}
                label={
                  confirm.length > 0 && confirm === newPassword
                    ? t('account.passwordsMatch')
                    : t('account.passwordMismatch')
                }
              />
            }
          />
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading || !passwordReady} className="w-full sm:w-auto">
            {loading ? t('account.updating') : t('auth.updatePassword')}
          </Button>
        </div>
      </form>
    </AccountModal>
  );
}
