import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Dumbbell, Plus, Trash2, Edit, HelpCircle } from 'lucide-react';
import { parseApiResponse } from '../../utils/api';
import PlanModal from '../../components/PlanModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getSaasPlans, createSaasPlan, updateSaasPlan, deleteSaasPlan } from '../../services/saasPlanService';
import { useTranslation } from 'react-i18next';
import { PlanCardSkeleton } from '../../components/LoadingSkeletons';
import { formatMoney } from '../../utils/formatMoney';
import { runInBackground } from '../../utils/runInBackground';

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

  // Keep a mutable ref of the callback to prevent the fetchPlans recreation loop
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
    const gymCount = Number(plan.gym_count || 0);
    if (gymCount > 0) {
      setError(t('admin.cannotDeletePlan', { name: plan.name, count: gymCount }));
      return;
    }
    setDeletePlan(plan);
  };

  const handleConfirmDelete = async () => {
    if (!deletePlan) return;
    const planId = deletePlan.id;
    setDeletePlan(null);
    try {
      const res = await deleteSaasPlan(apiFetch, planId);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to delete plan');
      runInBackground(fetchPlans());
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && plans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-app-text-strong">{t('admin.saasPlansPageTitle')}</h2>
            <p className="text-sm text-slate-500">{t('admin.saasPlansPageSubtitle')}</p>
          </div>
          <div className="app-skeleton h-10 w-36 rounded-lg" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-app-text-strong">{t('admin.saasPlansPageTitle')}</h2>
          <p className="text-sm text-slate-500">
            {t('admin.saasPlansPageSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAddOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> {t('admin.createSaasPlan')}
        </button>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchPlans}
            className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {plans.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised p-6 shadow-sm"
            >
              <div className="absolute right-3 top-3 flex gap-1 sm:right-4 sm:top-4">
                <button
                  type="button"
                  onClick={() => handleEditClick(plan)}
                  className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-app-surface/60 hover:text-teal-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={t('common.edit')}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(plan)}
                  className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-app-surface/60 hover:text-rose-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-teal-50 p-2.5 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                    <Dumbbell className="h-6 w-6" />
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-app-text-strong text-lg pr-16">{plan.name}</h3>
                </div>
                {plan.description && (
                  <p className="text-sm text-slate-500 line-clamp-3">{plan.description}</p>
                )}
                <p className="text-xs text-slate-400">
                  {t('common.gymSubscribed', { count: Number(plan.gym_count || 0) })}
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-app-border-subtle flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-app-text-strong">
                  {formatMoney(plan.price)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-app-border-subtle dark:bg-app-surface dark:text-app-muted">
                  {t('common.month', { count: plan.duration })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-16 text-center dark:border-app-border-subtle dark:bg-app-raised/80">
          <HelpCircle className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-600 dark:text-app-text">{t('admin.noSaasPlansTitle')}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-app-muted">{t('admin.noSaasPlansBody')}</p>
        </div>
      )}

      <PlanModal
        isOpen={isAddOpen}
        title={t('admin.createSaasPlan')}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleCreate}
        saving={saving}
        showDescription={true}
      />
      <PlanModal
        isOpen={!!selectedPlan}
        plan={selectedPlan}
        title={t('admin.editSaasPlan')}
        onClose={() => setSelectedPlan(null)}
        onSubmit={handleUpdate}
        saving={saving}
        showDescription={true}
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