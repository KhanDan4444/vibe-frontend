import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDisplayDate } from '../utils/date';
import { formatPhoneForInput, validateGymProfileEdit, validateRequiredEthiopianPhone, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';


/**
 * Edit gym tenant contact details (admin). SaaS plan changes use Change plan or Renew.
 */
export default function GymEditModal({
  isOpen,
  onClose,
  onSubmit,
  gym,
  saasPlans,
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(`${FORM_INPUT_CLASS}`, fieldErrors, field);

  const initDefaults = useCallback(() => {
    if (!gym) return;
    setName(gym.name || '');
    setOwnerName(gym.owner_name || '');
    setPhone(formatPhoneForInput(gym.phone));
    setSubscriptionStatus(gym.subscription_status?.toLowerCase() || 'active');
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
  }, [gym]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: gym?.id,
    initialize: initDefaults,
    saving,
  });

  if (!isOpen || !gym) return null;

  const sub = gym.saas_subscription || {};
  const planName =
    sub.saas_plan_catalog_name ||
    sub.plan ||
    saasPlans.find((p) => p.id === sub.saas_plan_id)?.name ||
    '—';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    if (!showValidationError(validateGymProfileEdit({ gymName: name, ownerName, phone }), setValidationError, t, { setFieldErrors: setLocalFieldErrors })) {
      return;
    }
    const trimmedPhone = phone.trim();
    onSubmit({
      name: name.trim(),
      owner_name: ownerName.trim(),
      phone: trimmedPhone,
      subscription_status: subscriptionStatus,
    });
  };

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-[110]">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0 pr-2">
          <h2 className={modalTitle}>{t('modals.gymEdit.title')}</h2>
          <p className="mt-1 text-sm text-app-muted">{t('modals.gymEdit.subtitle')}</p>
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

      <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="flex min-h-0 flex-1 flex-col">
        <div className={`${modalBody} space-y-4`}>
          {(validationError || error) && !Object.keys(fieldErrors).length && (
            <div className="ui-alert-rose">
              {validationError || error}
            </div>
          )}

          <div>
            <label className="form-label">
              {t('modals.gymEdit.gymName')}
              <RequiredMark />
            </label>
            <input
              type="text"
              required
              placeholder={t('modals.registerGym.gymNamePlaceholder')}
              className={fc('gymName')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError(setLocalFieldErrors, 'gymName');
              }}
              aria-invalid={Boolean(fieldErrors.gymName)}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'gymName')} />
          </div>
          <div>
            <label className="form-label">
              {t('modals.registerGym.ownerName')}
              <RequiredMark />
            </label>
            <input
              type="text"
              required
              placeholder={t('modals.registerGym.ownerNamePlaceholder')}
              className={fc('ownerName')}
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value);
                clearFieldError(setLocalFieldErrors, 'ownerName');
              }}
              aria-invalid={Boolean(fieldErrors.ownerName)}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'ownerName')} />
          </div>
          <div>
            <label className="form-label">
              {t('modals.gymEdit.phone')}
              <RequiredMark />
            </label>
            <input
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('auth.phonePlaceholder')}
              className={fc('phone')}
              value={phone}
              onChange={(e) => {
                const next = e.target.value;
                setPhone(next);
                const trimmed = next.trim();
                if (!trimmed) {
                  clearFieldError(setLocalFieldErrors, 'phone');
                  return;
                }
                const result = validateRequiredEthiopianPhone(trimmed);
                if (result.ok) {
                  clearFieldError(setLocalFieldErrors, 'phone');
                } else {
                  showValidationError(result, setValidationError, t, { setFieldErrors: setLocalFieldErrors });
                }
              }}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
            <p className="mt-1 text-xs text-app-muted">{t('modals.gymEdit.phoneHint')}</p>
          </div>

          <div className="ui-info-panel">
            <p>
              <span className="font-medium">{t('modals.gymEdit.saasPlanLabel')}</span> {planName}
            </p>
            <p className="mt-1">
              <span className="font-medium">{t('modals.gymEdit.licenseLabel')}</span>{' '}
              {formatDisplayDate(sub.start_date)} → {formatDisplayDate(sub.end_date)}
            </p>
          </div>

          <div>
            <label className="form-label">
              {t('modals.gymEdit.subscriptionStatus')}
              <RequiredMark />
            </label>
            <select
              className={`ui-select ${FORM_INPUT_CLASS} cursor-pointer`}
              value={subscriptionStatus}
              onChange={(e) => setSubscriptionStatus(e.target.value)}
            >
              <option value="active">{t('modals.gymEdit.statusActive')}</option>
              <option value="suspended">{t('modals.gymEdit.statusSuspended')}</option>
              <option value="expired">{t('modals.gymEdit.statusExpired')}</option>
            </select>
            <p className="mt-1.5 text-xs text-app-muted">
              {t('modals.gymEdit.statusHint')}
            </p>
          </div>
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? t('common.processing') : t('common.save')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
