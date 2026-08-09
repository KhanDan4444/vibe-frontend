import React, { useState, useCallback } from 'react';
import { useModalFormDraft } from '../utils/useModalFormDraft';
import { X, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import RequiredMark from './ui/RequiredMark';
import { modalBody, modalHeader, modalFooter } from '../utils/modalLayout';

/**
 * Owner-only: move a member to another active branch.
 */
export default function TransferMemberModal({
  isOpen,
  onClose,
  onSubmit,
  member,
  branches = [],
  saving = false,
  error,
}) {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState('');

  const activeBranches = branches.filter(
    (b) => b.is_active !== false && b.id !== member?.branchId
  );
  const defaultBranchId = activeBranches[0]?.id ?? '';

  const initDefaults = useCallback(() => {
    setBranchId(String(defaultBranchId));
  }, [defaultBranchId]);

  const { markTouched } = useModalFormDraft({
    isOpen,
    scopeKey: member?.id,
    initialize: initDefaults,
    saving,
  });

  if (!member) return null;

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" zIndexClass="z-[110]">
      <div className={`${modalHeader} flex items-center justify-between gap-3`}>
        <h2 className="text-lg font-bold text-app-text-strong">{t('modals.transfer.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-app-muted hover:bg-app-surface"
          aria-label={t('aria.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!branchId) return;
          onSubmit(parseInt(branchId, 10));
        }}
        onChangeCapture={markTouched}
      >
        <div className={`${modalBody} space-y-4`}>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          <p className="text-sm text-app-text">
            {t('modals.transfer.body', { name: member.name })}
            {member.branchName ? (
              <>
                {' '}
                ({member.branchName})
              </>
            ) : null}
          </p>

          {activeBranches.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              {t('modals.transfer.noBranches')}
            </p>
          ) : (
            <div>
              <label htmlFor="transfer-branch" className="form-label">
                {t('modals.transfer.targetBranch')}
                <RequiredMark />
              </label>
              <div className="relative mt-1.5">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
                <select
                  id="transfer-branch"
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="block w-full rounded-lg border border-app-border bg-app-input py-2.5 pl-9 pr-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                >
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.is_default ? t('branch.defaultSuffix') : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className={modalFooter}>
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving || activeBranches.length === 0} className="w-full sm:w-auto">
            {saving ? t('common.processing') : t('modals.transfer.save')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
