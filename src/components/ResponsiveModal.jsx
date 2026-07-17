import React, { useEffect, useRef } from 'react';
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

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobile-first modal shell: bottom sheet on phones, centered dialog on sm+.
 * Traps focus while open and restores focus to the previously focused element on close.
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
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const panel = panelRef.current;
    const focusFirst = () => {
      const nodes = panel?.querySelectorAll(FOCUSABLE);
      const first = nodes?.[0];
      if (first instanceof HTMLElement) first.focus();
      else panel?.focus();
    };
    const id = window.requestAnimationFrame(focusFirst);

    const onKeyDown = (e) => {
      if (e.key !== 'Tab' || !panel) return;
      const nodes = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => el instanceof HTMLElement && !el.hasAttribute('disabled')
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const panel = PANEL_BY_SIZE[size] || modalPanelMd;

  return (
    <div className={`${modalOverlay} ${zIndexClass}`}>
      <div className={modalBackdrop} aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`${panel} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
