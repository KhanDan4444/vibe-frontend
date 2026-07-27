import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/authService';
import { getGymProfile, updateGymProfile } from '../../services/gymProfileService';
import { parseApiResponse } from '../../utils/api';
import { formatPhoneForInput, validateOwnerProfile, validatePasswordChange, showValidationError, inputClass as fieldInputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors } from '../../utils/validation';
import FieldError from '../FieldError';
import { useModalFormDraft } from '../../utils/useModalFormDraft';
import { isGymOwner, isGymStaff } from '../../utils/roles';
import {
  Building2,
  User,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Check,
  X as XIcon,
  AtSign,
} from 'lucide-react';
import ResponsiveModal from '../ResponsiveModal';
import Button from '../ui/Button';
import { modalBody, modalHeader } from '../../utils/modalLayout';

function Alert({ children }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
      {children}
    </div>
  );
}

function FieldLabel({ htmlFor, icon: Icon, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="form-label">
      <span className="inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden />}
        {children}
      </span>
      {hint && <span className="mt-0.5 block text-xs font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  'mt-1.5 block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised px-3 py-2.5 text-sm text-slate-900 dark:text-app-text-strong shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:bg-slate-50 disabled:text-slate-500';

function PasswordField({ id, label, value, onChange, show, onToggleShow, autoComplete, fieldErrors, field, onClearError }) {
  const { t } = useTranslation();
  const cls = field && fieldErrors ? fieldInputClass(inputClass, fieldErrors, field) : inputClass;
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          minLength={id !== 'modal-current-password' ? 8 : undefined}
          value={value}
          onChange={(e) => {
            onChange(e);
            if (field && onClearError) onClearError(field);
          }}
          autoComplete={autoComplete}
          className={`${cls} pr-10`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-app-surface/80 hover:text-slate-600 dark:text-app-text"
          aria-label={show ? t('modals.staff.hidePassword') : t('modals.staff.showPassword')}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {field && fieldErrors && <FieldError message={fieldErrorMessage(fieldErrors, field)} />}
    </div>
  );
}

function PasswordChecklist({ password, confirm }) {
  const { t } = useTranslation();
  const rules = [
    { ok: password.length >= 8, label: t('account.passwordMin8') },
    { ok: password.length > 0 && password === confirm, label: t('account.passwordsMatch') },
  ];
  if (!password && !confirm) return null;
  return (
    <ul className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5 text-xs">
      {rules.map((rule) => (
        <li key={rule.label} className="flex items-center gap-2">
          {rule.ok ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <XIcon className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
          )}
          <span className={rule.ok ? 'text-emerald-700' : 'text-slate-500'}>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-12 rounded-lg bg-slate-200/80 dark:bg-app-surface" />
      <div className="h-12 rounded-lg bg-slate-200/80 dark:bg-app-surface" />
      <div className="h-12 rounded-lg bg-slate-200/80 dark:bg-app-surface" />
    </div>
  );
}

function AccountModal({ open, title, description, onClose, children }) {
  const { t } = useTranslation();
  return (
    <ResponsiveModal open={open} onClose={onClose} size="lg" zIndexClass="z-[100]" labelledBy="account-modal-title">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0 pr-2">
          <h2 id="account-modal-title" className="text-lg font-bold text-slate-900 dark:text-app-text-strong">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-app-surface/80 hover:text-slate-600 dark:text-app-text"
          aria-label={t('aria.close')}
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      <div className={modalBody}>{children}</div>
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

  const currentUsername = savedProfile?.username || user?.username || '';

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
    setError('');
    try {
      const res = await Promise.race([
        getGymProfile(apiFetch),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(t('common.requestTimedOut', { defaultValue: 'Request timed out. Please try again.' }))), 20000);
        }),
      ]);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');
      applyProfile(data);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
      setSavedProfile(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showGymProfile, applyProfile, user?.email, t]);

  const { markTouched } = useModalFormDraft({
    isOpen: open,
    scopeKey: 'profile',
    initialize: loadProfile,
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
        email: accountEmail.trim(),
        username: username.trim().toLowerCase(),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      applyProfile(data);
      onSuccess?.(flashFromKey(t, 'profileSaved'));
      onClose();
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
      {loading ? (
        <ProfileSkeleton />
      ) : showGymProfile && !savedProfile ? (
        <div className="space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          <p className="text-sm text-slate-500 dark:text-app-muted">
            {t('account.profileLoadFailed')}
          </p>
          <Button type="button" variant="secondary" onClick={() => void loadProfile()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : showGymProfile ? (
        <form className="space-y-4" onSubmit={handleSubmit} onChangeCapture={markTouched}>
          {error && !Object.keys(fieldErrors).length && <Alert>{error}</Alert>}
          <div>
            <FieldLabel htmlFor="modal-gym-name" icon={Building2}>
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
              <FieldLabel htmlFor="modal-owner-name" icon={User}>
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
              <FieldLabel htmlFor="modal-gym-phone" icon={Phone}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel
                htmlFor="modal-login-username"
                icon={AtSign}
                hint={currentUsername ? t('account.currentUsername', { username: currentUsername }) : undefined}
              >
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
              <FieldLabel htmlFor="modal-login-email" icon={Mail}>
                {t('account.loginEmail')}
              </FieldLabel>
              <input
                id="modal-login-email"
                type="email"
                required
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
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-app-border-subtle pt-4">
            <Button type="submit" disabled={saving || !profileDirty}>
              {saving ? t('auth.saving') : t('common.save')}
            </Button>
            {profileDirty && (
              <Button type="button" variant="secondary" onClick={handleReset} disabled={saving}>
                {t('account.discard')}
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div>
          <FieldLabel htmlFor="modal-admin-email" icon={Mail}>
            {t('account.loginEmail')}
          </FieldLabel>
          <input
            id="modal-admin-email"
            type="email"
            readOnly
            value={accountEmail || user?.email || ''}
            className={`${inputClass} cursor-not-allowed border-slate-100 bg-slate-50 text-slate-500`}
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
      const data = await changePassword(apiFetch, currentPassword, newPassword);
      clearForm();
      onSuccess?.(flashFromKey(t, 'passwordUpdated'));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      title={t('account.changePasswordTitle')}
      description={t('account.changePasswordDesc')}
    >
      <form className="space-y-4" onSubmit={handleSubmit} onChangeCapture={markTouched}>
        {error && !Object.keys(fieldErrors).length && <Alert>{error}</Alert>}

        <PasswordField
          id="modal-current-password"
          label={t('account.currentPassword')}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          show={showCurrent}
          onToggleShow={() => setShowCurrent((v) => !v)}
          autoComplete="current-password"
          fieldErrors={fieldErrors}
          field="currentPassword"
          onClearError={(f) => clearFieldError(setFieldErrors, f)}
        />

        <PasswordField
          id="modal-new-password"
          label={t('auth.newPassword')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          show={showNew}
          onToggleShow={() => setShowNew((v) => !v)}
          autoComplete="new-password"
          fieldErrors={fieldErrors}
          field="newPassword"
          onClearError={(f) => clearFieldError(setFieldErrors, f)}
        />

        <PasswordField
          id="modal-confirm-password"
          label={t('account.confirmNewPassword')}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          show={showConfirm}
          onToggleShow={() => setShowConfirm((v) => !v)}
          autoComplete="new-password"
          fieldErrors={fieldErrors}
          field="confirmPassword"
          onClearError={(f) => clearFieldError(setFieldErrors, f)}
        />

        <PasswordChecklist password={newPassword} confirm={confirm} />

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-app-border-subtle pt-4">
          <Button type="submit" disabled={loading || !passwordReady}>
            {loading ? t('account.updating') : t('auth.updatePassword')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </AccountModal>
  );
}
