// src/components/MemberModal.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, User, ArrowLeft, Check, Camera } from 'lucide-react';
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
import { calculateEndDate } from '../utils/memberDates';
import { formatPlanDisplayName, resolveMemberPlanLabel } from '../utils/formatPlanDisplayName';
import { PAYMENT_METHOD_OPTIONS, translatePaymentMethod } from '../i18n/helpers.js';
import FieldError from './FieldError';
import { DateField } from './DateField';
import MoneyAmountInput from './ui/MoneyAmountInput';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import Card from './ui/Card';
import PageHeader from './PageHeader';
import SearchableSelect from './ui/SearchableSelect';
import RequiredMark from './ui/RequiredMark';
import EnrollStepProgress from './EnrollStepProgress';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { modalBody, modalHeader, modalFooter, modalStepFooter, modalFieldLabel } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';
import { listTrainers } from '../services/trainerService';
import { parseApiResponse } from '../utils/api';


/**
 * Enroll (create) or edit a gym member.
 * Create mode includes payment fields — one submit enrolls + records payment.
 * Use variant="page" for enroll (full page); variant="modal" for edit.
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
  variant = 'modal',
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [method, setMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [skipPayment, setSkipPayment] = useState(false);
  const [trainerId, setTrainerId] = useState('');
  const [trainerFee, setTrainerFee] = useState('');
  const [trainerFeeMethod, setTrainerFeeMethod] = useState('Cash');
  const [trainers, setTrainers] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [hadExistingPhoto, setHadExistingPhoto] = useState(false);
  const [enrollStep, setEnrollStep] = useState(1);
  const [enrollMaxStep, setEnrollMaxStep] = useState(1);
  const [enrollDone, setEnrollDone] = useState(null);
  const lastModalModeRef = useRef(null);

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
    setTrainerId('');
    setTrainerFee('');
    setTrainerFeeMethod('Cash');
    setPhotoFile(null);
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return '';
    });
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    setEnrollStep(1);
    setEnrollMaxStep(1);
    setEnrollDone(null);
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
      setTrainerId(member.trainerId ? String(member.trainerId) : '');
      setTrainerFee('');
      setTrainerFeeMethod('Cash');
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

  useEffect(() => {
    if (!isOpen || !apiFetch) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listTrainers(apiFetch);
        const data = await parseApiResponse(res);
        if (!cancelled && res.ok) setTrainers(data.trainers || []);
      } catch {
        if (!cancelled) setTrainers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, apiFetch]);

  const markEnrollTouched = () => {
    if (!isEdit) markTouched();
  };

  /** Show phone field error on blur; do not trap focus so users can edit other fields. */
  const handlePhoneBlur = () => {
    const result = validateRequiredEthiopianPhone(phone);
    if (result.ok) {
      clearFieldError(setLocalFieldErrors, 'phone');
      return;
    }
    showValidationError(result, setValidationError, t, { setFieldErrors: setLocalFieldErrors });
  };

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showValidationError(
        { ok: false, key: 'validation.fullNameRequired', field: 'name' },
        setValidationError,
        t,
        { setFieldErrors: setLocalFieldErrors }
      );
      return;
    }
    clearFieldError(setLocalFieldErrors, 'name');
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
    e?.preventDefault?.();
    // Stepped page enroll: ignore Enter / click-through until the payment step.
    if (variant === 'page' && !member && enrollStep < 3) {
      return;
    }
    if (submitting || saving || photoProcessing) return;
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);

    if (!showValidationError(validateMemberForm({ name, phone }), setValidationError, t, {
      setFieldErrors: setLocalFieldErrors,
    })) {
      return;
    }
    const trimmedPhone = phone.trim();

    const parsedTrainerId = trainerId ? parseInt(trainerId, 10) : null;
    const parsedTrainerFee = parseMoneyAmount(trainerFee);
    const trainerFields = {
      trainerId: Number.isNaN(parsedTrainerId) ? null : parsedTrainerId,
    };
    if (parsedTrainerFee > 0) {
      trainerFields.trainerFee = parsedTrainerFee;
      trainerFields.trainerFeeDate = paymentDate || todayString();
      trainerFields.trainerFeeMethod = isEdit || skipPayment ? trainerFeeMethod : method;
    }

    if (isEdit) {
      setSubmitting(true);
      try {
        const editPayload = {
          name: name.trim(),
          phone: trimmedPhone,
          ...trainerFields,
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
    const endDateIso = selectedPlan ? calculateEndDate(startDate, selectedPlan.duration) : '';
    const resolvedBranchId = String(branchId || resolvedDefaultBranch || '');
    const selectedBranch =
      activeBranches.find((b) => String(b.id) === resolvedBranchId) ||
      activeBranches.find((b) => b.is_default) ||
      activeBranches[0];
    const selectedTrainer = trainers.find((tr) => String(tr.id) === String(trainerId));
    const doneSummary = {
      name: base.name,
      phone: trimmedPhone,
      branchName: selectedBranch
        ? `${selectedBranch.name}${selectedBranch.is_default ? t('branch.defaultSuffix') : ''}`
        : '',
      planName: selectedPlan?.name || '',
      startDate,
      endDate: endDateIso && endDateIso !== '—' ? endDateIso : '',
      trainerName: selectedTrainer?.name || '',
      trainerFee: parsedTrainerFee > 0 ? parsedTrainerFee : null,
      trainerFeeMethod: parsedTrainerFee > 0
        ? (isEdit || skipPayment ? trainerFeeMethod : method)
        : '',
    };
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
      const enrollAmount = selectedPlan ? String(selectedPlan.price) : '';
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
          ...trainerFields,
        });
        if (variant === 'page') {
          setEnrollDone({
            ...doneSummary,
            skipPayment: false,
            amount: parsedAmount,
            method,
          });
          setEnrollStep(1);
          setEnrollMaxStep(1);
        } else {
          resetDraft();
        }
      } catch {
        /* Parent surfaces API error via `error` / fieldErrors props. */
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
          ...trainerFields,
        });
        if (variant === 'page') {
          setEnrollDone({
            ...doneSummary,
            skipPayment: true,
          });
          setEnrollStep(1);
          setEnrollMaxStep(1);
        } else {
          resetDraft();
        }
      } catch {
        /* Parent surfaces API error via `error` / fieldErrors props. */
      } finally {
        setSubmitting(false);
      }
    }
  };

  const displayError = validationError || error;
  const isBusy = saving || submitting || photoProcessing;
  const isPage = variant === 'page';
  const selectedPlan = plans.find((p) => String(p.id) === String(planId));
  const useSteps = isPage && !isEdit;
  const canContinueStep2 = plans.length > 0 && Boolean(planId) && Boolean(startDate);
  const computedEndDate =
    selectedPlan && startDate ? calculateEndDate(startDate, selectedPlan.duration) : '';
  const endDateValue = computedEndDate && computedEndDate !== '—' ? computedEndDate : '';
  const sectionTitleClass = 'text-sm font-semibold text-app-text-strong';

  const enrollSteps = [
    { id: 'member', label: t('modals.member.stepMember') },
    { id: 'membership', label: t('modals.member.stepPlan') },
    { id: 'payment', label: t('modals.member.stepPayment') },
  ];

  const branchOptions = activeBranches.map((branch) => ({
    value: String(branch.id),
    label: `${branch.name}${branch.is_default ? t('branch.defaultSuffix') : ''}`,
  }));
  const planOptions = plans.map((p) => ({
    value: String(p.id),
    label: `${formatPlanDisplayName(p.name)} (${formatMoney(p.price)})`,
  }));
  const trainerOptions = [
    { value: '', label: t('modals.member.noTrainer') },
    ...trainers.map((tr) => ({
      value: String(tr.id),
      label: tr.specialty ? `${tr.name} · ${tr.specialty}` : tr.name,
    })),
  ];

  const trainerAssignFields = (
    <section className="space-y-4 rounded-xl border border-app-border-subtle bg-app-surface/70 p-4">
      <h3 className={sectionTitleClass}>{t('modals.member.sectionTrainer')}</h3>
      {trainers.length === 0 ? (
        <p className="text-xs text-app-muted">{t('modals.member.noTrainersYet')}</p>
      ) : (
        <SearchableSelect
          id="member-trainer"
          label={t('modals.member.trainer')}
          value={trainerId}
          options={trainerOptions}
          placeholder={t('modals.member.noTrainer')}
          onChange={(next) => {
            setTrainerId(String(next ?? ''));
            markEnrollTouched();
          }}
        />
      )}
      {trainerId ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="member-trainer-fee" className={modalFieldLabel}>
              {t('modals.member.trainerFee')}
            </label>
            <MoneyAmountInput
              id="member-trainer-fee"
              field="trainerFee"
              min="0"
              fieldErrors={fieldErrors}
              value={trainerFee}
              onChange={(e) => {
                setTrainerFee(e.target.value);
                clearFieldError(setLocalFieldErrors, 'trainerFee');
                markEnrollTouched();
              }}
            />
            <p className="mt-1 text-xs text-app-muted">{t('modals.member.trainerFeeHint')}</p>
            <FieldError message={fieldErrorMessage(fieldErrors, 'trainerFee')} />
          </div>
          {parseMoneyAmount(trainerFee) > 0 && (isEdit || skipPayment) ? (
            <div>
              <label htmlFor="member-trainer-fee-method" className={modalFieldLabel}>
                {t('modals.member.method')}
              </label>
              <select
                id="member-trainer-fee-method"
                className={`ui-select ${fc('trainerFeeMethod')} cursor-pointer`}
                value={trainerFeeMethod}
                onChange={(e) => {
                  setTrainerFeeMethod(e.target.value);
                  markEnrollTouched();
                }}
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  const title = isEdit ? t('modals.member.editTitle') : t('modals.member.enrollTitle');
  const subtitle = isEdit ? t('modals.member.editSubtitle') : t('modals.member.enrollSubtitle');

  const validateEnrollStep = (step) => {
    if (step === 1) {
      const result = validateMemberForm({ name, phone });
      if (!showValidationError(result, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) {
        return false;
      }
      if (showBranchPicker && !branchId) {
        setValidationError(t('validation.branchRequired'));
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!planId) {
        showValidationError(
          { ok: false, key: 'validation.planNotSelected', field: 'planId' },
          setValidationError,
          t,
          { setFieldErrors: setLocalFieldErrors }
        );
        return false;
      }
      if (!startDate) {
        showValidationError(
          { ok: false, key: 'validation.startDateRequired', field: 'startDate' },
          setValidationError,
          t,
          { setFieldErrors: setLocalFieldErrors }
        );
        return false;
      }
      return true;
    }
    return true;
  };

  const goEnrollNext = () => {
    setValidationError('');
    if (enrollStep === 1) {
      if (!validateEnrollStep(1)) return;
      // Defer so the Continue click cannot land on a newly mounted Submit control.
      window.setTimeout(() => {
        setEnrollStep(2);
        setEnrollMaxStep((m) => Math.max(m, 2));
      }, 0);
      return;
    }
    if (enrollStep === 2) {
      if (!validateEnrollStep(2)) return;
      window.setTimeout(() => {
        setEnrollStep(3);
        setEnrollMaxStep((m) => Math.max(m, 3));
      }, 0);
    }
  };

  const selectEnrollStep = (n) => {
    if (n < 1 || n > enrollMaxStep || n === enrollStep) return;
    if (n > enrollStep) {
      for (let s = enrollStep; s < n; s += 1) {
        if (!validateEnrollStep(s)) return;
      }
    }
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
    setEnrollStep(n);
  };

  const startAnotherEnroll = () => {
    resetDraft();
    setEnrollDone(null);
    setEnrollStep(1);
    setEnrollMaxStep(1);
  };

  const photoBlock = showPhotoUpload ? (
    isPage && !isEdit ? (
      <div>
        <label className={modalFieldLabel}>{t('modals.member.photo')}</label>
        <label
          className={`mt-2 flex cursor-pointer items-center gap-4 rounded-xl border border-dashed px-1 py-2 transition-colors ${
            photoPreview
              ? 'border-teal-600/40 dark:border-teal-500/30'
              : 'border-transparent hover:border-app-border'
          }`}
        >
          <div
            className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-app-bg sm:h-24 sm:w-24 ${
              photoPreview
                ? 'ring-teal-600/50 dark:ring-teal-400/40'
                : 'bg-app-surface ring-app-border-subtle'
            }`}
          >
            {photoPreview ? (
              <img src={photoPreview} alt={t('modals.member.photoPreviewAlt')} className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-teal-700 dark:text-teal-400 sm:h-9 sm:w-9" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-app-text-strong">
              {photoPreview ? t('modals.member.changePhoto') : t('modals.member.addPhotoOptional')}
            </span>
            <span className="mt-0.5 block text-xs text-app-muted">
              {t('modals.member.photoHintShort')}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handlePhotoChange}
            />
          </div>
        </label>
        {photoPreview ? (
          <button
            type="button"
            onClick={clearPhoto}
            className="mt-2 text-xs font-medium text-app-muted hover:text-rose-700 dark:hover:text-rose-400"
          >
            {t('modals.member.removePhoto')}
          </button>
        ) : null}
      </div>
    ) : (
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
    )
  ) : null;

  const formFields = (
    <>
          {(!useSteps || enrollStep === 1) && (
          <section className="space-y-4">
            {!isEdit && isPage && !useSteps ? <h3 className={sectionTitleClass}>{t('modals.member.sectionMember')}</h3> : null}
            {useSteps ? <h3 className={sectionTitleClass}>{t('modals.member.sectionMember')}</h3> : null}
            <div>
              <label className={modalFieldLabel}>
                {t('modals.member.name')}
                <RequiredMark />
              </label>
              <input
                type="text"
                required={!useSteps}
                placeholder={t('modals.member.namePlaceholder')}
                className={fc('name')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError(setLocalFieldErrors, 'name');
                  markEnrollTouched();
                }}
                onBlur={handleNameBlur}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'name')} />
            </div>
            <div>
              <label className={modalFieldLabel}>
                {t('modals.member.phone')}
                <RequiredMark />
              </label>
              <input
                type="tel"
                required={!useSteps}
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
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
              <p className="mt-1 text-xs text-app-muted">{t('modals.member.phoneHint')}</p>
            </div>
            {showBranchPicker && activeBranches.length > 0 && (
              useSteps ? (
                <SearchableSelect
                  label={t('modals.member.branch')}
                  value={branchId}
                  onChange={(v) => {
                    setBranchId(v);
                    clearFieldError(setLocalFieldErrors, 'branchId');
                    markEnrollTouched();
                  }}
                  options={branchOptions}
                  placeholder={t('modals.member.branch')}
                  error={Boolean(fieldErrors.branchId)}
                  required
                />
              ) : (
              <div>
                <label className={modalFieldLabel}>
                  {t('modals.member.branch')}
                  <RequiredMark />
                </label>
                <select
                  required={!isEdit}
                  className={`ui-select ${fc('branchId')} cursor-pointer`}
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
              )
            )}
            {isEdit && !showBranchPicker && (member?.branchName || member?.branchId) && (
              <div>
                <label className={modalFieldLabel}>{t('modals.member.branch')}</label>
                <p className="mt-1 rounded-lg border border-app-border-subtle bg-app-surface px-3 py-2.5 text-sm text-app-text-strong">
                  {member.branchName || activeBranches.find((b) => b.id === member.branchId)?.name || '—'}
                </p>
              </div>
            )}
            {photoBlock}
          </section>
          )}

          {!isEdit && (!useSteps || enrollStep === 2) && (
            <section className={`space-y-4 ${isPage && !useSteps ? 'border-t border-app-border-subtle pt-5' : ''}`}>
              {isPage ? <h3 className={sectionTitleClass}>{t('modals.member.sectionMembership')}</h3> : null}
              <div className={`grid grid-cols-1 gap-4 ${useSteps ? '' : 'sm:grid-cols-2'}`}>
                <div>
                  {useSteps ? (
                    <SearchableSelect
                      label={t('modals.member.plan')}
                      value={planId}
                      onChange={(v) => {
                        setPlanId(v);
                        clearFieldError(setLocalFieldErrors, 'planId');
                        markEnrollTouched();
                      }}
                      options={planOptions}
                      placeholder={t('modals.renew.selectPlan')}
                      error={Boolean(fieldErrors.planId)}
                      required
                    />
                  ) : (
                    <>
                      <label className={modalFieldLabel}>
                        {t('modals.member.plan')}
                        <RequiredMark />
                      </label>
                      <select
                        className={`ui-select ${fc('planId')} cursor-pointer`}
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
                          <option key={p.id} value={p.id}>
                            {formatPlanDisplayName(p.name)} ({formatMoney(p.price)})
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <FieldError message={fieldErrorMessage(fieldErrors, 'planId')} />
                </div>
                <div>
                  <label className={modalFieldLabel}>
                    {t('modals.member.startDate')}
                    <RequiredMark />
                  </label>
                  <DateField
                    required={!useSteps}
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
                <div>
                  <label className={modalFieldLabel}>{t('modals.member.endDate')}</label>
                  <div
                    className={`${baseFieldClass} flex min-h-[42px] cursor-default items-center bg-app-surface text-app-muted`}
                    aria-live="polite"
                  >
                    {endDateValue ? formatDisplayDate(endDateValue) : '—'}
                  </div>
                  <p className="mt-1 text-xs text-app-muted">{t('modals.member.endDateHint')}</p>
                </div>
              </div>
            </section>
          )}

          {isEdit && member && (
            <div className="rounded-lg border border-app-border-subtle bg-app-surface px-3 py-2.5 text-sm text-app-text">
              <p>
                <span className="font-medium text-app-text-strong">{t('table.plan')}:</span>{' '}
                {resolveMemberPlanLabel(member, plans, '—')}
              </p>
              <p className="mt-1">
                <span className="font-medium text-app-text-strong">{t('modals.member.term')}:</span> {formatDisplayDate(member.startDate)} → {formatDisplayDate(member.endDate)}
              </p>
            </div>
          )}

          {isEdit && trainerAssignFields}

          {!isEdit && (!useSteps || enrollStep === 3) && (
            <section className={`space-y-4 ${isPage && !useSteps ? 'border-t border-app-border-subtle pt-5' : useSteps ? '' : 'border-t border-app-border-subtle pt-4'}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className={sectionTitleClass}>
                  {isPage ? t('modals.member.sectionPayment') : t('modals.member.paymentSection')}
                </h3>
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
                  <div className={`grid grid-cols-1 gap-4 ${useSteps ? '' : 'sm:grid-cols-2'}`}>
                    <div>
                      <p className={modalFieldLabel}>
                        {t('modals.member.amount')}
                        <RequiredMark />
                      </p>
                      <p className="mt-1.5 text-base font-semibold text-app-text-strong">
                        {selectedPlan ? formatMoney(selectedPlan.price) : t('modals.member.amountPickPlan')}
                      </p>
                      <p className="mt-1 text-xs text-app-muted">{t('modals.member.amountFromPlan')}</p>
                      <FieldError message={fieldErrorMessage(fieldErrors, 'amount')} />
                    </div>
                    <div>
                      <label className={modalFieldLabel}>
                        {t('modals.member.method')}
                        <RequiredMark />
                      </label>
                      <select
                        className={`ui-select ${fc('method')} cursor-pointer`}
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
                    <label className={modalFieldLabel}>
                      {t('modals.member.paymentDate')}
                      <RequiredMark />
                    </label>
                    <DateField
                      required={!useSteps}
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
              {trainerAssignFields}
            </section>
          )}
    </>
  );

  const formInner = isPage ? (
    <>
      {displayError && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {displayError}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        onChangeCapture={markTouched}
        className="space-y-6"
      >
        {formFields}
        <div className={modalStepFooter}>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs text-app-muted sm:text-left">
              {t('modals.member.stepOf', { current: enrollStep, total: 3 })}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              {enrollStep > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setValidationError('');
                    setEnrollStep((s) => s - 1);
                  }}
                  className="w-full sm:w-auto"
                >
                  {t('common.back')}
                </Button>
              ) : null}
              {enrollStep < 3 ? (
                <Button
                  type="button"
                  disabled={isBusy || (enrollStep === 2 && !canContinueStep2)}
                  onClick={goEnrollNext}
                  className="w-full sm:w-auto"
                >
                  {t('common.continue')}
                </Button>
              ) : (
                <Button
                  type="button"
                  loading={isBusy}
                  onClick={(e) => void handleSubmit(e)}
                  className="w-full sm:w-auto"
                >
                  {isBusy
                    ? photoProcessing
                      ? t('modals.member.processingPhoto')
                      : t('common.processing')
                    : t('modals.member.saveEnroll')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </>
  ) : (
    <form
      onSubmit={handleSubmit}
      onChangeCapture={markTouched}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className={`${modalBody} space-y-4`}>
        {displayError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
            {displayError}
          </div>
        )}
        {formFields}
      </div>
      <div className={modalFooter}>
        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isBusy} className="w-full sm:w-auto">
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
  );

  if (isPage) {
    if (!isOpen) return null;

    if (enrollDone) {
      const termLabel =
        enrollDone.startDate && enrollDone.endDate
          ? `${formatDisplayDate(enrollDone.startDate)} → ${formatDisplayDate(enrollDone.endDate)}`
          : enrollDone.startDate
            ? formatDisplayDate(enrollDone.startDate)
            : '';
      const paymentLabel = enrollDone.skipPayment
        ? t('status.unpaid')
        : [
            enrollDone.amount != null ? formatMoney(enrollDone.amount) : null,
            enrollDone.method ? translatePaymentMethod(enrollDone.method) : null,
          ]
            .filter(Boolean)
            .join(' · ');

      return (
        <div className="mx-auto w-full max-w-xl enroll-success-in">
          <Card className="overflow-hidden p-6 sm:p-8">
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="enroll-success-check mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-600/25 bg-emerald-500/10 dark:border-emerald-400/25">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  <Check className="h-9 w-9" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className={`${modalTitle} text-xl sm:text-2xl`}>
                {t('modals.member.successTitle')}
              </h2>
              <p className="mt-2.5 font-display text-2xl font-semibold tracking-tight text-app-text-strong sm:text-[1.75rem]">
                {enrollDone.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-app-muted sm:text-[15px]">
                {enrollDone.skipPayment
                  ? t('modals.member.successSkip')
                  : t('modals.member.successPaid')}
              </p>

              {(enrollDone.phone ||
                enrollDone.branchName ||
                enrollDone.planName ||
                termLabel ||
                paymentLabel ||
                enrollDone.trainerName) && (
                <dl className="mt-6 w-full divide-y divide-app-border-subtle rounded-xl border border-app-border-subtle bg-app-surface text-left text-sm">
                  {enrollDone.phone ? (
                    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                      <dt className="shrink-0 text-app-muted">{t('table.phone')}</dt>
                      <dd className="font-medium text-app-text-strong">{enrollDone.phone}</dd>
                    </div>
                  ) : null}
                  {enrollDone.branchName ? (
                    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                      <dt className="shrink-0 text-app-muted">{t('table.branch')}</dt>
                      <dd className="truncate font-medium text-app-text-strong">{enrollDone.branchName}</dd>
                    </div>
                  ) : null}
                  {enrollDone.planName ? (
                    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                      <dt className="shrink-0 text-app-muted">{t('table.plan')}</dt>
                      <dd className="truncate font-medium text-app-text-strong">
                        {formatPlanDisplayName(enrollDone.planName)}
                      </dd>
                    </div>
                  ) : null}
                  {termLabel ? (
                    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                      <dt className="shrink-0 text-app-muted">{t('modals.member.term')}</dt>
                      <dd className="font-medium text-app-text-strong">{termLabel}</dd>
                    </div>
                  ) : null}
                  {paymentLabel ? (
                    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                      <dt className="shrink-0 text-app-muted">{t('modals.member.sectionPayment')}</dt>
                      <dd
                        className={`font-medium ${
                          enrollDone.skipPayment
                            ? 'text-amber-800 dark:text-amber-300'
                            : 'text-app-text-strong'
                        }`}
                      >
                        {paymentLabel}
                      </dd>
                    </div>
                  ) : null}
                  {enrollDone.trainerName ? (
                    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                      <dt className="shrink-0 text-app-muted">{t('table.trainer')}</dt>
                      <dd className="truncate font-medium text-app-text-strong">{enrollDone.trainerName}</dd>
                    </div>
                  ) : null}
                  {enrollDone.trainerFee != null ? (
                    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                      <dt className="shrink-0 text-app-muted">{t('modals.member.trainerFee')}</dt>
                      <dd className="font-medium text-app-text-strong">
                        {[
                          formatMoney(enrollDone.trainerFee),
                          enrollDone.trainerFeeMethod
                            ? translatePaymentMethod(enrollDone.trainerFeeMethod)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              )}

              <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <Button type="button" onClick={startAnotherEnroll} className="w-full sm:w-auto">
                  {t('modals.member.enrollAnother')}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                  {t('modals.member.viewMembers')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-xl space-y-4 sm:space-y-5">
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={
            <Button type="button" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
              {t('pages.members.backToList')}
            </Button>
          }
        />
        <Card className="overflow-visible p-4 sm:p-6">
          <div className="mb-5">
            <EnrollStepProgress
              steps={enrollSteps}
              current={enrollStep}
              maxReached={enrollMaxStep}
              onSelect={selectEnrollStep}
            />
          </div>
          {formInner}
        </Card>
      </div>
    );
  }

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="3xl" zIndexClass="z-[110]">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <h2 className={modalTitle}>{title}</h2>
          <p className="mt-1 text-sm text-app-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-app-text dark:hover:text-app-text-strong"
          aria-label={t('aria.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {formInner}
    </ResponsiveModal>
  );
}
