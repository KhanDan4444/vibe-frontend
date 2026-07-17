// src/pages/owner/Plans.jsx
import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { useAuth } from '../../context/AuthContext';
import { isGymOwner } from '../../utils/roles';
import { Dumbbell, Plus, Trash2, Edit, HelpCircle } from 'lucide-react';
import PlanModal from '../../components/PlanModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { PlanCardSkeleton } from '../../components/LoadingSkeletons';
import { useTranslation } from 'react-i18next';
import { cardSurface } from '../../utils/surfaceClasses';

export default function Plans() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { plans, addPlan, deletePlan, updatePlan, readOnly, loading: gymLoading } = useGym();
  const canManagePlans = isGymOwner(user?.role) && !readOnly;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit/Delete State
  const [editingPlan, setEditingPlan] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
    // Check if any active members are assigned to this tier
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-app-text-strong sm:text-2xl">{t('pages.plans.title')}</h1>
          <p className="text-sm text-slate-500">
            {t('pages.plans.subtitle')}
          </p>
        </div>
        {canManagePlans && (
          <button
            onClick={() => {
              setError('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> {t('pages.plans.add')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>
      )}

      {/* Grid Layout or Empty State */}
      {gymLoading && plans.length === 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : plans.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between p-6 shadow-sm hover:shadow-md transition-all duration-200 group ${cardSurface}`}
            >
              {canManagePlans && (
                <div className="absolute right-3 top-3 flex gap-1 sm:right-4 sm:top-4">
                  <button
                    type="button"
                    onClick={() => handleEditClick(plan)}
                    className="rounded-lg p-2.5 text-slate-400 active:bg-slate-100 active:text-teal-700 sm:p-1.5 sm:hover:bg-slate-50 dark:hover:bg-app-surface/60 sm:hover:text-teal-700"
                    title={t('pages.plans.editPlanTitle')}
                    aria-label={t('pages.plans.editPlanTitle')}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePlanClick(plan)}
                    className="rounded-lg p-2.5 text-slate-400 active:bg-slate-100 active:text-rose-600 sm:p-1.5 sm:hover:bg-slate-50 dark:hover:bg-app-surface/60 sm:hover:text-rose-600"
                    title={t('pages.plans.deletePlanTitle')}
                    aria-label={t('pages.plans.deletePlanTitle')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
                    <Dumbbell className="h-6 w-6" />
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-app-text-strong text-lg pr-16 truncate" title={plan.name}>
                    {plan.name}
                  </h3>
                </div>
                {plan.description && (
                  <p className="text-sm text-slate-500 leading-relaxed min-h-[40px] line-clamp-3">
                    {plan.description}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-app-border-subtle flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-app-text-strong">
                  {plan.price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                </span>
                <span className="text-xs font-semibold rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:text-app-text">
                  {t('common.month', { count: plan.duration })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-20 rounded-2xl border border-slate-200 dark:border-app-border-subtle p-6 shadow-sm ${cardSurface}`}>
          <HelpCircle className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-app-text-strong">{t('pages.plans.emptyTitle')}</h3>
          <p className="text-sm text-slate-500 dark:text-app-muted max-w-sm mx-auto mt-1">
            {t('pages.plans.emptyBody')}
          </p>
          {canManagePlans && (
            <button
              onClick={() => {
                setError('');
                setIsAddModalOpen(true);
              }}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-app-border-subtle px-4 py-2 text-sm font-semibold text-slate-700 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 cursor-pointer"
            >
              {t('pages.plans.createFirst')}
            </button>
          )}
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