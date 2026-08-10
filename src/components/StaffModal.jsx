import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_STAFF_ROLE, STAFF_ROLE_OPTIONS, normalizeStaffRole } from '../utils/staffRoles';
import {
  validateStaffForm,
  showValidationError,
  inputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
  FORM_INPUT_CLASS,
} from '../utils/validation';
import FieldError from './FieldError';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';

const SELECT_CLASS = `ui-select ${FORM_INPUT_CLASS} cursor-pointer`;

/**
 * Create or edit a front desk staff login (owner sets credentials on-platform).
 */
export default function StaffModal({
  isOpen,
  onClose,
  onSubmit,
  staff,
  branches = [],
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [staffRole, setStaffRole] = useState(DEFAULT_STAFF_ROLE);
  const [branchId, setBranchId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(FORM_INPUT_CLASS, fieldErrors, field);
  const sc = (field) => inputClass(SELECT_CLASS, fieldErrors, field);

  const activeBranches = branches.filter((b) => b.is_active !== false);
  const defaultBranchId = activeBranches.find((b) => b.is_default)?.id ?? activeBranches[0]?.id ?? '';

  const isEdit = !!staff;
  const selectedRole = STAFF_ROLE_OPTIONS.find((opt) => opt.id === staffRole) ?? STAFF_ROLE_OPTIONS[0];

  const initDefaults = useCallback(() => {
    if (staff) {
      setName(staff.name || '');
      setEmail(staff.email || '');
      setUsername(staff.username || '');
      setStaffRole(normalizeStaffRole(staff.staff_role));
      setBranchId(staff.branch_id ? String(staff.branch_id) : String(defaultBranchId));
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setUsername('');
      setStaffRole(DEFAULT_STAFF_ROLE);
      setBranchId(String(defaultBranchId));
      setPassword('');
    }
    setShowPassword(false);
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
  }, [staff, defaultBranchId]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: staff?.id ?? 'create',
    initialize: initDefaults,
    saving,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const staffResult = validateStaffForm({
      name,
      username,
      email,
      password,
      branchId,
      isEdit,
    });
    if (!showValidationError(staffResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    setValidationError('');
    const trimmedEmail = email.trim().toLowerCase();
    const payload = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      staff_role: staffRole,
      branch_id: parseInt(branchId, 10),
    };
    if (trimmedEmail) payload.email = trimmedEmail;
    else if (isEdit) payload.email = null;
    if (!isEdit || password.trim()) {
      payload.password = password;
    }
    onSubmit(payload);
  };

  const displayError =
    (validationError || error) && !Object.keys(fieldErrors).length ? validationError || error : '';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-[100]">
      <div className={`${modalHeader} flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-app-text-strong">
            {isEdit ? t('modals.staff.editTitle') : t('modals.staff.createTitle')}
          </h2>
          <p className="mt-1 text-sm text-app-muted">{t('modals.staff.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text"
          aria-label={t('aria.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        onChangeCapture={markTouched}
        autoComplete="off"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className={`${modalBody} space-y-6`}>
          {displayError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
              {displayError}
            </div>
          )}

          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="staff-branch" className="form-label">
                  {t('modals.staff.branch')}
                  <RequiredMark />
                </label>
                <select
                  id="staff-branch"
                  required
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    clearFieldError(setLocalFieldErrors, 'branchId');
                  }}
                  className={sc('branchId')}
                >
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrorMessage(fieldErrors, 'branchId')} />
              </div>

              <div className="min-w-0">
                <label htmlFor="staff-role" className="form-label">
                  {t('modals.staff.role')}
                  <RequiredMark />
                </label>
                <select
                  id="staff-role"
                  required
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  className={sc('staffRole')}
                >
                  {STAFF_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
                {selectedRole?.descriptionKey ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-app-muted">
                    {t(selectedRole.descriptionKey)}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-app-border-subtle pt-5">
            <div>
              <label htmlFor="staff-name" className="form-label">
                {t('modals.staff.name')}
                <RequiredMark />
              </label>
              <input
                id="staff-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'name');
                }}
                className={fc('name')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'name')} />
            </div>

            <div>
              <label htmlFor="staff-email" className="form-label">
                {t('modals.staff.email')}
                <span className="ml-1 text-xs font-normal text-app-muted">({t('account.optional')})</span>
              </label>
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'email');
                }}
                className={fc('email')}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'email')} />
              <p className="mt-1.5 text-xs leading-relaxed text-app-muted">{t('modals.staff.emailOptional')}</p>
            </div>
          </section>

          <section className="space-y-4 border-t border-app-border-subtle pt-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted">
              {t('modals.staff.signInSection')}
            </p>

            <div>
              <label htmlFor="staff-username" className="form-label">
                {t('modals.staff.username')}
                <RequiredMark />
              </label>
              <input
                id="staff-username"
                type="text"
                required
                autoComplete="off"
                name="staff-username"
                pattern="[a-z0-9._]{3,30}"
                title={t('account.usernamePattern')}
                placeholder={t('modals.staff.usernamePlaceholder')}
                className={fc('username')}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  clearFieldError(setLocalFieldErrors, 'username');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'username')} />
              <p className="mt-1.5 text-xs leading-relaxed text-app-muted">{t('modals.staff.usernameHint')}</p>
            </div>

            <div>
              <label htmlFor="staff-password" className="form-label">
                {t('modals.staff.password')}
                {!isEdit ? <RequiredMark /> : null}
                {isEdit ? (
                  <span className="ml-1 text-xs font-normal text-app-muted">
                    {t('modals.staff.passwordKeepHint')}
                  </span>
                ) : null}
              </label>
              <div className="relative mt-1">
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  required={!isEdit}
                  minLength={isEdit && !password ? undefined : 8}
                  autoComplete="new-password"
                  name="staff-password"
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
              <p className="mt-1.5 text-xs leading-relaxed text-app-muted">{t('modals.staff.passwordHint')}</p>
            </div>
          </section>
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving
              ? t('common.processing')
              : isEdit
                ? t('modals.staff.saveUpdate')
                : t('modals.staff.saveCreate')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
