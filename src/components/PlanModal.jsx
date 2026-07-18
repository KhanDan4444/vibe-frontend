// src/components/PlanModal.jsx
import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validatePlanForm, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../utils/validation';
import FieldError from './FieldError';
import ResponsiveModal from './ResponsiveModal';
import { modalBody } from '../utils/modalLayout';

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
 */
export default function PlanModal({ isOpen, onClose, onSubmit, plan, showDescription = false, title, saving = false }) {
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

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="xl" zIndexClass="z-50">
      <div className={`${modalBody} relative sm:min-h-[280px]`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-app-text dark:hover:bg-app-surface/80 sm:right-0 sm:top-0"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong mb-6 pr-8">{modalTitle}</h2>

        {validationError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-4">
          <div>
            <label className="form-label">{t('modals.plan.name')}</label>
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
              <label className="form-label">{t('modals.plan.duration')}</label>
              <input
                type="number"
                required
                min="1"
                placeholder="1"
                className={fc('duration')}
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'duration');
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'duration')} />
            </div>
            <div>
              <label className="form-label">{t('modals.plan.price')}</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="29.99"
                className={fc('price')}
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
                className="mt-1 block w-full h-20 resize-none rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm text-slate-900 dark:text-app-text-strong focus:border-teal-600 focus:outline-none"
                placeholder={t('modals.plan.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          <div className="pt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-200 dark:border-app-border-subtle px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 sm:w-auto"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 sm:w-auto"
            >
              {saving ? t('common.processing') : isEdit ? t('modals.plan.saveUpdate') : t('modals.plan.saveCreate')}
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
