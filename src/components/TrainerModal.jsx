import { useState, useCallback, useEffect } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { FileText, Upload, X } from 'lucide-react';
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
  validateRequiredEthiopianPhone,
  validateTrainerCertificationFile,
  readFileAsDataUrl,
  ACCEPTED_TRAINER_CERT_TYPES,
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
  const [certDataUrl, setCertDataUrl] = useState('');
  const [certFileName, setCertFileName] = useState('');
  const [hadCertification, setHadCertification] = useState(false);
  const [certRemoved, setCertRemoved] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(FORM_INPUT_CLASS, fieldErrors, field);

  const activeBranches = branches.filter((b) => b.is_active !== false);
  const defaultBranchId = String(
    activeBranches.find((b) => b.is_default)?.id ?? activeBranches[0]?.id ?? ''
  );
  const showBranchPicker = activeBranches.length > 1;
  const branchOptions = activeBranches.map((branch) => ({
    value: String(branch.id),
    label: branch.is_default ? `${branch.name}${t('branch.defaultSuffix')}` : branch.name,
  }));

  const isEdit = !!trainer;
  const showCertAttached = Boolean(certDataUrl) || (hadCertification && !certRemoved);

  const initDefaults = useCallback(() => {
    if (trainer) {
      setName(trainer.name || '');
      setPhone(formatPhoneForInput(trainer.phone));
      setSpecialty(trainer.specialty || '');
      setBranchId(trainer.branch_id ? String(trainer.branch_id) : defaultBranchId);
      setHadCertification(Boolean(trainer.has_certification || trainer.certification_url));
    } else {
      setName('');
      setPhone('');
      setSpecialty('');
      setBranchId(defaultBranchId);
      setHadCertification(false);
    }
    setCertDataUrl('');
    setCertFileName('');
    setCertRemoved(false);
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

  const handleCertChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = validateTrainerCertificationFile(file);
    if (!showValidationError(result, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) {
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCertDataUrl(dataUrl);
      setCertFileName(file.name);
      setCertRemoved(false);
      clearFieldError(setLocalFieldErrors, 'certification');
      setValidationError('');
    } catch {
      setValidationError(t('modals.trainer.certReadError'));
    }
  };

  const clearCertification = () => {
    setCertDataUrl('');
    setCertFileName('');
    if (hadCertification) setCertRemoved(true);
    clearFieldError(setLocalFieldErrors, 'certification');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const resolvedBranchId = branchId || defaultBranchId;
    const result = firstFailure(
      validateRequiredName(name),
      validateRequiredEthiopianPhone(phone),
      resolvedBranchId
        ? { ok: true }
        : { ok: false, key: 'validation.branchRequired', field: 'branchId' },
    );
    if (!showValidationError(result, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      specialty: specialty.trim() || null,
      branch_id: parseInt(resolvedBranchId, 10),
    };
    if (certDataUrl) payload.certification = certDataUrl;
    else if (isEdit && certRemoved) payload.certification = null;

    onSubmit(payload);
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

          {showBranchPicker ? (
            <>
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
            </>
          ) : null}

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
            <label className="form-label">
              {t('modals.trainer.phone')}
              <RequiredMark />
            </label>
            <input
              type="tel"
              required
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

          <div>
            <p className="form-label">{t('modals.trainer.certification')}</p>
            {showCertAttached ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-teal-600/25 bg-teal-950/20 px-3 py-3 dark:border-teal-500/20 dark:bg-teal-500/[0.07]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600/15 text-teal-700 dark:text-teal-300">
                  <FileText className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-app-text-strong">
                    {certFileName || t('modals.trainer.certAttached')}
                  </p>
                  <p className="mt-0.5 text-xs text-app-muted">{t('modals.trainer.certificationReady')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <label className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-600/10 dark:text-teal-300 dark:hover:bg-teal-500/10">
                    {t('modals.trainer.changeCertification')}
                    <input
                      type="file"
                      accept={ACCEPTED_TRAINER_CERT_TYPES.join(',')}
                      className="sr-only"
                      onChange={handleCertChange}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={clearCertification}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-app-muted transition hover:bg-app-surface hover:text-rose-400"
                  >
                    {t('modals.trainer.removeCertification')}
                  </button>
                </div>
              </div>
            ) : (
              <label className="group mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-app-border-subtle bg-app-surface/40 px-4 py-5 text-center transition hover:border-teal-600/40 hover:bg-teal-950/10 dark:hover:border-teal-500/30 dark:hover:bg-teal-500/[0.05]">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-app-raised text-app-muted shadow-sm ring-1 ring-app-border-subtle transition group-hover:text-teal-600 dark:group-hover:text-teal-400">
                  <Upload className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-app-text-strong">
                  {t('modals.trainer.attachCertification')}
                </span>
                <span className="max-w-[16rem] text-xs leading-relaxed text-app-muted">
                  {t('modals.trainer.certificationHint')}
                </span>
                <input
                  type="file"
                  accept={ACCEPTED_TRAINER_CERT_TYPES.join(',')}
                  className="sr-only"
                  onChange={handleCertChange}
                />
              </label>
            )}
            <FieldError message={fieldErrorMessage(fieldErrors, 'certification')} />
          </div>
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            {saving
              ? t('common.processing')
              : isEdit
                ? t('modals.trainer.saveUpdate')
                : t('modals.trainer.saveCreate')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
