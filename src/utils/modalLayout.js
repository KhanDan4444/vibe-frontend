/** Shared mobile-first modal layout (bottom sheet on phones, centered on sm+). */

export const modalOverlay = 'fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4';

export const modalBackdrop =
  'fixed inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/55 dark:backdrop-blur-[2px]';

export const modalPanelBase =
  'safe-bottom relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-app-border-subtle bg-app-raised shadow-[0_12px_40px_rgb(28_25_23/0.12)] animate-in slide-in-from-bottom duration-200 sm:max-h-[min(90vh,720px)] sm:rounded-2xl sm:animate-in sm:zoom-in-95 sm:duration-150 dark:shadow-xl';

export const modalPanelSm = `${modalPanelBase} max-w-sm`;
export const modalPanelMd = `${modalPanelBase} max-w-md`;
export const modalPanelLg = `${modalPanelBase} max-w-lg`;
export const modalPanelXl = `${modalPanelBase} max-w-xl`;
export const modalPanel2xl = `${modalPanelBase} max-w-2xl sm:max-h-[min(92vh,800px)]`;
export const modalPanel3xl = `${modalPanelBase} max-w-3xl sm:max-h-[min(92vh,900px)]`;

export const modalBody = 'min-h-0 flex-1 overflow-y-auto p-4 text-app-text sm:p-6';

export const modalHeader =
  'shrink-0 border-b border-app-border-subtle px-4 py-4 sm:px-6 sm:py-5';

export const modalFieldLabel = 'form-label';

/** Canonical action footer — keeps breathing room under buttons (+ device safe area). */
export const modalFooter =
  'safe-bottom sticky bottom-0 z-10 shrink-0 flex flex-col-reverse gap-2 border-t border-app-border-subtle bg-app-raised px-4 pt-4 [--safe-bottom-base:1.25rem] sm:flex-row sm:justify-end sm:gap-3 sm:px-6';

/**
 * In-body sticky bar for multi-step wizards (member enroll / register gym).
 * Matches modalFooter bottom spacing so actions never sit flush.
 */
export const modalStepFooter =
  'safe-bottom sticky bottom-0 z-10 -mx-4 mt-2 border-t border-app-border-subtle bg-app-raised/95 px-4 pt-4 backdrop-blur [--safe-bottom-base:1.25rem] sm:-mx-6 sm:px-6';
