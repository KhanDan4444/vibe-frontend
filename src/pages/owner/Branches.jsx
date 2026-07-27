import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { MapPin, Plus, Edit, Star, Ban, CheckCircle } from 'lucide-react';
import { parseApiResponse, apiErrorFromResponse } from '../../utils/api';
import { listBranches, createBranch, updateBranch } from '../../services/branchService';
import ResponsiveModal from '../../components/ResponsiveModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { modalBody, modalHeader, modalFooter } from '../../utils/modalLayout';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { runInBackground } from '../../utils/runInBackground';
import { validateBranchForm, showValidationError, inputClass, fieldErrorMessage, clearFieldError, clearAllFieldErrors, FORM_INPUT_CLASS } from '../../utils/validation';
import FieldError from '../../components/FieldError';
import { useModalFormDraft } from '../../utils/useModalFormDraft';
import { tableRowHover } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

function BranchModal({ isOpen, onClose, branch, onSubmit, saving, error }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState({});
  const fieldErrors = localFieldErrors;
  const fc = (field) => inputClass(FORM_INPUT_CLASS, fieldErrors, field);

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
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving || !name.trim()} className="w-full sm:w-auto">
            {saving ? t('common.processing') : isEdit ? t('modals.staff.saveUpdate') : t('pages.branches.formAdd')}
          </Button>
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
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);

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
      showFlash(flashFromKey(t, modal.branch ? 'branchUpdated' : 'branchCreated'));
      runInBackground(Promise.all([load(), reloadBranches()]));
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
    showFlash(flashFromKey(t, 'branchDeactivated', { subtitleParams: { name: branch.name } }));
    runInBackground(Promise.all([load(), reloadBranches()]));
  };

  const toggleActive = async (branch) => {
    if (branch.is_default) return;
    if (readOnly) {
      setError(t('alerts.readOnlyBody'));
      return;
    }

    if (branch.is_active) {
      setDeactivateTarget(branch);
      return;
    }

    setError('');
    try {
      const res = await updateBranch(apiFetch, branch.id, { is_active: true });
      const data = await parseApiResponse(res);
      if (!res.ok) throw apiErrorFromResponse(data, res.status);
      showFlash(flashFromKey(t, 'branchReactivated', { subtitleParams: { name: branch.name } }));
      runInBackground(Promise.all([load(), reloadBranches()]));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const branch = deactivateTarget;
    setDeactivateTarget(null);
    setError('');
    try {
      await deactivateBranch(branch);
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
      showFlash(flashFromKey(t, 'branchDefaultSet', { subtitleParams: { name: branch.name } }));
      runInBackground(Promise.all([load(), reloadBranches()]));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('pages.branches.title')}
        subtitle={t('pages.branches.subtitle')}
        actions={
          !readOnly ? (
            <Button
              onClick={() => {
                setModalError('');
                setModal({ open: true, branch: null });
              }}
            >
              <Plus className="h-4 w-4" />
              {t('pages.branches.add')}
            </Button>
          ) : null
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <>
            <div className="lg:hidden">
              <AdminListSkeleton rows={4} />
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="admin-data-table">
                <tbody>
                  <AdminTableRowsSkeleton rows={4} cols={5} />
                </tbody>
              </table>
            </div>
          </>
        ) : branches.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={t('pages.branches.emptyTitle')}
            body={t('pages.branches.emptyBody')}
          />
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
                    <div className="admin-row-actions mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setModalError('');
                          setModal({ open: true, branch });
                        }}
                        className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface/80 cursor-pointer"
                        title={t('common.edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {!branch.is_default && branch.is_active && (
                        <button
                          type="button"
                          onClick={() => setAsDefault(branch)}
                          className="text-slate-400 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-app-surface/80 cursor-pointer"
                          title={t('actions.setDefault')}
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      {!branch.is_default && (
                        <button
                          type="button"
                          onClick={() => toggleActive(branch)}
                          className={
                            branch.is_active
                              ? 'text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-app-surface/80 cursor-pointer'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-app-surface/80 cursor-pointer'
                          }
                          title={branch.is_active ? t('actions.deactivate') : t('actions.activate')}
                        >
                          {branch.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
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
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setModalError('');
                              setModal({ open: true, branch });
                            }}
                            className="text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-app-surface/80 cursor-pointer"
                            title={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {!branch.is_default && branch.is_active && (
                            <button
                              type="button"
                              onClick={() => setAsDefault(branch)}
                              className="text-slate-400 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-app-surface/80 cursor-pointer"
                              title={t('actions.setDefault')}
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          )}
                          {!branch.is_default && (
                            <button
                              type="button"
                              onClick={() => toggleActive(branch)}
                              className={
                                branch.is_active
                                  ? 'text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-app-surface/80 cursor-pointer'
                                  : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-app-surface/80 cursor-pointer'
                              }
                              title={branch.is_active ? t('actions.deactivate') : t('actions.activate')}
                            >
                              {branch.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <BranchModal
        isOpen={modal.open}
        branch={modal.branch}
        onClose={() => setModal({ open: false, branch: null })}
        onSubmit={handleSubmit}
        saving={saving}
        error={modalError}
      />

      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title={t('pages.branches.deactivateTitle')}
        message={t('pages.branches.deactivateMessage', { name: deactivateTarget?.name })}
        confirmText={t('actions.deactivate')}
        type="danger"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
