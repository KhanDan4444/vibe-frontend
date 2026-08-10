import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Edit, HelpCircle, Building2 } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import PlanModal from '../../components/PlanModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { getSaasPlans, createSaasPlan, updateSaasPlan, deleteSaasPlan } from '../../services/saasPlanService';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import { PlanCardSkeleton } from '../../components/LoadingSkeletons';
import { formatMoney } from '../../utils/formatMoney';
import { runInBackground } from '../../utils/runInBackground';
import { cardSurface, selectSurface } from '../../utils/surfaceClasses';

const SORT_OPTIONS = [
  { value: 'price_asc', labelKey: 'pages.plans.sort.priceAsc' },
  { value: 'price_desc', labelKey: 'pages.plans.sort.priceDesc' },
  { value: 'duration_asc', labelKey: 'pages.plans.sort.durationAsc' },
  { value: 'duration_desc', labelKey: 'pages.plans.sort.durationDesc' },
  { value: 'gyms_desc', labelKey: 'admin.saasPlansSort.gymsDesc' },
  { value: 'name_asc', labelKey: 'pages.plans.sort.nameAsc' },
];

function gymCount(plan) {
  return Number(plan.gym_count || 0);
}

function sortPlans(plans, sort) {
  const list = [...plans];
  switch (sort) {
    case 'price_desc':
      return list.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    case 'duration_asc':
      return list.sort((a, b) => a.duration - b.duration || a.price - b.price);
    case 'duration_desc':
      return list.sort((a, b) => b.duration - a.duration || a.price - b.price);
    case 'gyms_desc':
      return list.sort((a, b) => gymCount(b) - gymCount(a) || a.price - b.price);
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

export default function AdminSaasPlans({ onPlansChange, onBootingChange }) {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [deletePlan, setDeletePlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState('price_asc');

  const onPlansChangeRef = useRef(onPlansChange);

  useEffect(() => {
    onPlansChangeRef.current = onPlansChange;
  }, [onPlansChange]);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getSaasPlans(apiFetch);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load SaaS plans');
      const list = Array.isArray(data) ? data : [];
      setPlans(list);
      onPlansChangeRef.current?.(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    onBootingChange?.(loading && plans.length === 0);
  }, [loading, plans.length, onBootingChange]);

  const sortedPlans = useMemo(() => sortPlans(plans, sort), [plans, sort]);

  const priceMin = useMemo(
    () => (plans.length ? Math.min(...plans.map((p) => p.price)) : 0),
    [plans],
  );
  const priceMax = useMemo(
    () => (plans.length ? Math.max(...plans.map((p) => p.price)) : 0),
    [plans],
  );
  const gymsOnPlans = useMemo(
    () => plans.reduce((sum, p) => sum + gymCount(p), 0),
    [plans],
  );
  const popularPlanId = useMemo(() => {
    if (plans.length < 2) return null;
    let best = null;
    let bestCount = 0;
    for (const plan of plans) {
      const count = gymCount(plan);
      if (count > bestCount) {
        best = plan.id;
        bestCount = count;
      }
    }
    return bestCount > 0 ? best : null;
  }, [plans]);

  const statusLine =
    plans.length > 0
      ? priceMin === priceMax
        ? t('admin.saasPlansStatusLineSingle', {
            count: plans.length,
            price: formatMoney(priceMin),
            gyms: gymsOnPlans,
          })
        : t('admin.saasPlansStatusLine', {
            count: plans.length,
            from: formatMoney(priceMin),
            to: formatMoney(priceMax),
            gyms: gymsOnPlans,
          })
      : t('admin.saasPlansStatusLineEmpty');

  const handleCreate = async (payload) => {
    setSaving(true);
    setError('');
    try {
      const res = await createSaasPlan(apiFetch, payload);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to create plan');
      setIsAddOpen(false);
      runInBackground(fetchPlans());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (plan) => {
    setError('');
    setSelectedPlan(plan);
  };

  const handleUpdate = async (payload) => {
    if (!selectedPlan) return;
    setSaving(true);
    setError('');
    try {
      const res = await updateSaasPlan(apiFetch, selectedPlan.id, payload);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to update plan');
      setSelectedPlan(null);
      runInBackground(fetchPlans());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (plan) => {
    const count = gymCount(plan);
    if (count > 0) {
      setError(t('admin.cannotDeletePlan', { name: plan.name, count }));
      return;
    }
    setDeletePlan(plan);
  };

  const handleConfirmDelete = async () => {
    if (!deletePlan) return;
    const planId = deletePlan.id;
    setDeletePlan(null);
    setError('');
    try {
      const res = await deleteSaasPlan(apiFetch, planId);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to delete plan');
      runInBackground(fetchPlans());
    } catch (err) {
      setError(err.message);
    }
  };

  const openCreate = () => {
    setError('');
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('admin.saasPlansPageTitle')}
        subtitle={statusLine}
        actions={
          plans.length > 0 ? (
            <Button onClick={openCreate}>
              {t('admin.createSaasPlan')}
            </Button>
          ) : null
        }
      />

      {error && !(isAddOpen || selectedPlan) ? (
        <ErrorRetryBanner message={error} onRetry={fetchPlans} />
      ) : null}

      {loading && plans.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : plans.length > 0 ? (
        <>
          <div className="flex justify-start">
            <label className="sr-only" htmlFor="saas-plans-sort">
              {t('pages.plans.sortLabel')}
            </label>
            <select
              id="saas-plans-sort"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {sortedPlans.map((plan) => {
              const gyms = gymCount(plan);
              const perMonth = monthlyRate(plan);
              const isPopular = plan.id === popularPlanId;

              return (
                <Card
                  key={plan.id}
                  className={`relative p-5 ${
                    isPopular ? 'ring-2 ring-teal-500/50 dark:ring-teal-400/40' : ''
                  }`}
                >
                  {isPopular ? (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-teal-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-50 dark:bg-teal-900 dark:text-teal-100">
                      {t('pages.plans.popular')}
                    </span>
                  ) : null}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-2xl font-black tracking-tight text-app-text-strong sm:text-[1.65rem]">
                        {formatMoney(plan.price)}
                      </p>
                      {perMonth != null ? (
                        <p className="mt-0.5 text-xs text-app-muted">
                          {t('pages.plans.perMonth', { amount: formatMoney(perMonth) })}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-app-muted">
                          {t('common.month', { count: plan.duration })}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleEditClick(plan)}
                        className="rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-teal-700 dark:hover:text-teal-300"
                        title={t('admin.editSaasPlan')}
                        aria-label={t('admin.editSaasPlan')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(plan)}
                        className="rounded-lg p-2 text-app-muted hover:bg-app-surface hover:text-rose-600 dark:hover:text-rose-400"
                        title={t('admin.deleteSaasPlanTitle')}
                        aria-label={t('admin.deleteSaasPlanTitle')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3
                    className="mt-4 truncate text-base font-semibold text-app-text-strong"
                    title={plan.name}
                  >
                    {plan.name}
                  </h3>

                  {plan.description ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-snug text-app-muted">
                      {plan.description}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-500/15 dark:text-teal-300">
                      {t('common.month', { count: plan.duration })}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-app-muted">
                      <Building2 className="h-3.5 w-3.5" />
                      {t('common.gymSubscribed', { count: gyms })}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div className={cardSurface}>
          <EmptyState
            icon={HelpCircle}
            title={t('admin.noSaasPlansTitle')}
            body={t('admin.noSaasPlansBody')}
            action={
              <Button onClick={openCreate}>
                {t('admin.createFirstSaasPlan')}
              </Button>
            }
          />
        </div>
      )}

      <PlanModal
        isOpen={isAddOpen}
        title={t('admin.createSaasPlan')}
        onClose={() => {
          setIsAddOpen(false);
          setError('');
        }}
        onSubmit={handleCreate}
        saving={saving}
        showDescription
        error={isAddOpen ? error : ''}
      />
      <PlanModal
        isOpen={!!selectedPlan}
        plan={selectedPlan}
        title={t('admin.editSaasPlan')}
        onClose={() => {
          setSelectedPlan(null);
          setError('');
        }}
        onSubmit={handleUpdate}
        saving={saving}
        showDescription
        error={selectedPlan ? error : ''}
      />

      <ConfirmDialog
        isOpen={!!deletePlan}
        title={t('admin.deleteSaasPlanTitle')}
        message={t('admin.deleteSaasPlanMessage', { name: deletePlan?.name })}
        confirmText={t('admin.deleteSaasPlanConfirm')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletePlan(null)}
      />
    </div>
  );
}
