import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { Edit, UserX, UserCheck, Users, Dumbbell, Trash2, Undo2 } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import { listTeam, createStaff, updateStaff } from '../../services/teamService';
import {
  listTrainers,
  createTrainer,
  updateTrainer,
  archiveTrainer,
  restoreTrainer,
} from '../../services/trainerService';
import StaffModal from '../../components/StaffModal';
import TrainerModal from '../../components/TrainerModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import RowMoreMenu from '../../components/RowMoreMenu';
import { FilterChip } from '../../components/FilterChip';
import { TeamSegment, ToolbarChip } from '../../components/ToolbarChip';
import SearchField from '../../components/SearchField';
import { useTranslation } from 'react-i18next';
import { flashFromKey } from '../../i18n/flashToast';
import { tableRowHover, cardSurface, panelTitle, renewActionBtn } from '../../utils/surfaceClasses';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import InitialsAvatar from '../../components/InitialsAvatar';
import { TeamListSkeleton, AdminTableRowsSkeleton } from '../../components/LoadingSkeletons';

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

function TrainerRowActions({ readOnly, showingFormer, t, onEdit, onArchive, onRestore }) {
  if (readOnly) return null;

  if (showingFormer) {
    return (
      <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onRestore}
          className={renewActionBtn}
          title={t('pages.team.restoreTrainer')}
        >
          <Undo2 className="h-3.5 w-3.5" /> {t('pages.team.restoreTrainer')}
        </button>
      </div>
    );
  }

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
            key: 'archive',
            label: t('pages.team.archiveTrainer'),
            icon: <Trash2 className="h-4 w-4 shrink-0" />,
            danger: true,
            onClick: onArchive,
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

  const [tab, setTab] = useState('staff');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, member: null });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);

  const [trainers, setTrainers] = useState([]);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [showingFormerTrainers, setShowingFormerTrainers] = useState(false);
  const [archivedTrainerTotal, setArchivedTrainerTotal] = useState(0);
  const [liveTrainerTotal, setLiveTrainerTotal] = useState(0);
  const [trainerModal, setTrainerModal] = useState({ isOpen: false, trainer: null });
  const [trainerSaving, setTrainerSaving] = useState(false);
  const [trainerModalError, setTrainerModalError] = useState('');
  const [trainerToArchive, setTrainerToArchive] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleStaff = useMemo(() => {
    if (selectedBranchId === 'all') return staff;
    return staff.filter((member) => String(member.branch_id) === String(selectedBranchId));
  }, [staff, selectedBranchId]);

  const visibleTrainers = useMemo(() => {
    if (selectedBranchId === 'all') return trainers;
    return trainers.filter((row) => String(row.branch_id) === String(selectedBranchId));
  }, [trainers, selectedBranchId]);

  const defaultBranchName =
    branches.find((b) => b.is_default)?.name ||
    branches.find((b) => b.is_active !== false)?.name ||
    branches[0]?.name ||
    'Main';

  const multiBranch = branches.filter((b) => b.is_active !== false).length > 1;
  const branchLabel = (name) => name || defaultBranchName;

  const searchNeedle = searchQuery.trim().toLowerCase();

  const displayedStaff = useMemo(() => {
    if (!searchNeedle) return visibleStaff;
    return visibleStaff.filter((member) =>
      [member.name, member.email, member.username, member.branch_name]
        .some((value) => String(value || '').toLowerCase().includes(searchNeedle))
    );
  }, [visibleStaff, searchNeedle]);

  const displayedTrainers = useMemo(() => {
    if (!searchNeedle) return visibleTrainers;
    return visibleTrainers.filter((row) =>
      [row.name, row.phone, row.specialty, row.branch_name]
        .some((value) => String(value || '').toLowerCase().includes(searchNeedle))
    );
  }, [visibleTrainers, searchNeedle]);

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
  }, [apiFetch, t]);

  const loadTrainers = useCallback(async () => {
    setTrainersLoading(true);
    try {
      const res = await listTrainers(apiFetch, showingFormerTrainers ? { archived: 1 } : {});
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setTrainers([]);
        setArchivedTrainerTotal(0);
        if (!showingFormerTrainers) setLiveTrainerTotal(0);
        return;
      }
      setTrainers(data.trainers || []);
      setArchivedTrainerTotal(data.archivedTotal ?? 0);
      if (!showingFormerTrainers) setLiveTrainerTotal((data.trainers || []).length);
    } catch {
      setTrainers([]);
      setArchivedTrainerTotal(0);
      if (!showingFormerTrainers) setLiveTrainerTotal(0);
    } finally {
      setTrainersLoading(false);
    }
  }, [apiFetch, showingFormerTrainers]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    loadTrainers();
  }, [loadTrainers]);

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

  const handleTrainerCreate = async (payload) => {
    if (readOnly) {
      setTrainerModalError(t('alerts.readOnlyBody'));
      return;
    }
    setTrainerSaving(true);
    setTrainerModalError('');
    try {
      const res = await createTrainer(apiFetch, payload);
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(
          res.status === 404 ? t('errors.trainersUnavailable') : (data.error || t('errors.createTrainer'))
        );
      }
      setTrainerModal({ isOpen: false, trainer: null });
      showFlash(flashFromKey(t, 'trainerCreated', { subtitleParams: { name: data.trainer.name } }));
      loadTrainers();
    } catch (err) {
      setTrainerModalError(err.message);
    } finally {
      setTrainerSaving(false);
    }
  };

  const handleTrainerUpdate = async (payload) => {
    if (!trainerModal.trainer) return;
    if (readOnly) {
      setTrainerModalError(t('alerts.readOnlyBody'));
      return;
    }
    setTrainerSaving(true);
    setTrainerModalError('');
    try {
      const res = await updateTrainer(apiFetch, trainerModal.trainer.id, payload);
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(
          res.status === 404 ? t('errors.trainersUnavailable') : (data.error || t('errors.updateTrainer'))
        );
      }
      setTrainerModal({ isOpen: false, trainer: null });
      showFlash(flashFromKey(t, 'trainerUpdated'));
      loadTrainers();
    } catch (err) {
      setTrainerModalError(err.message);
    } finally {
      setTrainerSaving(false);
    }
  };

  const handleArchiveTrainer = async () => {
    if (!trainerToArchive) return;
    if (readOnly) {
      showFlash({ title: t('alerts.readOnlyBody'), variant: 'warning' });
      setTrainerToArchive(null);
      return;
    }
    try {
      const res = await archiveTrainer(apiFetch, trainerToArchive.id);
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(
          res.status === 404 ? t('errors.trainersUnavailable') : (data.error || t('errors.updateTrainer'))
        );
      }
      showFlash(flashFromKey(t, 'trainerArchived', { subtitleParams: { name: trainerToArchive.name } }));
      setTrainerToArchive(null);
      loadTrainers();
    } catch (err) {
      showFlash({ title: err.message, variant: 'danger' });
      setTrainerToArchive(null);
    }
  };

  const handleRestoreTrainer = async (trainer) => {
    if (readOnly) {
      showFlash({ title: t('alerts.readOnlyBody'), variant: 'warning' });
      return;
    }
    try {
      const res = await restoreTrainer(apiFetch, trainer.id);
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(
          res.status === 404 ? t('errors.trainersUnavailable') : (data.error || t('errors.updateTrainer'))
        );
      }
      showFlash(flashFromKey(t, 'trainerRestored', { subtitleParams: { name: trainer.name } }));
      loadTrainers();
    } catch (err) {
      showFlash({ title: err.message, variant: 'danger' });
    }
  };

  const noStaffYet = !loading && staff.length === 0;
  const noTrainersYet = !trainersLoading && trainers.length === 0 && archivedTrainerTotal === 0 && !showingFormerTrainers;
  const openCreateStaff = () => {
    setModalError('');
    setModalState({ isOpen: true, member: null });
  };
  const openCreateTrainer = () => {
    setTrainerModalError('');
    setTrainerModal({ isOpen: true, trainer: null });
  };

  const pageTitle = t('nav.team');
  const pageSubtitle =
    tab === 'trainers'
      ? showingFormerTrainers
        ? t('pages.team.formerTrainersSubtitle')
        : t('pages.team.trainersSubtitle')
      : t('pages.team.subtitle');

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          !readOnly && tab === 'staff' && !noStaffYet ? (
            <Button onClick={openCreateStaff}>{t('pages.team.add')}</Button>
          ) : !readOnly && tab === 'trainers' && !noTrainersYet && !showingFormerTrainers ? (
            <Button onClick={openCreateTrainer}>{t('pages.team.addTrainer')}</Button>
          ) : null
        }
      />

      <div className={`app-toolbar-in overflow-hidden ${cardSurface}`}>
        <div className="flex flex-col gap-2.5 p-3 sm:p-4">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={
              tab === 'trainers'
                ? showingFormerTrainers
                  ? t('pages.team.searchFormerTrainersPlaceholder')
                  : t('pages.team.searchTrainersPlaceholder')
                : t('pages.team.searchStaffPlaceholder')
            }
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <TeamSegment>
              <ToolbarChip
                label={t('pages.team.tabStaff')}
                count={staff.length}
                active={tab === 'staff'}
                onClick={() => {
                  setTab('staff');
                  setShowingFormerTrainers(false);
                  setSearchQuery('');
                }}
              />
              <ToolbarChip
                label={t('pages.team.tabTrainers')}
                count={liveTrainerTotal}
                active={tab === 'trainers' && !showingFormerTrainers}
                onClick={() => {
                  setTab('trainers');
                  setShowingFormerTrainers(false);
                  setSearchQuery('');
                }}
              />
            </TeamSegment>
            {tab === 'trainers' && (archivedTrainerTotal > 0 || showingFormerTrainers) ? (
              <>
                <span className="filter-chip-archive-rule" aria-hidden />
                <FilterChip
                  variant="former"
                  label={t('status.former')}
                  count={archivedTrainerTotal}
                  active={showingFormerTrainers}
                  onClick={() => {
                    setShowingFormerTrainers((current) => !current);
                    setSearchQuery('');
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {tab === 'staff' ? (
        <>
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
                <TeamListSkeleton rows={5} />
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
        ) : displayedStaff.length === 0 ? (
          <>
            <div className="lg:hidden">
              <div className={cardSurface}>
                <EmptyState
                  icon={Users}
                  title={searchNeedle ? t('pages.team.emptySearchTitle') : t('pages.team.emptyBranchTitle')}
                  body={searchNeedle ? t('pages.team.emptySearchBody') : t('pages.team.emptyBranchBody')}
                />
              </div>
            </div>
            <Card className="hidden overflow-hidden lg:block">
              <EmptyState
                icon={Users}
                title={searchNeedle ? t('pages.team.emptySearchTitle') : t('pages.team.emptyBranchTitle')}
                body={searchNeedle ? t('pages.team.emptySearchBody') : t('pages.team.emptyBranchBody')}
              />
            </Card>
          </>
        ) : (
          <>
            <div className="lg:hidden space-y-3">
              {displayedStaff.map((member) => (
                <div key={member.id} className={`${cardSurface} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <InitialsAvatar name={member.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-app-text-strong">{member.name}</p>
                        <p className="mt-0.5 text-sm text-app-muted">{member.email}</p>
                        {member.username && (
                          <p className="mt-0.5 text-xs text-app-muted">@{member.username}</p>
                        )}
                        {multiBranch ? (
                          <p className="mt-0.5 text-xs text-app-muted">
                            {branchLabel(member.branch_name)}
                          </p>
                        ) : null}
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
                  {multiBranch ? <th>{t('table.branch')}</th> : null}
                  <th>{t('table.email')}</th>
                  <th>{t('account.username')}</th>
                  <th>{t('table.status')}</th>
                  {!readOnly && <th className="text-right">{t('table.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {displayedStaff.map((member) => (
                  <tr key={member.id} className={tableRowHover}>
                    <td>
                      <div className="flex min-w-0 items-center gap-3">
                        <InitialsAvatar name={member.name} size="sm" />
                        <span className="truncate font-medium text-app-text-strong">{member.name}</span>
                      </div>
                    </td>
                    {multiBranch ? (
                      <td className="truncate text-app-text">{branchLabel(member.branch_name)}</td>
                    ) : null}
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
        </>
      ) : (
        <>
          {noTrainersYet ? (
            <Card className="overflow-hidden">
              <EmptyState
                icon={Dumbbell}
                title={t('pages.team.emptyTrainersTitle')}
                body={t('pages.team.emptyTrainersBody')}
                action={
                  !readOnly ? (
                    <Button onClick={openCreateTrainer}>{t('pages.team.createFirstTrainer')}</Button>
                  ) : null
                }
              />
            </Card>
          ) : trainersLoading ? (
            <Card className="overflow-hidden">
              <TeamListSkeleton rows={5} />
            </Card>
          ) : displayedTrainers.length === 0 ? (
            <Card className="overflow-hidden">
              <EmptyState
                icon={Dumbbell}
                title={
                  searchNeedle
                    ? t('pages.team.emptySearchTitle')
                    : showingFormerTrainers
                      ? t('pages.team.emptyFormerTrainers')
                      : selectedBranchId !== 'all'
                        ? t('pages.team.emptyBranchTrainers')
                        : t('pages.team.emptyTrainersTitle')
                }
                body={
                  searchNeedle
                    ? t('pages.team.emptySearchBody')
                    : showingFormerTrainers
                      ? t('pages.team.emptyFormerTrainersBody')
                      : selectedBranchId !== 'all'
                        ? t('pages.team.emptyBranchTrainersBody')
                        : t('pages.team.emptyTrainersBody')
                }
              />
            </Card>
          ) : (
            <>
              <div className="lg:hidden space-y-3">
                {displayedTrainers.map((trainer) => (
                  <div key={trainer.id} className={`${cardSurface} p-4`}>
                    <div className="flex items-start gap-3">
                      <InitialsAvatar name={trainer.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-app-text-strong">{trainer.name}</p>
                        <p className="mt-0.5 text-sm text-app-muted">{trainer.phone || '—'}</p>
                        {trainer.specialty ? (
                          <p className="mt-0.5 text-xs text-app-muted">{trainer.specialty}</p>
                        ) : null}
                        {multiBranch ? (
                          <p className="mt-0.5 text-xs text-app-muted">
                            {branchLabel(trainer.branch_name)}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-app-muted">
                          {t('pages.team.assignedMembers', { count: trainer.member_count ?? 0 })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <TrainerRowActions
                        trainer={trainer}
                        readOnly={readOnly}
                        showingFormer={showingFormerTrainers}
                        t={t}
                        onEdit={() => {
                          setTrainerModalError('');
                          setTrainerModal({ isOpen: true, trainer });
                        }}
                        onArchive={() => setTrainerToArchive(trainer)}
                        onRestore={() => void handleRestoreTrainer(trainer)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Card className="hidden overflow-hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="admin-data-table min-w-[640px]">
                    <thead>
                      <tr>
                        <th>{t('table.name')}</th>
                        {multiBranch ? <th>{t('table.branch')}</th> : null}
                        <th>{t('table.phone')}</th>
                        <th>{t('table.specialty')}</th>
                        <th>{t('table.members')}</th>
                        {!readOnly && <th className="text-right">{t('table.actions')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedTrainers.map((trainer) => (
                        <tr key={trainer.id} className={tableRowHover}>
                          <td>
                            <div className="flex min-w-0 items-center gap-3">
                              <InitialsAvatar name={trainer.name} size="sm" />
                              <span className="truncate font-medium text-app-text-strong">
                                {trainer.name}
                              </span>
                            </div>
                          </td>
                          {multiBranch ? (
                            <td className="truncate text-app-text">{branchLabel(trainer.branch_name)}</td>
                          ) : null}
                          <td className="truncate font-mono text-sm text-app-muted">{trainer.phone || '—'}</td>
                          <td className="truncate text-app-text">{trainer.specialty || '—'}</td>
                          <td className="text-app-muted">
                            {t('pages.team.assignedMembers', { count: trainer.member_count ?? 0 })}
                          </td>
                          {!readOnly && (
                            <td>
                              <TrainerRowActions
                                trainer={trainer}
                                readOnly={readOnly}
                                showingFormer={showingFormerTrainers}
                                t={t}
                                onEdit={() => {
                                  setTrainerModalError('');
                                  setTrainerModal({ isOpen: true, trainer });
                                }}
                                onArchive={() => setTrainerToArchive(trainer)}
                                onRestore={() => void handleRestoreTrainer(trainer)}
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

      <TrainerModal
        isOpen={trainerModal.isOpen}
        onClose={() => setTrainerModal({ isOpen: false, trainer: null })}
        trainer={trainerModal.trainer}
        branches={branches}
        onSubmit={trainerModal.trainer ? handleTrainerUpdate : handleTrainerCreate}
        saving={trainerSaving}
        error={trainerModalError}
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

      <ConfirmDialog
        isOpen={!!trainerToArchive}
        title={t('pages.team.archiveTrainerTitle')}
        message={t('pages.team.archiveTrainerMessage', { name: trainerToArchive?.name })}
        confirmText={t('pages.team.archiveTrainer')}
        type="danger"
        onConfirm={handleArchiveTrainer}
        onCancel={() => setTrainerToArchive(null)}
      />
    </div>
  );
}
