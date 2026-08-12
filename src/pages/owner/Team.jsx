import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { Edit, UserX, UserCheck, Users } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { listTeam, createStaff, updateStaff } from '../../services/teamService';
import StaffModal from '../../components/StaffModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import RowMoreMenu from '../../components/RowMoreMenu';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { tableRowHover, cardSurface, panelTitle } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { AdminListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

function StaffRowActions({ member, readOnly, t, onEdit, onToggle }) {
  if (readOnly) return null;
  return (
    <div className="admin-row-actions">
      <RowMoreMenu
        items={[
          {
            key: 'edit',
            label: t('common.edit'),
            icon: <Edit className="h-4 w-4 shrink-0" />,
            onClick: onEdit,
          },
          {
            key: 'toggle',
            label: member.is_active ? t('actions.disable') : t('actions.enable'),
            icon: member.is_active
              ? <UserX className="h-4 w-4 shrink-0" />
              : <UserCheck className="h-4 w-4 shrink-0" />,
            danger: member.is_active,
            onClick: onToggle,
          },
        ]}
      />
    </div>
  );
}

export default function Team() {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const { showFlash, branches, readOnly, selectedBranchId, error: gymError } = useGym();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, member: null });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);

  const visibleStaff = useMemo(() => {
    if (selectedBranchId === 'all') return staff;
    return staff.filter((member) => String(member.branch_id) === String(selectedBranchId));
  }, [staff, selectedBranchId]);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listTeam(apiFetch);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('errors.loadTeam'));
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
      if (!res.ok) throw new Error(data.error || t('errors.createStaff'));
      setModalState({ isOpen: false, member: null });
      showFlash(flashFromKey(t, 'staffCreated', { subtitleParams: { name: data.staff.name } }));
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
      if (!res.ok) throw new Error(data.error || t('errors.updateStaff'));
      setModalState({ isOpen: false, member: null });
      showFlash(flashFromKey(t, 'staffUpdated'));
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
      showFlash({ title: t('alerts.readOnlyBody'), variant: 'warning' });
      setToggleTarget(null);
      return;
    }
    const nextActive = !toggleTarget.is_active;
    try {
      const res = await updateStaff(apiFetch, toggleTarget.id, { is_active: nextActive });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('errors.updateStaff'));
      showFlash(
        flashFromKey(t, nextActive ? 'staffEnabled' : 'staffDisabled', {
          subtitleParams: { name: toggleTarget.name },
        })
      );
      setToggleTarget(null);
      loadTeam();
    } catch (err) {
      showFlash({ title: err.message, variant: 'danger' });
      setToggleTarget(null);
    }
  };

  const noStaffYet = !loading && staff.length === 0;
  const openCreateStaff = () => {
    setModalError('');
    setModalState({ isOpen: true, member: null });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('pages.team.title')}
        subtitle={t('pages.team.subtitle')}
        actions={
          !readOnly && !noStaffYet ? (
            <Button onClick={openCreateStaff}>
              {t('pages.team.add')}
            </Button>
          ) : null
        }
      />

      {error && !gymError ? <ErrorRetryBanner message={error} onRetry={() => void loadTeam()} /> : null}

      {noStaffYet ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Users}
            title={t('pages.team.emptyTitle')}
            body={t('pages.team.emptyBody')}
            action={
              !readOnly ? (
                <Button onClick={openCreateStaff}>{t('pages.team.createFirst')}</Button>
              ) : null
            }
          />
        </Card>
      ) : (
      <>
      <Card className="overflow-hidden">
        <div className="admin-panel-header">
          <h2 className={panelTitle}>{t('pages.team.sectionTitle')}</h2>
        </div>
      </Card>

        {loading ? (
          <>
            <div className="lg:hidden">
              <Card className="overflow-hidden">
                <AdminListSkeleton rows={5} />
              </Card>
            </div>
            <Card className="hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="admin-data-table">
                  <tbody>
                    <AdminTableRowsSkeleton rows={5} cols={5} />
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : visibleStaff.length === 0 ? (
          <>
            <div className="lg:hidden">
              <div className={cardSurface}>
                <EmptyState
                  icon={Users}
                  title={t('pages.team.emptyBranchTitle')}
                  body={t('pages.team.emptyBranchBody')}
                />
              </div>
            </div>
            <Card className="hidden overflow-hidden lg:block">
              <EmptyState
                icon={Users}
                title={t('pages.team.emptyBranchTitle')}
                body={t('pages.team.emptyBranchBody')}
              />
            </Card>
          </>
        ) : (
          <>
            <div className="lg:hidden space-y-3">
              {visibleStaff.map((member) => (
                <div key={member.id} className={`${cardSurface} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-app-text-strong">{member.name}</p>
                      <p className="mt-0.5 text-sm text-app-muted">{member.email}</p>
                      {member.username && (
                        <p className="mt-0.5 text-xs text-app-muted">@{member.username}</p>
                      )}
                      <p className="mt-0.5 text-xs text-app-muted">{member.branch_name || t('pages.team.noBranch')}</p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          member.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-app-surface text-app-muted border-app-border-subtle'
                        }`}
                      >
                        {member.is_active ? t('status.active') : t('common.disabled')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <StaffRowActions
                      member={member}
                      readOnly={readOnly}
                      t={t}
                      onEdit={() => {
                        setModalError('');
                        setModalState({ isOpen: true, member });
                      }}
                      onToggle={() => setToggleTarget(member)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
            <table className="admin-data-table owner-team-table min-w-[720px]">
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
                {visibleStaff.map((member) => (
                  <tr key={member.id} className={tableRowHover}>
                    <td className="truncate font-medium text-app-text-strong">{member.name}</td>
                    <td className="truncate text-app-text">{member.branch_name || '—'}</td>
                    <td className="truncate text-app-text">{member.email}</td>
                    <td className="truncate text-app-text">{member.username || '—'}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          member.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-app-surface text-app-muted border-app-border-subtle'
                        }`}
                      >
                        {member.is_active ? t('status.active') : t('common.disabled')}
                      </span>
                    </td>
                    {!readOnly && (
                      <td>
                        <StaffRowActions
                          member={member}
                          readOnly={readOnly}
                          t={t}
                          onEdit={() => {
                            setModalError('');
                            setModalState({ isOpen: true, member });
                          }}
                          onToggle={() => setToggleTarget(member)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </Card>
          </>
        )}
      </>
      )}

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
