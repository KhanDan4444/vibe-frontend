// src/components/MemberModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayString, formatDisplayDate } from '../utils/date';
import { formatMoney } from '../utils/formatMoney';
import {
  boundsForEnrollStart,
  boundsForPaymentOnTerm,
  clampPaymentToTerm,
} from '../utils/datePickerBounds';
import {
  formatPhoneForInput,
  validateMemberForm,
  validateMemberEnrollPayment,
  validateMemberPhotoFile,
  validateRequiredEthiopianPhone,
  showValidationError,
  parseMoneyAmount,
  inputClass,
  fieldErrorMessage,
  clearFieldError,
  clearAllFieldErrors,
} from '../utils/validation';
import { compressMemberPhoto } from '../utils/compressMemberPhoto';
import { PAYMENT_METHOD_OPTIONS } from '../i18n/helpers.js';
import FieldError from './FieldError';
import { DateField } from './DateField';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { modalBody, modalFieldLabel } from '../utils/modalLayout';

/**
 * Enroll (create) or edit a gym member.
 * Create mode includes payment fields — one submit enrolls + records payment.
 */
export default function MemberModal({
  isOpen,
  onClose,
  onSubmit,
  plans,
  member,
  branches = [],
  defaultBranchId,
  showBranchPicker = false,
  showPhotoUpload = false,
  apiFetch,
  saving = false,
  error,
  fieldErrors: externalFieldErrors = {},
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [skipPayment, setSkipPayment] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [hadExistingPhoto, setHadExistingPhoto] = useState(false);
  const lastModalModeRef = useRef(null);
  const phoneInputRef = useRef(null);
  const phoneRefocusLockRef = useRef(false);

  const isEdit = !!member;
  const fieldErrors = { ...externalFieldErrors, ...localFieldErrors };
  const baseFieldClass = 'admin-field mt-1 block w-full';
  const fc = (field) => inputClass(baseFieldClass, fieldErrors, field);

  const activeBranches = branches.filter((b) => b.is_active !== false);
  const resolvedDefaultBranch = String(defaultBranchId || activeBranches.find((b) => b.is_default)?.id || activeBranches[0]?.id || '');

  const initEnrollDefaults = useCallback(() => {
    setName('');
    setPhone('');
    setPlanId('');
    setStartDate(todayString());
    setBranchId(resolvedDefaultBranch);
    setPaymentDate(todayString());
    setMethod('Cash');
    setSkipPayment(false);
    setPhotoFile(null);
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return '';
    });
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    setAmount('');
  }, [resolvedDefaultBranch]);

  const initializeForm = useCallback(() => {
    if (member) {
      lastModalModeRef.current = 'edit';
      setName(member.name || '');
      setPhone(formatPhoneForInput(member.phone));
      setPlanId(member.planId || '');
      setStartDate(member.startDate || '');
      setBranchId(member.branchId ? String(member.branchId) : resolvedDefaultBranch);
      setPhotoFile(null);
      setPhotoRemoved(false);
      setHadExistingPhoto(Boolean(member.hasPhoto));
      setPhotoPreview((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
      return;
    }

    lastModalModeRef.current = 'enroll';
    initEnrollDefaults();
  }, [member, initEnrollDefaults, resolvedDefaultBranch]);

  const { markTouched, resetDraft } = useModalFormDraft({
    isOpen,
    scopeKey: member?.id ?? 'enroll',
    modeKey: member ? 'edit' : 'enroll',
    initialize: initializeForm,
    saving: saving || submitting || photoProcessing,
  });

  const markEnrollTouched = () => {
    if (!isEdit) markTouched();
  };

  /** Keep focus on phone and show the field error until the number is valid. */
  const ensurePhoneValid = useCallback(() => {
    const result = validateRequiredEthiopianPhone(phone);
    if (result.ok) {
      clearFieldError(setLocalFieldErrors, 'phone');
      return true;
    }
    showValidationError(result, setValidationError, t, { setFieldErrors: setLocalFieldErrors });
    return false;
  }, [phone, t]);

  const handlePhoneBlur = (e) => {
    if (phoneRefocusLockRef.current) return;
    if (ensurePhoneValid()) return;

    const next = e.relatedTarget;
    // Allow Cancel / close / leaving the modal; still keep the field error visible.
    if (!next || next.matches('button, [type="submit"], [type="button"]')) return;
    const form = e.currentTarget.form;
    if (form && !form.contains(next)) return;

    phoneRefocusLockRef.current = true;
    requestAnimationFrame(() => {
      phoneInputRef.current?.focus();
      phoneRefocusLockRef.current = false;
    });
  };

  const handlePhoneKeyDown = (e) => {
    // Block Tab (forward) / Enter from leaving an invalid phone field.
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      if (!ensurePhoneValid()) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !isEdit || !member?.id || !apiFetch || !member.hasPhoto) return undefined;

    let objectUrl;
    (async () => {
      try {
        const res = await apiFetch(`/members/${member.id}/photo`);
        if (!res.ok) return;
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setPhotoPreview(objectUrl);
        setHadExistingPhoto(true);
      } catch {
        // Keep fallback avatar when photo cannot be loaded.
      }
    })();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, isEdit, member?.id, member?.hasPhoto, apiFetch]);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!isOpen || isEdit || skipPayment) return;
    const plan = plans.find((p) => p.id === parseInt(planId, 10));
    setAmount(plan ? String(plan.price) : '');
  }, [planId, plans, isOpen, isEdit, skipPayment]);

  if (!isOpen) return null;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    if (!file) {
      setPhotoFile(null);
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview('');
      if (isEdit && hadExistingPhoto) setPhotoRemoved(true);
      return;
    }
    const photoResult = validateMemberPhotoFile(file);
    if (!showValidationError(photoResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors, field: 'photo' })) {
      e.target.value = '';
      return;
    }
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoRemoved(false);
    markEnrollTouched();
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview('');
    if (isEdit && hadExistingPhoto) setPhotoRemoved(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saving || photoProcessing) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);

    if (!showValidationError(validateMemberForm({ name, phone }), setValidationError, t, {
      setFieldErrors: setLocalFieldErrors,
    })) {
      return;
    }
    const trimmedPhone = phone.trim();

    if (isEdit) {
      setSubmitting(true);
      try {
        const editPayload = {
          name: name.trim(),
          phone: trimmedPhone,
        };
        if (showBranchPicker && branchId) {
          const parsedBranch = parseInt(branchId, 10);
          if (!Number.isNaN(parsedBranch) && parsedBranch !== member.branchId) {
            editPayload.branchId = parsedBranch;
          }
        }
        if (photoFile) {
          setPhotoProcessing(true);
          try {
            editPayload.photo = await compressMemberPhoto(photoFile);
          } catch (err) {
            setValidationError(err.message || t('validation.photoProcessFailed'));
            return;
          } finally {
            setPhotoProcessing(false);
          }
        } else if (photoRemoved && hadExistingPhoto) {
          editPayload.photo = null;
        }
        await onSubmit(editPayload);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (plans.length === 0) {
      setValidationError(t('validation.createPlanFirst'));
      return;
    }

    if (!planId) {
      showValidationError(
        { ok: false, key: 'validation.planNotSelected', field: 'planId' },
        setValidationError,
        t,
        { setFieldErrors: setLocalFieldErrors }
      );
      return;
    }

    const base = {
      name: name.trim(),
      phone: trimmedPhone,
      planId: parseInt(planId, 10),
      startDate,
    };

    const selectedPlan = plans.find((p) => p.id === parseInt(planId, 10));
    let photoDataUrl;
    if (photoFile) {
      setPhotoProcessing(true);
      try {
        photoDataUrl = await compressMemberPhoto(photoFile);
      } catch (err) {
        setValidationError(err.message || t('validation.photoProcessFailed'));
        return;
      } finally {
        setPhotoProcessing(false);
      }
    }

    if (!skipPayment) {
      const enrollAmount = selectedPlan ? String(selectedPlan.price) : amount;
      const paymentResult = validateMemberEnrollPayment({
        amount: enrollAmount,
        paymentDate,
        startDate,
        skipPayment,
        startDateDisplay: formatDisplayDate(startDate),
      });
      if (!showValidationError(paymentResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
      const parsedAmount = parseMoneyAmount(enrollAmount);
      setSubmitting(true);
      try {
        await onSubmit({
          ...base,
          amount: parsedAmount,
          paymentDate,
          method,
          skipPayment: false,
          branchId: showBranchPicker && branchId ? parseInt(branchId, 10) : undefined,
          photo: photoDataUrl,
        });
        resetDraft();
      } finally {
        setSubmitting(false);
      }
    } else {
      setSubmitting(true);
      try {
        await onSubmit({
          ...base,
          skipPayment: true,
          branchId: showBranchPicker && branchId ? parseInt(branchId, 10) : undefined,
          photo: photoDataUrl,
        });
        resetDraft();
      } finally {
        setSubmitting(false);
      }
    }
  };

  const displayError = validationError || error;
  const isBusy = saving || submitting || photoProcessing;

  const selectedPlan = plans.find((p) => String(p.id) === String(planId));
  const enrollAmount = selectedPlan ? String(selectedPlan.price) : amount;
  const memberFieldsReady = validateMemberForm({ name, phone }).ok;
  const enrollExtrasReady =
    plans.length > 0 &&
    Boolean(startDate) &&
    (!showBranchPicker || Boolean(branchId));
  const canSubmit = !isBusy && memberFieldsReady && (isEdit || enrollExtrasReady);

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="3xl">
      <div className={`${modalBody}relative`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text dark:hover:text-app-text-strong sm:right-3 sm:top-3"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="pr-10 text-lg font-bold text-app-text-strong mb-1">
          {isEdit ? t('modals.member.editTitle') : t('modals.member.enrollTitle')}
        </h2>
        <p className="text-sm text-app-muted mb-5">
          {isEdit ? t('modals.member.editSubtitle') : t('modals.member.enrollSubtitle')}
        </p>

        {displayError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
            {displayError}
          </div>
        )}

        {!isEdit && plans.length === 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200">
            {t('validation.createPlanFirst')}
          </div>
        )}

        <form onSubmit={handleSubmit} onChangeCapture={markTouched} className="space-y-4">
          <div>
            <label className={modalFieldLabel}>{t('modals.member.name')}</label>
            <input
              type="text"
              required
              placeholder={t('modals.member.namePlaceholder')}
              className={fc('name')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError(setLocalFieldErrors, 'name');
                markEnrollTouched();
              }}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'name')} />
          </div>
          <div>
            <label className={modalFieldLabel}>{t('modals.member.phone')}</label>
            <input
              ref={phoneInputRef}
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('modals.member.phonePlaceholder')}
              className={fc('phone')}
              value={phone}
              onChange={(e) => {
                const next = e.target.value;
                setPhone(next);
                markEnrollTouched();
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
              onBlur={handlePhoneBlur}
              onKeyDown={handlePhoneKeyDown}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
            <p className="mt-1 text-xs text-app-muted">{t('modals.member.phoneHint')}</p>
          </div>
          {showBranchPicker && activeBranches.length > 0 && (
            <div>
              <label className={modalFieldLabel}>{t('modals.member.branch')}</label>
              <select
                required={!isEdit}
                className={`${fc('branchId')}cursor-pointer`}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {activeBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.is_default ? t('branch.defaultSuffix') : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isEdit && !showBranchPicker && (member?.branchName || member?.branchId) && (
            <div>
              <label className={modalFieldLabel}>{t('modals.member.branch')}</label>
              <p className="mt-1 rounded-lg border border-app-border-subtle bg-app-surface px-3 py-2.5 text-sm text-app-text-strong">
                {member.branchName || activeBranches.find((b) => b.id === member.branchId)?.name || '—'}
              </p>
            </div>
          )}
          {showPhotoUpload && (
            <div>
              <label className={modalFieldLabel}>{t('modals.member.photo')}</label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-app-border-subtle bg-app-surface">
                  {photoPreview ? (
                    <img src={photoPreview} alt={t('modals.member.photoPreviewAlt')} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-7 w-7 text-app-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-app-border-subtle px-3 py-2 text-sm font-medium text-app-text-strong hover:bg-app-surface">
                    <Upload className="h-4 w-4" />
                    {t('modals.member.uploadPhoto')}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handlePhotoChange}
                    />
                  </label>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="block text-xs font-medium text-app-muted hover:text-app-text-strong"
                    >
                      {t('modals.member.removePhoto')}
                    </button>
                  )}
                  <p className="text-xs text-app-muted">{t('modals.member.photoHint')}</p>
                </div>
              </div>
            </div>
          )}
          {!isEdit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={modalFieldLabel}>{t('modals.member.plan')}</label>
              <select
                className={`${fc('planId')}cursor-pointer`}
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'planId');
                  markEnrollTouched();
                }}
                aria-invalid={Boolean(fieldErrors.planId)}
              >
                <option value="">{t('modals.renew.selectPlan')}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({formatMoney(p.price)})</option>
                ))}
              </select>
              <FieldError message={fieldErrorMessage(fieldErrors, 'planId')} />
            </div>
            <div>
              <label className={modalFieldLabel}>{t('modals.member.startDate')}</label>
              <DateField
                required
                className={`${fc('startDate')}cursor-pointer`}
                value={startDate}
                max={boundsForEnrollStart(skipPayment).max}
                onChange={(v) => {
                  setStartDate(v);
                  if (!skipPayment) setPaymentDate(clampPaymentToTerm(v, paymentDate));
                  clearFieldError(setLocalFieldErrors, 'startDate');
                  markEnrollTouched();
                }}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'startDate')} />
            </div>
          </div>
          )}

          {isEdit && member && (
            <div className="rounded-lg border border-app-border-subtle bg-app-surface px-3 py-2.5 text-sm text-app-text">
              <p>
                <span className="font-medium text-app-text-strong">{t('table.plan')}:</span>{' '}
                {plans.find((p) => p.id === member.planId)?.name || member.planName || '—'}
              </p>
              <p className="mt-1">
                <span className="font-medium text-app-text-strong">{t('modals.member.term')}:</span> {formatDisplayDate(member.startDate)} → {formatDisplayDate(member.endDate)}
              </p>
            </div>
          )}

          {!isEdit && (
            <>
              <div className="border-t border-app-border-subtle pt-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-app-text-strong">{t('modals.member.paymentSection')}</h3>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-app-text-strong">
                    <input
                      type="checkbox"
                      checked={skipPayment}
                      onChange={(e) => {
                        setSkipPayment(e.target.checked);
                        markEnrollTouched();
                      }}
                      className="rounded border-app-border-subtle bg-app-raised"
                    />
                    {t('actions.skipPayLater')}
                  </label>
                </div>

                {!skipPayment && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={modalFieldLabel}>{t('modals.member.amount')}</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          readOnly
                          className={`${fc('amount')}cursor-default bg-app-surface text-app-muted`}
                          value={amount}
                        />
                        <p className="mt-1 text-xs text-app-muted">{t('modals.member.amountFromPlan')}</p>
                        <FieldError message={fieldErrorMessage(fieldErrors, 'amount')} />
                      </div>
                      <div>
                        <label className={modalFieldLabel}>{t('modals.member.method')}</label>
                        <select
                          className={`${fc('method')}cursor-pointer`}
                          value={method}
                          onChange={(e) => setMethod(e.target.value)}
                        >
                          {PAYMENT_METHOD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {t(opt.labelKey)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={modalFieldLabel}>{t('modals.member.paymentDate')}</label>
                      <DateField
                        required
                        min={boundsForPaymentOnTerm(startDate).min}
                        max={boundsForPaymentOnTerm(startDate).max}
                        className={`${fc('paymentDate')}cursor-pointer`}
                        value={paymentDate}
                        onChange={(v) => {
                          setPaymentDate(v);
                          clearFieldError(setLocalFieldErrors, 'paymentDate');
                          markEnrollTouched();
                        }}
                      />
                      <FieldError message={fieldErrorMessage(fieldErrors, 'paymentDate')} />
                      {startDate && (
                        <p className="mt-1 text-xs text-app-muted">
                          {t('modals.member.paymentDateHint', { date: formatDisplayDate(startDate) })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {skipPayment && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200">
                    {t('modals.member.unpaidWarning')}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              {isBusy
                ? photoProcessing
                  ? t('modals.member.processingPhoto')
                  : t('common.processing')
                : isEdit
                ? t('modals.member.saveUpdate')
                : t('modals.member.saveEnroll')}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
