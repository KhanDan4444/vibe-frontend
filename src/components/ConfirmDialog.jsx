import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from './ResponsiveModal';
import Button from './ui/Button';
import { modalBody, modalFooter } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';

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
        <div className="flex items-start gap-3">
          {isDanger ? (
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-status-expired)]"
              aria-hidden
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className={modalTitle}>
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-app-muted">{message}</p>
          </div>
        </div>
      </div>
      <div className={modalFooter}>
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          {resolvedCancel}
        </Button>
        <Button
          type="button"
          variant={isDanger ? 'dangerGhost' : 'primary'}
          onClick={onConfirm}
          className="w-full sm:w-auto"
        >
          {resolvedConfirm}
        </Button>
      </div>
    </ResponsiveModal>
  );
}
