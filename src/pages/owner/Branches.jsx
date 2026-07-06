import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { MapPin, Plus, Edit, Star } from 'lucide-react';
import { parseApiResponse, apiErrorFromResponse } from '../../utils/api';
import { listBranches, createBranch, updateBranch, reassignBranchStaff } from '../../services/branchService';
import ReassignStaffModal from '../../components/ReassignStaffModal';
import ResponsiveModal from '../../components/ResponsiveModal';
import { modalBody, modalHeader, modalFooter } from '../../utils/modalLayout';
import { useTranslation } from 'react-i18next';
import { validateBranchForm, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors } from '../../utils/validation';
import FieldError from '../../components/FieldError';
import { useModalFormDraft } from '../../utils/useModalFormDraft';
import { tableRowHover } from '../../utils/surfaceClasses';

function BranchModal({ isOpen, onClose, branch, onSubmit, saving, error }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass('w-full rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-sm', fieldErrors, field);

  const initDefaults = useCallback(() => {
    setName(branch?.name || '');
    setPhone(branch?.phone || '');
    setAddress(branch?.address || '');
    setValidationError('');
    clearAllFieldErrors(setLocalFieldErrors);
  }, [branch]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: branch?.id ?? 'create',
    initialize: initDefaults,
    saving,
  });

  if (!isOpen) return null;

  const isEdit = !!branch;

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-[100]">
      <div className={modalHeader}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong">
          {isEdit ? t('pages.branches.formEdit') : t('pages.branches.formAdd')}
        </h2>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setValidationError('');
          clearAllFieldErrors(setLocalFieldErrors);
          const branchResult = validateBranchForm({ name, phone, address });
          if (!showValidationError(branchResult, setValidationError, t, { setFieldErrors: setLocalFieldErrors })) return;
          setValidationError('');
          onSubmit({
            name: name.trim(),
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
          });
        }}
        onChangeCapture={markTouched}
      >
        <div className={`${modalBody} space-y-4`}>
          {(validationError || error) && !Object.keys(fieldErrors).length && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {validationError || error}
            </div>
          )}
          <div>
            <label className="form-label">{t('pages.branches.nameLabel')}</label>
            <input
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError(setLocalFieldErrors, 'name');
              }}
              className={fc('name')}
              placeholder={t('pages.branches.namePlaceholder')}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'name')} />
          </div>
          <div>
            <label className="form-label">{t('table.phone')}</label>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError(setLocalFieldErrors, 'phone');
              }}
              className={fc('phone')}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'phone')} />
          </div>
          <div>
            <label className="form-label">{t('table.location')}</label>
            <textarea
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                clearFieldError(setLocalFieldErrors, 'address');
              }}
              rows={2}
              className={fc('address')}
            />
            <FieldError message={fieldErrorMessage(fieldErrors, 'address')} />
          </div>
        </div>
        <div className={modalFooter}>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-app-text hover:bg-slate-100 sm:w-auto"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
          >
            {saving ? t('common.processing') : isEdit ? t('modals.staff.saveUpdate') : t('pages.branches.formAdd')}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
}

export default function Branches() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const { showFlash, reloadBranches, readOnly } = useGym();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, branch: null });
  const [reassignState, setReassignState] = useState({ open: false, branch: null, deactivateAfter: false });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listBranches(apiFetch);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load branches');
      setBranches(data.branches || []);
    } catch (err) {
      setError(err.message);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    if (readOnly) {
      setModalError(t('alerts.readOnlyBody'));
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      const res = modal.branch
        ? await updateBranch(apiFetch, modal.branch.id, payload)
        : await createBranch(apiFetch, payload);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save branch');
      setModal({ open: false, branch: null });
      showFlash(modal.branch ? t('pages.branches.branchUpdated') : t('pages.branches.branchCreated'));
      await Promise.all([load(), reloadBranches()]);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivateBranch = async (branch) => {
    if (readOnly) {
      throw apiErrorFromResponse({ error: t('alerts.readOnlyBody'), code: 'SUBSCRIPTION_READ_ONLY' }, 403);
    }
    const res = await updateBranch(apiFetch, branch.id, { is_active: false });
    const data = await parseApiResponse(res);
    if (!res.ok) throw apiErrorFromResponse(data, res.status);
    showFlash(t('pages.branches.branchDeactivated', { name: branch.name }));
    await Promise.all([load(), reloadBranches()]);
  };

  const toggleActive = async (branch) => {
    if (branch.is_default) return;
    if (readOnly) {
      setError(t('alerts.readOnlyBody'));
      return;
    }

    if (branch.is_active) {
      const staffCount = branch.staff_count ?? 0;
      if (staffCount > 0) {
        setReassignState({ open: true, branch, deactivateAfter: true });
        return;
      }
    }

    try {
      if (branch.is_active) {
        await deactivateBranch(branch);
      } else {
        const res = await updateBranch(apiFetch, branch.id, { is_active: true });
        const data = await parseApiResponse(res);
        if (!res.ok) throw apiErrorFromResponse(data, res.status);
        showFlash(t('pages.branches.branchReactivated', { name: branch.name }));
        await Promise.all([load(), reloadBranches()]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const setAsDefault = async (branch) => {
    if (branch.is_default || !branch.is_active) return;
    if (readOnly) {
      setError(t('alerts.readOnlyBody'));
      return;
    }
    try {
      const res = await updateBranch(apiFetch, branch.id, { is_default: true });
      const data = await parseApiResponse(res);
      if (!res.ok) throw apiErrorFromResponse(data, res.status);
      showFlash(t('pages.branches.branchDefaultSet', { name: branch.name }));
      await Promise.all([load(), reloadBranches()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReassignStaff = async (targetBranchId) => {
    if (!reassignState.branch) return;
    if (readOnly) {
      setModalError(t('alerts.readOnlyBody'));
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      const res = await reassignBranchStaff(apiFetch, reassignState.branch.id, targetBranchId);
      const data = await parseApiResponse(res);
      if (!res.ok) throw apiErrorFromResponse(data, res.status);

      const branch = reassignState.branch;
      const deactivateAfter = reassignState.deactivateAfter;
      setReassignState({ open: false, branch: null, deactivateAfter: false });

      if (deactivateAfter) {
        await deactivateBranch(branch);
      } else {
        showFlash(t('pages.branches.staffMoved', {
          count: data.moved,
          branch: data.target_branch?.name || t('pages.branches.selectedBranch'),
        }));
        await Promise.all([load(), reloadBranches()]);
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-app-text-strong sm:text-2xl">{t('pages.branches.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('pages.branches.subtitle')}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setModalError('');
              setModal({ open: true, branch: null });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            {t('pages.branches.add')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised shadow-sm">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">{t('common.loading')}</div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <MapPin className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-app-text">{t('pages.branches.empty')}</p>
          </div>
        ) : (
          <>
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
              {branches.map((branch) => (
                <div key={branch.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-app-text-strong">
                        {branch.name}
                        {branch.is_default && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {t('common.default')}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {branch.member_count ?? 0} {t('table.members')} · {branch.staff_count ?? 0} {t('nav.team')}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          branch.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-app-surface dark:text-app-muted dark:border-app-border-subtle'
                        }`}
                      >
                        {branch.is_active ? t('status.active') : t('common.inactive')}
                      </span>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setModalError('');
                          setModal({ open: true, branch });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-xs font-medium text-indigo-600 active:bg-indigo-50"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        {t('common.edit')}
                      </button>
                      {!branch.is_default && branch.is_active && (
                        <button
                          type="button"
                          onClick={() => setAsDefault(branch)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 active:bg-amber-50"
                        >
                          <Star className="h-3.5 w-3.5" />
                          {t('actions.setDefault')}
                        </button>
                      )}
                      {(branch.staff_count ?? 0) > 0 && branch.is_active && (
                        <button
                          type="button"
                          onClick={() => setReassignState({ open: true, branch, deactivateAfter: false })}
                          className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-xs font-medium text-slate-600 dark:text-app-text active:bg-slate-50"
                        >
                          {t('modals.reassignStaff.title')}
                        </button>
                      )}
                      {!branch.is_default && (
                        <button
                          type="button"
                          onClick={() => toggleActive(branch)}
                          className="rounded-lg border border-slate-200 dark:border-app-border-subtle px-3 py-2 text-xs font-medium text-slate-600 dark:text-app-text active:bg-slate-50"
                        >
                          {branch.is_active ? t('actions.deactivate') : t('actions.activate')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
            <table className="admin-data-table owner-branches-table min-w-[720px]">
              <thead>
                <tr>
                  <th>{t('table.name')}</th>
                  <th>{t('table.members')}</th>
                  <th>{t('nav.team')}</th>
                  <th>{t('table.status')}</th>
                  {!readOnly && <th className="text-right">{t('table.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className={tableRowHover}>
                    <td className="font-medium text-slate-900 dark:text-app-text-strong">
                      <span className="truncate">{branch.name}</span>
                      {branch.is_default && (
                        <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:border-app-border-subtle dark:bg-app-surface dark:text-app-muted">
                          {t('common.default')}
                        </span>
                      )}
                    </td>
                    <td>{branch.member_count ?? 0}</td>
                    <td>{branch.staff_count ?? 0}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          branch.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-app-surface dark:text-app-muted dark:border-app-border-subtle'
                        }`}
                      >
                        {branch.is_active ? t('status.active') : t('common.inactive')}
                      </span>
                    </td>
                    {!readOnly && (
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setModalError('');
                            setModal({ open: true, branch });
                          }}
                          className="mr-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-indigo-600 hover:bg-indigo-50"
                        >
                          <Edit className="h-4 w-4" />
                          {t('common.edit')}
                        </button>
                        {!branch.is_default && branch.is_active && (
                          <button
                            type="button"
                            onClick={() => setAsDefault(branch)}
                            className="mr-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-amber-700 hover:bg-amber-50"
                            title={t('pages.branches.defaultBranch')}
                          >
                            <Star className="h-4 w-4" />
                            {t('actions.setDefault')}
                          </button>
                        )}
                        {(branch.staff_count ?? 0) > 0 && branch.is_active && (
                          <button
                            type="button"
                            onClick={() => setReassignState({ open: true, branch, deactivateAfter: false })}
                            className="mr-2 rounded-lg px-2 py-1 text-slate-600 dark:text-app-text hover:bg-slate-100"
                          >
                            {t('modals.reassignStaff.title')}
                          </button>
                        )}
                        {!branch.is_default && (
                          <button
                            type="button"
                            onClick={() => toggleActive(branch)}
                            className="rounded-lg px-2 py-1 text-slate-600 dark:text-app-text hover:bg-slate-100"
                          >
                            {branch.is_active ? t('actions.deactivate') : t('actions.activate')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <BranchModal
        isOpen={modal.open}
        branch={modal.branch}
        onClose={() => setModal({ open: false, branch: null })}
        onSubmit={handleSubmit}
        saving={saving}
        error={modalError}
      />

      <ReassignStaffModal
        isOpen={reassignState.open}
        branch={reassignState.branch}
        branches={branches}
        deactivateAfter={reassignState.deactivateAfter}
        onClose={() => setReassignState({ open: false, branch: null, deactivateAfter: false })}
        onSubmit={handleReassignStaff}
        saving={saving}
        error={modalError}
      />
    </div>
  );
}
