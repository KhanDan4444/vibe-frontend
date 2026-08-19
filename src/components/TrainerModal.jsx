import { useState, useCallback, useEffect } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  showValidationError,
  inputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
  FORM_INPUT_CLASS,
  formatPhoneForInput,
  validateRequiredName,
  validateOptionalEthiopianPhone,
  firstFailure,
} from '../utils/validation';
import FieldError from './FieldError';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import SearchableSelect from './ui/SearchableSelect';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';

export default function TrainerModal({
  isOpen,
  onClose,
  onSubmit,
  trainer,
  branches = [],
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [branchId, setBranchId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(FORM_INPUT_CLASS, fieldErrors, field);

  const activeBranches = branches.filter((b) => b.is_active !== false);
  const defaultBranchId = String(
    activeBranches.find((b) => b.is_default)?.id ?? activeBranches[0]?.id ?? ''
  );
  const branchOptions = activeBranches.map((branch) => ({
    value: String(branch.id),
    label: branch.name,
  }));

  const isEdit = !!trainer;

  const initDefaults = useCallback(() => {
    if (trainer) {
      setName(trainer.name || '');
      setPhone(formatPhoneForInput(trainer.phone));
      setSpecialty(trainer.specialty || '');
      setBranchId(trainer.branch_id ? String(trainer.branch_id) : defaultBranchId);
    } else {
      setName('');
      setPhone('');
      setSpecialty('');
      setBranchId(defaultBranchId);
    }
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
  }, [trainer, defaultBranchId]);

  useModalFormDraft({
    isOpen,
    scopeKey: trainer?.id ?? 'create',
    initialize: initDefaults,
    saving,
  });

  useEffect(() => {
    if (!isOpen || !defaultBranchId) return;
    setBranchId((current) => current || defaultBranchId);
  }, [isOpen, defaultBranchId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const result = firstFailure(
      validateRequiredName(name),
      validateOptionalEthiopianPhone(phone),
      branchId ? { ok: true } : { ok: false, key: 'validation.branchRequired', field: 'branchId' },
    );
    if (!showValidationError(result, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim() || null,
      specialty: specialty.trim() || null,
      branch_id: parseInt(branchId, 10),
    });
  };

  const displayError =
    (validationError || error) && !Object.keys(fieldErrors).length ? validationError || error : '';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-[110]">
      <div className={`${modalHeader} flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          <h2 className={modalTitle}>
            {isEdit ? t('modals.trainer.editTitle') : t('modals.trainer.createTitle')}
          </h2>
          <p className="mt-1 text-sm text-app-muted">{t('modals.trainer.subtitle')}</p>
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

      <form onSubmit={handleSubmit} autoComplete="off" className="flex min-h-0 flex-1 flex-col">
        <div className={`${modalBody} space-y-4`}>
          {displayError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
              {displayError}
            </div>
          )}

          <SearchableSelect
            id="trainer-branch"
            label={t('modals.trainer.branch')}
            required
            value={branchId}
            options={branchOptions}
            placeholder={t('common.select')}
            error={Boolean(fieldErrors.branchId)}
            onChange={(next) => {
              setBranchId(String(next));
              clearFieldError(setLocalFieldErrors, 'branchId');
            }}
          />
          <FieldError message={fieldErrorMessage(fieldErrors, 'branchId')} />

          <div>
            <label className="form-label">
              {t('modals.trainer.name')}
              <RequiredMark />
            </label>
            <input
              type="text"
              required
              className={fc('name')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError(setLocalFieldErrors, 'name');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'name')} />
          </div>

          <div>
            <label className="form-label">{t('modals.trainer.phone')}</label>
            <input
              type="tel"
              inputMode="tel"
              className={fc('phone')}
              placeholder={t('modals.trainer.phonePlaceholder')}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError(setLocalFieldErrors, 'phone');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
          </div>

          <div>
            <label className="form-label">{t('modals.trainer.specialty')}</label>
            <input
              type="text"
              className={fc('specialty')}
              placeholder={t('modals.trainer.specialtyPlaceholder')}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? t('common.saving')
              : isEdit
                ? t('modals.trainer.saveUpdate')
                : t('modals.trainer.saveCreate')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
