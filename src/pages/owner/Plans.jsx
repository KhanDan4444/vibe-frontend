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
import Card from '../../components/ui/Card';
import { formatMoney } from '../../utils/formatMoney';
import { cardSurface, selectSurface } from '../../utils/surfaceClasses';

const SORT_OPTIONS = [
  { value: 'price_asc', labelKey: 'pages.plans.sort.priceAsc' },
  { value: 'price_desc', labelKey: 'pages.plans.sort.priceDesc' },
  { value: 'duration_asc', labelKey: 'pages.plans.sort.durationAsc' },
  { value: 'duration_desc', labelKey: 'pages.plans.sort.durationDesc' },
  { value: 'members_desc', labelKey: 'pages.plans.sort.membersDesc' },
  { value: 'name_asc', labelKey: 'pages.plans.sort.nameAsc' },
];

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
  const popularPlanId = useMemo(() => {
    if (plans.length < 2) return null;
    let best = null;
    let bestCount = 0;
    for (const plan of plans) {
      const count = plan.activeMemberCount ?? 0;
      if (count > bestCount) {
        best = plan.id;
        bestCount = count;
      }
    }
    return bestCount > 0 ? best : null;
  }, [plans]);

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

  const sortSelect = plans.length > 0 ? (
    <>
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
    </>
  ) : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('pages.plans.title')}
        subtitle={statusLine}
        actions={
          <>
            {sortSelect}
            {canManagePlans ? (
              <Button onClick={() => { setError(''); setIsAddModalOpen(true); }}>
                <Plus className="h-4 w-4" /> {t('pages.plans.add')}
              </Button>
            ) : null}
          </>
        }
      />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {gymLoading && plans.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : plans.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const members = plan.activeMemberCount ?? 0;
            const perMonth = monthlyRate(plan);
            const isPopular = plan.id === popularPlanId;

            return (
              <Card
                key={plan.id}
                className={`flex flex-col p-5 ${
                  isPopular ? 'ring-2 ring-teal-500/35 dark:ring-teal-400/30' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-2xl font-black tracking-tight text-app-text-strong sm:text-[1.65rem]">
                    {formatMoney(plan.price)}
                  </p>
                  {perMonth != null ? (
                    <p className="mt-0.5 text-xs text-app-muted">
                      {t('pages.plans.perMonth', { amount: formatMoney(perMonth) })}
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3
                      className="truncate text-base font-semibold text-app-text-strong"
                      title={plan.name}
                    >
                      {plan.name}
                    </h3>
                    {isPopular ? (
                      <span className="text-xs font-medium text-teal-700 dark:text-teal-300">
                        {t('pages.plans.popular')}
                      </span>
                    ) : null}
                  </div>
                  {plan.description ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-snug text-app-muted">
                      {plan.description}
                    </p>
                  ) : null}
                </div>

                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-app-muted">
                  <span>{t('common.month', { count: plan.duration })}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {t('pages.plans.activeMembers', { count: members })}
                  </span>
                </p>

                {canManagePlans ? (
                  <div className="mt-4 flex items-center gap-2 border-t border-app-border-subtle pt-3">
                    <button
                      type="button"
                      onClick={() => handleEditClick(plan)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-app-text hover:bg-app-surface hover:text-teal-700 dark:hover:text-teal-300"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlanClick(plan)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-app-muted hover:bg-app-surface hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('common.delete')}
                    </button>
                  </div>
                ) : null}
              </Card>
            );
          })}
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
