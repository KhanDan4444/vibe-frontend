import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import { modalBody, modalFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';

/**
 * Accessible confirmation dialog (replaces window.confirm).
 * Danger variant uses a soft icon well + solid rose CTA (not ghost text).
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
  const isDanger = type === 'danger';

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  return (
    <ResponsiveModal open={isOpen} onClose={onCancel} size="md" zIndexClass="z-[100]" labelledBy="confirm-dialog-title">
      <div className={modalBody}>
        <div className="flex items-start gap-3.5">
          {isDanger ? (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300"
              aria-hidden
            >
              <AlertTriangle className="h-5 w-5" strokeWidth={2} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 id="confirm-dialog-title" className={`${modalTitle} tracking-tight`}>
              {title}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-app-muted">{message}</p>
          </div>
        </div>
      </div>
      <div className={modalFooter}>
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          {resolvedCancel}
        </Button>
        <Button
          type="button"
          variant={isDanger ? 'danger' : 'primary'}
          onClick={onConfirm}
          className="w-full sm:w-auto"
        >
          {resolvedConfirm}
        </Button>
      </div>
    </ResponsiveModal>
  );
}
