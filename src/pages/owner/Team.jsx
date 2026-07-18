import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { UserPlus, Edit, UserX, UserCheck, Users } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { listTeam, createStaff, updateStaff } from '../../services/teamService';
import StaffModal from '../../components/StaffModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { tableRowHover } from '../../utils/surfaceClasses';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

export default function Team() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const { showFlash, branches, readOnly } = useGym();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, member: null });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listTeam(apiFetch);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load team');
      setStaff(data.staff || []);
    } catch (err) {
      setError(err.message);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleCreate = async (payload) => {
    if (readOnly) {
      setModalError(t('alerts.readOnlyBody'));
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      const res = await createStaff(apiFetch, payload);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to create staff account');
      setModalState({ isOpen: false, member: null });
      showFlash(t('pages.team.staffCreated', { name: data.staff.name }));
      loadTeam();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    if (!modalState.member) return;
    if (readOnly) {
      setModalError(t('alerts.readOnlyBody'));
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      const body = { ...payload };
      if (!body.password) delete body.password;
      const res = await updateStaff(apiFetch, modalState.member.id, body);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to update staff account');
      setModalState({ isOpen: false, member: null });
      showFlash(t('pages.team.staffUpdated'));
      loadTeam();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    if (readOnly) {
      showFlash(t('alerts.readOnlyBody'));
      setToggleTarget(null);
      return;
    }
    const nextActive = !toggleTarget.is_active;
    try {
      const res = await updateStaff(apiFetch, toggleTarget.id, { is_active: nextActive });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to update staff account');
      showFlash(nextActive ? t('pages.team.staffEnabled', { name: toggleTarget.name }) : t('pages.team.staffDisabled', { name: toggleTarget.name }));
      setToggleTarget(null);
      loadTeam();
    } catch (err) {
      showFlash(err.message);
      setToggleTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-app-text-strong sm:text-2xl">{t('pages.team.title')}</h1>
          <p className="text-sm text-slate-500">
            {t('pages.team.subtitle')}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setModalError('');
              setModalState({ isOpen: true, member: null });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <UserPlus className="h-4 w-4" />
            {t('pages.team.add')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-app-border-subtle bg-white dark:bg-app-raised shadow-sm">
        <div className="admin-panel-header">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-app-text-strong">{t('pages.team.sectionTitle')}</h2>
        </div>

        {loading ? (
          <>
            <div className="lg:hidden">
              <AdminListSkeleton rows={5} />
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="admin-data-table">
                <tbody>
                  <AdminTableRowsSkeleton rows={5} cols={5} />
                </tbody>
              </table>
            </div>
          </>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-app-text">{t('pages.team.empty')}</p>
          </div>
        ) : (
          <>
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-app-border-subtle">
              {staff.map((member) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-app-text-strong">{member.name}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{member.email}</p>
                      {member.username && (
                        <p className="mt-0.5 text-xs text-slate-400">@{member.username}</p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">{member.branch_name || t('pages.team.noBranch')}</p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          member.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-app-surface dark:text-app-muted dark:border-app-border-subtle'
                        }`}
                      >
                        {member.is_active ? t('status.active') : t('common.disabled')}
                      </span>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setModalError('');
                          setModalState({ isOpen: true, member });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-teal-700 active:bg-teal-50 dark:border-app-border-subtle dark:text-teal-400 dark:active:bg-teal-500/10"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setToggleTarget(member)}
                        className={
                          member.is_active
                            ? 'inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 active:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:active:bg-rose-500/10'
                            : 'inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 active:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:active:bg-emerald-500/10'
                        }
                      >
                        {member.is_active ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            {t('actions.disable')}
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            {t('actions.enable')}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
            <table className="admin-data-table owner-team-table min-w-[900px]">
              <thead>
                <tr>
                  <th>{t('table.name')}</th>
                  <th>{t('table.branch')}</th>
                  <th>{t('table.email')}</th>
                  <th>{t('account.username')}</th>
                  <th>{t('table.status')}</th>
                  {!readOnly && <th className="text-right">{t('table.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className={tableRowHover}>
                    <td className="truncate font-medium text-slate-900 dark:text-app-text-strong">{member.name}</td>
                    <td className="truncate text-slate-600 dark:text-app-text">{member.branch_name || '—'}</td>
                    <td className="truncate text-slate-600 dark:text-app-text">{member.email}</td>
                    <td className="truncate text-slate-600 dark:text-app-text">{member.username || '—'}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          member.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-app-surface dark:text-app-muted dark:border-app-border-subtle'
                        }`}
                      >
                        {member.is_active ? t('status.active') : t('common.disabled')}
                      </span>
                    </td>
                    {!readOnly && (
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setModalError('');
                            setModalState({ isOpen: true, member });
                          }}
                          className="mr-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
                        >
                          <Edit className="h-4 w-4" />
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleTarget(member)}
                          className={
                            member.is_active
                              ? 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
                              : 'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                          }
                        >
                          {member.is_active ? (
                            <>
                              <UserX className="h-4 w-4" />
                              {t('actions.disable')}
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4" />
                              {t('actions.enable')}
                            </>
                          )}
                        </button>
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

      <StaffModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, member: null })}
        staff={modalState.member}
        branches={branches}
        onSubmit={modalState.member ? handleUpdate : handleCreate}
        saving={saving}
        error={modalError}
      />

      <ConfirmDialog
        isOpen={!!toggleTarget}
        title={toggleTarget?.is_active ? t('pages.team.disableTitle') : t('pages.team.enableTitle')}
        message={
          toggleTarget?.is_active
            ? t('pages.team.disableMessage', { name: toggleTarget?.name })
            : t('pages.team.enableMessage', { name: toggleTarget?.name })
        }
        confirmText={toggleTarget?.is_active ? t('actions.disable') : t('actions.enable')}
        type={toggleTarget?.is_active ? 'danger' : 'primary'}
        onConfirm={handleToggleActive}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
