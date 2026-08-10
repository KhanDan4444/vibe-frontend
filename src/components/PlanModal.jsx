// src/components/PlanModal.jsx
import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validatePlanForm, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import MoneyAmountInput from './ui/MoneyAmountInput';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';

const NUMBER_FIELD_CLASS =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

/**
 * A modular modal handling both Plan creation and editing.
 * Used by the gym owner Plans page and the admin SaaS Plans page.
 * Manages its own form state immutably.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Controls visibility.
 * @param {() => void} props.onClose - Dismisses the modal.
 * @param {(data: object) => void} props.onSubmit - Called with form data on valid submit.
 * @param {object|null} [props.plan] - Plan to edit; null/undefined = create mode.
 * @param {boolean} [props.showDescription=false] - Whether to show the description textarea (admin plans).
 * @param {string} [props.title] - Optional modal title override.
 * @param {boolean} [props.saving=false] - Disables submit and shows loading state.
 * @param {string} [props.error] - Optional page-level error to show in the modal banner.
 */
export default function PlanModal({ isOpen, onClose, onSubmit, plan, showDescription = false, title, saving = false, error }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(FORM_INPUT_CLASS, fieldErrors, field);

  const initDefaults = useCallback(() => {
    if (plan) {
      setName(plan.name || '');
      setDuration(String(plan.duration || ''));
      setPrice(String(plan.price || ''));
      setDescription(plan.description || '');
    } else {
      setName('');
      setDuration('');
      setPrice('');
      setDescription('');
    }
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
  }, [plan]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: plan?.id ?? 'create',
    initialize: initDefaults,
    saving,
  });

  if (!isOpen) return null;

  const isEdit = !!plan;
  const modalTitle = title || (isEdit ? t('modals.plan.editTitle') : t('modals.plan.createTitle'));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    const planResult = validatePlanForm({ name, duration, price });
    if (!showValidationError(planResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
    setValidationError('');
    const payload = {
      name: name.trim(),
      duration: parseInt(duration, 10),
      price: parseFloat(price),
    };
    if (showDescription) {
      payload.description = description.trim() || null;
    }
    onSubmit(payload);
  };

  const displayError =
    (validationError || error) && !Object.keys(fieldErrors).length ? validationError || error : '';

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-50">
      <div className={`${modalHeader} flex items-center justify-between gap-3`}>
        <h2 className="text-lg font-bold text-app-text-strong">{modalTitle}</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="flex min-h-0 flex-1 flex-col">
        <div className={`${modalBody} space-y-4`}>
          {displayError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {displayError}
            </div>
          )}

          <div>
            <label className="form-label">
              {t('modals.plan.name')}
              <RequiredMark />
            </label>
            <input
              type="text"
              required
              placeholder={t('modals.plan.namePlaceholder')}
              className={fc('name')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError(setLocalFieldErrors, 'name');
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'name')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                {t('modals.plan.duration')}
                <RequiredMark />
              </label>
              <input
                type="number"
                required
                min="1"
                inputMode="numeric"
                placeholder="1"
                className={`${fc('duration')} ${NUMBER_FIELD_CLASS}`}
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'duration');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'duration')} />
            </div>
            <div>
              <label className="form-label">
                {t('modals.plan.price')}
                <RequiredMark />
              </label>
              <MoneyAmountInput
                required
                min="0"
                field="price"
                fieldErrors={fieldErrors}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'price');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'price')} />
            </div>
          </div>

          {showDescription && (
            <div>
              <label className="form-label">{t('modals.plan.description')}</label>
              <textarea
                className="mt-1 w-full app-field h-20 resize-none"
                placeholder={t('modals.plan.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? t('common.processing') : isEdit ? t('modals.plan.saveUpdate') : t('modals.plan.saveCreate')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
