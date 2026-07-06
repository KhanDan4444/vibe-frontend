import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from './ResponsiveModal';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';

/**
 * Reassign all active staff from one branch to another before deactivation.
 */
export default function ReassignStaffModal({
  isOpen,
  onClose,
  onSubmit,
  branch,
  branches = [],
  deactivateAfter = false,
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const [targetBranchId, setTargetBranchId] = useState('');

  const targetOptions = branches.filter(
    (b) => b.is_active !== false && b.id !== branch?.id
  );
  const defaultTargetId = targetOptions[0]?.id ?? '';

  const initDefaults = useCallback(() => {
    setTargetBranchId(String(defaultTargetId));
  }, [defaultTargetId]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: branch ? `${branch.id}:${deactivateAfter ? 1 : 0}` : undefined,
    initialize: initDefaults,
    saving,
  });

  if (!branch) return null;

  const staffCount = branch.staff_count ?? 0;

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-[100]">
      <div className={`${modalHeader} flex items-center justify-between gap-3`}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-app-text-strong">{t('modals.reassignStaff.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!targetBranchId) return;
          onSubmit(parseInt(targetBranchId, 10));
        }}
        onChangeCapture={markTouched}
      >
        <div className={`${modalBody} space-y-4`}>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-app-text">
            <span className="font-semibold text-slate-900 dark:text-app-text-strong">{branch.name}</span>{' '}
            {t('modals.reassignStaff.body', { name: branch.name })}
          </p>

          {targetOptions.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              {t('modals.reassignStaff.noBranches')}
            </p>
          ) : (
            <div>
              <label htmlFor="reassign-target" className="form-label">
                {t('modals.reassignStaff.targetBranch')}
              </label>
              <div className="relative mt-1.5">
                <UserCog className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="reassign-target"
                  required
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-app-border-subtle bg-white  dark:bg-app-raised py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {targetOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className={modalFooter}>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-200 dark:border-app-border-subtle px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-app-text hover:bg-slate-50 dark:hover:bg-app-surface/60 sm:w-auto"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || targetOptions.length === 0}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
          >
            {saving ? t('common.processing') : t('modals.reassignStaff.save')}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
