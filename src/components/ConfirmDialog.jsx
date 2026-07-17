import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from './ResponsiveModal';
import { modalBody, modalFooter } from '../utils/modalLayout';

/**
 * Accessible confirmation dialog (replaces window.confirm).
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = 'danger',
}) {
  const { t } = useTranslation();
  const resolvedConfirm = confirmText ?? t('common.confirm');
  const resolvedCancel = cancelText ?? t('common.cancel');
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  const typeStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
    primary: 'bg-teal-700 hover:bg-teal-700 text-white focus:ring-teal-600',
  };

  return (
    <ResponsiveModal open={isOpen} onClose={onCancel} size="md" zIndexClass="z-[100]" labelledBy="confirm-dialog-title">
      <div className={modalBody}>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900 dark:text-app-text-strong">
              {title}
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-app-muted">{message}</p>
          </div>
        </div>
      </div>
      <div className={modalFooter}>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none dark:border-app-border dark:bg-app-raised dark:text-app-text dark:hover:bg-app-surface/80 sm:w-auto"
        >
          {resolvedCancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto ${typeStyles[type]}`}
        >
          {resolvedConfirm}
        </button>
      </div>
    </ResponsiveModal>
  );
}
