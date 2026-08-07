import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toDateString, formatDisplayDate } from '../utils/date';
import { formatPhoneForInput, validateGymProfileEdit, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import { modalBody } from '../utils/modalLayout';

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
  const canSubmit = !saving && validateGymProfileEdit({ gymName: name, ownerName, phone }).ok;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
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
    <ResponsiveModal open={isOpen} onClose={onClose} size="md">
      <div className={`${modalBody} relative`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-app-text-strong mb-1 pr-8">{t('modals.gymEdit.title')}</h2>
        <p className="mb-5 text-sm text-app-muted">{t('modals.gymEdit.subtitle')}</p>

        {(validationError || error) && !Object.keys(fieldErrors).length && (
          <div className="ui-alert-rose mb-4">
            {validationError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-4">
          <div>
            <label className="form-label">{t('modals.gymEdit.gymName')}</label>
            <input
              type="text"
              required
              className={fc('gymName')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError(setLocalFieldErrors, 'gymName');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'gymName')} />
          </div>
          <div>
            <label className="form-label">{t('modals.registerGym.ownerName')}</label>
            <input
              type="text"
              required
              className={fc('ownerName')}
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value);
                clearFieldError(setLocalFieldErrors, 'ownerName');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'ownerName')} />
          </div>
          <div>
            <label className="form-label">{t('modals.gymEdit.phone')}</label>
            <input
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('auth.phonePlaceholder')}
              className={fc('phone')}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError(setLocalFieldErrors, 'phone');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
          </div>

          <div className="ui-info-panel">
            <p>
              <span className="font-medium">SaaS plan:</span> {planName}
            </p>
            <p className="mt-1">
              <span className="font-medium">License:</span>{' '}
              {formatDisplayDate(sub.start_date)} → {formatDisplayDate(sub.end_date)}
            </p>
          </div>

          <div>
            <label className="form-label">{t('modals.gymEdit.subscriptionStatus')}</label>
            <select
              className="mt-1 block w-full rounded-lg border border-app-border-subtle bg-app-raised px-3 py-2 text-sm text-app-text focus:border-teal-600 focus:outline-none cursor-pointer"
              value={subscriptionStatus}
              onChange={(e) => setSubscriptionStatus(e.target.value)}
            >
              <option value="active">Active — full platform access</option>
              <option value="suspended">Suspended — read-only (view data, no changes)</option>
              <option value="expired">Expired — full lockout until renewed</option>
            </select>
            <p className="mt-1.5 text-xs text-app-muted">
              Suspended gyms can still log in and view data. Expired gyms cannot access the platform.
            </p>
          </div>

          <div className="pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              {saving ? t('common.processing') : t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
