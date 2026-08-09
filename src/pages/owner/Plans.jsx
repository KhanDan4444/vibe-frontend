import React, { useMemo, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { useAuth } from '../../context/AuthContext';
import { isGymOwner } from '../../utils/roles';
import { Plus, Trash2, Edit, HelpCircle, Users } from 'lucide-react';
import PlanModal from '../../components/PlanModal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import { PlanCardSkeleton } from '../../components/LoadingSkeletons';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { formatMoney } from '../../utils/formatMoney';
import { cardSurface, selectSurface, headingText } from '../../utils/surfaceClasses';

const SORT_OPTIONS = [
  { value: 'price_asc', labelKey: 'pages.plans.sort.priceAsc' },
  { value: 'price_desc', labelKey: 'pages.plans.sort.priceDesc' },
  { value: 'duration_asc', labelKey: 'pages.plans.sort.durationAsc' },
  { value: 'duration_desc', labelKey: 'pages.plans.sort.durationDesc' },
  { value: 'members_desc', labelKey: 'pages.plans.sort.membersDesc' },
  { value: 'name_asc', labelKey: 'pages.plans.sort.nameAsc' },
];

const ACTION_SLOT =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-app-muted transition-colors hover:bg-app-surface/80';

function sortPlans(plans, sort) {
  const list = [...plans];
  switch (sort) {
    case 'price_desc':
      return list.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    case 'duration_asc':
      return list.sort((a, b) => a.duration - b.duration || a.price - b.price);
    case 'duration_desc':
      return list.sort((a, b) => b.duration - a.duration || a.price - b.price);
    case 'members_desc':
      return list.sort(
        (a, b) => (b.activeMemberCount ?? 0) - (a.activeMemberCount ?? 0) || a.price - b.price,
      );
    case 'name_asc':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'price_asc':
    default:
      return list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  }
}

function monthlyRate(plan) {
  const duration = Number(plan.duration) || 1;
  if (duration <= 1) return null;
  return plan.price / duration;
}

export default function Plans() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { plans, addPlan, deletePlan, updatePlan, readOnly, loading: gymLoading } = useGym();
  const canManagePlans = isGymOwner(user?.role) && !readOnly;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState('price_asc');

  const sortedPlans = useMemo(() => sortPlans(plans, sort), [plans, sort]);

  const priceMin = useMemo(
    () => (plans.length ? Math.min(...plans.map((p) => p.price)) : 0),
    [plans],
  );
  const priceMax = useMemo(
    () => (plans.length ? Math.max(...plans.map((p) => p.price)) : 0),
    [plans],
  );
  const membersOnPlans = useMemo(
    () => plans.reduce((sum, p) => sum + (p.activeMemberCount ?? 0), 0),
    [plans],
  );

  const statusLine = plans.length > 0
    ? priceMin === priceMax
      ? t('pages.plans.statusLineSingle', {
          count: plans.length,
          price: formatMoney(priceMin),
          members: membersOnPlans,
        })
      : t('pages.plans.statusLine', {
          count: plans.length,
          from: formatMoney(priceMin),
          to: formatMoney(priceMax),
          members: membersOnPlans,
        })
    : t('pages.plans.statusLineEmpty');

  const handleCreatePlanSubmit = async (data) => {
    if (!canManagePlans) return;
    setSaving(true);
    setError('');
    try {
      await addPlan(data);
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (plan) => {
    if (!canManagePlans) return;
    setEditingPlan(plan);
    setError('');
    setIsEditModalOpen(true);
  };

  const handleUpdatePlanSubmit = async (data) => {
    if (!editingPlan || !canManagePlans) return;
    setSaving(true);
    setError('');
    try {
      await updatePlan(editingPlan.id, data);
      setEditingPlan(null);
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlanClick = (plan) => {
    if (!canManagePlans) return;
    const activeDependentsCount = plan.activeMemberCount ?? 0;

    if (activeDependentsCount > 0) {
      setError(
        t('pages.plans.cannotDelete', { name: plan.name, count: activeDependentsCount })
      );
      return;
    }

    setPlanToDelete(plan);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete || !canManagePlans) return;
    const planId = planToDelete.id;
    setPlanToDelete(null);
    setError('');
    try {
      await deletePlan(planId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('pages.plans.title')}
        subtitle={statusLine}
        actions={
          canManagePlans ? (
            <Button onClick={() => { setError(''); setIsAddModalOpen(true); }}>
              <Plus className="h-4 w-4" /> {t('pages.plans.add')}
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {gymLoading && plans.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : plans.length > 0 ? (
        <div className={`overflow-hidden ${cardSurface}`}>
          <div className="flex flex-col gap-3 border-b border-app-border-subtle p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <h2 className={`text-sm font-semibold tracking-tight sm:text-base ${headingText}`}>
                {t('pages.plans.catalog')}
              </h2>
              <p className="mt-0.5 text-xs text-app-muted">{t('pages.plans.subtitle')}</p>
            </div>
            <label className="sr-only" htmlFor="plans-sort">
              {t('pages.plans.sortLabel')}
            </label>
            <select
              id="plans-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={`ui-select ${selectSurface} min-w-[11rem]`}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4 lg:grid-cols-3">
            {sortedPlans.map((plan) => {
              const members = plan.activeMemberCount ?? 0;
              const perMonth = monthlyRate(plan);
              return (
                <div
                  key={plan.id}
                  className="flex flex-col rounded-xl border border-app-border-subtle bg-app-surface p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                        {t('common.month', { count: plan.duration })}
                      </p>
                      <h3
                        className="mt-1 truncate text-lg font-bold text-app-text-strong"
                        title={plan.name}
                      >
                        {plan.name}
                      </h3>
                    </div>
                    {canManagePlans ? (
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(plan)}
                          className={`${ACTION_SLOT} hover:text-teal-700 dark:hover:text-teal-300`}
                          title={t('pages.plans.editPlanTitle')}
                          aria-label={t('pages.plans.editPlanTitle')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlanClick(plan)}
                          className={`${ACTION_SLOT} hover:text-rose-600 dark:hover:text-rose-400`}
                          title={t('pages.plans.deletePlanTitle')}
                          aria-label={t('pages.plans.deletePlanTitle')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {plan.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-snug text-app-muted">
                      {plan.description}
                    </p>
                  ) : null}

                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-app-muted">
                    <Users className="h-3.5 w-3.5" />
                    {t('pages.plans.activeMembers', { count: members })}
                  </p>

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-app-border-subtle pt-4 mt-5">
                    <div className="min-w-0">
                      <p className="text-2xl font-black tracking-tight text-app-text-strong">
                        {formatMoney(plan.price)}
                      </p>
                      {perMonth != null ? (
                        <p className="mt-0.5 text-xs text-app-muted">
                          {t('pages.plans.perMonth', { amount: formatMoney(perMonth) })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={cardSurface}>
          <EmptyState
            icon={HelpCircle}
            title={t('pages.plans.emptyTitle')}
            body={t('pages.plans.emptyBody')}
            action={
              canManagePlans ? (
                <Button onClick={() => { setError(''); setIsAddModalOpen(true); }}>
                  {t('pages.plans.createFirst')}
                </Button>
              ) : null
            }
          />
        </div>
      )}

      <PlanModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreatePlanSubmit}
        saving={saving}
      />

      <PlanModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPlan(null);
        }}
        onSubmit={handleUpdatePlanSubmit}
        plan={editingPlan}
        saving={saving}
      />

      <ConfirmDialog
        isOpen={!!planToDelete}
        title={t('pages.plans.deleteTitle')}
        message={t('pages.plans.deleteConfirmMessage', { name: planToDelete?.name })}
        confirmText={t('common.delete')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPlanToDelete(null)}
      />
    </div>
  );
}
