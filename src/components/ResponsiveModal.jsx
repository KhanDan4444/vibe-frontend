import React, { useEffect } from 'react';
import {
  modalOverlay,
  modalBackdrop,
  modalPanelSm,
  modalPanelMd,
  modalPanelLg,
  modalPanelXl,
  modalPanel2xl,
  modalPanel3xl,
} from '../utils/modalLayout';

const PANEL_BY_SIZE = {
  sm: modalPanelSm,
  md: modalPanelMd,
  lg: modalPanelLg,
  xl: modalPanelXl,
  '2xl': modalPanel2xl,
  '3xl': modalPanel3xl,
};

/**
 * Mobile-first modal shell: bottom sheet on phones, centered dialog on sm+.
 */
export default function ResponsiveModal({
  open,
  onClose,
  children,
  size = 'md',
  zIndexClass = 'z-[70]',
  className = '',
  labelledBy,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panel = PANEL_BY_SIZE[size] || modalPanelMd;

  return (
    <div className={`${modalOverlay} ${zIndexClass}`}>
      <div className={modalBackdrop} aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`${panel} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
