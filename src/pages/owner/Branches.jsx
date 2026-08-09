import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { MapPin, Plus, Edit, Star, Ban, CheckCircle, Search } from 'lucide-react';
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
import { cardSurface, tableRowHover, selectSurface, headingText } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import RequiredMark from '../../components/ui/RequiredMark';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

const DEFAULT_BADGE =
  'ml-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-600/10 dark:text-teal-400 dark:border-teal-600/20';
const STATUS_ACTIVE =
  'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
const STATUS_INACTIVE =
  'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-app-surface text-app-muted border-app-border-subtle';

const ACTION_SLOT = 'inline-flex h-8 w-8 shrink-0 items-center justify-center';

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
        <h2 className="text-lg font-bold text-app-text-strong">
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
            <label className="form-label">
              {t('pages.branches.nameLabel')}
              <RequiredMark />
            </label>
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

function BranchActions({ branch, readOnly, onEdit, onSetDefault, onToggleActive, t }) {
  if (readOnly) return null;

  return (
    <div className="admin-row-actions">
      <button
        type="button"
        onClick={onEdit}
        className={`${ACTION_SLOT} text-app-muted hover:bg-app-surface/80 hover:text-teal-700 cursor-pointer`}
        title={t('common.edit')}
        aria-label={t('common.edit')}
      >
        <Edit className="h-4 w-4" />
      </button>
      {branch.is_default ? (
        <span className={`${ACTION_SLOT} text-teal-600 dark:text-teal-400`} title={t('pages.branches.defaultBranch')} aria-hidden>
          <Star className="h-4 w-4 fill-current" />
        </span>
      ) : branch.is_active ? (
        <button
          type="button"
          onClick={onSetDefault}
          className={`${ACTION_SLOT} text-app-muted hover:bg-app-surface/80 hover:text-amber-600 cursor-pointer`}
          title={t('actions.setDefault')}
          aria-label={t('actions.setDefault')}
        >
          <Star className="h-4 w-4" />
        </button>
      ) : (
        <span className={ACTION_SLOT} aria-hidden />
      )}
      {branch.is_default ? (
        <span className={ACTION_SLOT} aria-hidden />
      ) : (
        <button
          type="button"
          onClick={onToggleActive}
          className={
            branch.is_active
              ? `${ACTION_SLOT} text-app-muted hover:bg-app-surface/80 hover:text-rose-600 cursor-pointer`
              : `${ACTION_SLOT} text-app-muted hover:bg-app-surface/80 hover:text-emerald-600 cursor-pointer`
          }
          title={branch.is_active ? t('actions.deactivate') : t('actions.activate')}
          aria-label={branch.is_active ? t('actions.deactivate') : t('actions.activate')}
        >
          {branch.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

function branchMetaLine(branch) {
  const parts = [];
  if (branch.phone) parts.push(branch.phone);
  if (branch.address) parts.push(branch.address);
  return parts.join(' · ');
}

export default function Branches() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const { showFlash, reloadBranches, readOnly, setSelectedBranchId } = useGym();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, branch: null });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listBranches(apiFetch);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('errors.loadBranches'));
      setBranches(data.branches || []);
    } catch (err) {
      setError(err.message);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, t]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = useMemo(
    () => branches.filter((b) => b.is_active !== false).length,
    [branches],
  );
  const defaultBranch = useMemo(
    () => branches.find((b) => b.is_default),
    [branches],
  );

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return branches.filter((branch) => {
      if (statusFilter === 'active' && branch.is_active === false) return false;
      if (statusFilter === 'inactive' && branch.is_active !== false) return false;
      if (!q) return true;
      const haystack = [branch.name, branch.phone, branch.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [branches, searchQuery, statusFilter]);

  const statusLine = branches.length > 0
    ? t('pages.branches.statusLine', {
        count: branches.length,
        active: activeCount,
        default: defaultBranch?.name || '—',
      })
    : t('pages.branches.statusLineEmpty');

  const emptyTitle = searchQuery.trim() || statusFilter !== 'all'
    ? t('pages.branches.emptyFilteredTitle')
    : t('pages.branches.emptyTitle');
  const emptyBody = searchQuery.trim() || statusFilter !== 'all'
    ? t('pages.branches.emptyFilteredBody')
    : t('pages.branches.emptyBody');

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
      if (!res.ok) throw new Error(data.error || t('errors.saveBranch'));
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

  const openMembers = (branch) => {
    setSelectedBranchId(branch.id);
    navigate('/dashboard/members');
  };

  const openStaff = (branch) => {
    setSelectedBranchId(branch.id);
    navigate('/dashboard/team');
  };

  const colCount = readOnly ? 4 : 5;

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('pages.branches.title')}
        subtitle={statusLine}
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

      {error ? <ErrorRetryBanner message={error} onRetry={() => void load()} /> : null}

      <div className={`overflow-hidden ${cardSurface}`}>
        <div className="flex flex-col gap-3 border-b border-app-border-subtle p-3 sm:px-4">
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold tracking-tight sm:text-base ${headingText}`}>
              {t('pages.branches.locations')}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{t('pages.branches.subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="search"
                className="admin-field block w-full pl-10 pr-4 placeholder:text-app-muted"
                placeholder={t('pages.branches.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t('pages.branches.searchPlaceholder')}
              />
            </div>
            <label className="sr-only" htmlFor="branch-status-filter">
              {t('table.status')}
            </label>
            <select
              id="branch-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`ui-select ${selectSurface} min-w-[9rem]`}
            >
              <option value="all">{t('pages.branches.filters.all')}</option>
              <option value="active">{t('pages.branches.filters.active')}</option>
              <option value="inactive">{t('pages.branches.filters.inactive')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <>
            <div className="lg:hidden">
              <AdminListSkeleton rows={4} />
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="admin-data-table">
                <tbody>
                  <AdminTableRowsSkeleton rows={4} cols={colCount} />
                </tbody>
              </table>
            </div>
          </>
        ) : filteredBranches.length === 0 ? (
          <EmptyState icon={MapPin} compact title={emptyTitle} body={emptyBody} />
        ) : (
          <>
            <div className="lg:hidden divide-y divide-app-border-subtle">
              {filteredBranches.map((branch) => {
                const meta = branchMetaLine(branch);
                return (
                  <div key={branch.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-app-text-strong">
                          <span className="truncate">{branch.name}</span>
                          {branch.is_default ? (
                            <span className={DEFAULT_BADGE}>{t('common.default')}</span>
                          ) : null}
                        </p>
                        {meta ? (
                          <p className="mt-1 text-xs leading-snug text-app-muted">{meta}</p>
                        ) : null}
                        <p className="mt-1.5 text-sm text-app-muted">
                          <button
                            type="button"
                            onClick={() => openMembers(branch)}
                            className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                          >
                            {branch.member_count ?? 0} {t('table.members')}
                          </button>
                          {' · '}
                          <button
                            type="button"
                            onClick={() => openStaff(branch)}
                            className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                          >
                            {branch.staff_count ?? 0} {t('nav.team')}
                          </button>
                        </p>
                        <span className={`mt-2 ${branch.is_active ? STATUS_ACTIVE : STATUS_INACTIVE}`}>
                          {branch.is_active ? t('status.active') : t('common.inactive')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <BranchActions
                        branch={branch}
                        readOnly={readOnly}
                        t={t}
                        onEdit={() => {
                          setModalError('');
                          setModal({ open: true, branch });
                        }}
                        onSetDefault={() => void setAsDefault(branch)}
                        onToggleActive={() => void toggleActive(branch)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="admin-data-table owner-branches-table min-w-[780px]">
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
                  {filteredBranches.map((branch) => {
                    const meta = branchMetaLine(branch);
                    return (
                      <tr key={branch.id} className={tableRowHover}>
                        <td className="font-medium text-app-text-strong">
                          <div className="flex min-w-0 flex-wrap items-center">
                            <span className="truncate">{branch.name}</span>
                            {branch.is_default ? (
                              <span className={DEFAULT_BADGE}>{t('common.default')}</span>
                            ) : null}
                          </div>
                          {meta ? (
                            <p className="mt-0.5 max-w-sm truncate text-xs font-normal text-app-muted">
                              {meta}
                            </p>
                          ) : null}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => openMembers(branch)}
                            className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                          >
                            {branch.member_count ?? 0}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => openStaff(branch)}
                            className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                          >
                            {branch.staff_count ?? 0}
                          </button>
                        </td>
                        <td>
                          <span className={branch.is_active ? STATUS_ACTIVE : STATUS_INACTIVE}>
                            {branch.is_active ? t('status.active') : t('common.inactive')}
                          </span>
                        </td>
                        {!readOnly && (
                          <td>
                            <BranchActions
                              branch={branch}
                              readOnly={readOnly}
                              t={t}
                              onEdit={() => {
                                setModalError('');
                                setModal({ open: true, branch });
                              }}
                              onSetDefault={() => void setAsDefault(branch)}
                              onToggleActive={() => void toggleActive(branch)}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
