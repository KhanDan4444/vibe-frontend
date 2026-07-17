/** Shared light/dark surface classes for cards, panels, and chrome. */

export const shellPage =
  'min-h-screen bg-slate-50 text-slate-900 dark:bg-app-bg dark:text-app-text';

export const shellHeader =
  'border-b border-slate-200 bg-white dark:border-app-border-subtle dark:bg-app-surface';

export const sidebarSurface =
  'bg-slate-900 text-slate-300 dark:bg-app-sidebar dark:text-app-text dark:border-app-border-subtle';

export const sidebarNavIdle =
  'text-slate-200 hover:bg-slate-800 hover:text-white dark:text-app-text dark:hover:bg-app-raised dark:hover:text-app-text-strong';

/** Active nav: soft brand fill + left accent bar (less “pill clone”). */
export const sidebarNavActive =
  'relative bg-teal-700/90 text-white before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-teal-300';

export const cardSurface =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-app-border-subtle dark:bg-app-raised';

/** Quieter panel — lighter chrome for dashboards / drawers. */
export const panelQuiet =
  'rounded-lg border border-slate-200/80 bg-white dark:border-app-border-subtle dark:bg-app-raised/80';

export const sectionDivider =
  'border-t border-slate-100 dark:border-app-border-subtle';

export const cardHeader =
  'border-b border-slate-100 bg-slate-50/50 dark:border-app-border-subtle dark:bg-app-surface/80';

export const inputSurface =
  'rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-app-border dark:bg-app-input dark:text-app-text';

export const menuSurface =
  'border border-slate-200 bg-white dark:border-app-border-subtle dark:bg-app-raised';

export const menuItem =
  'text-slate-700 hover:bg-slate-50 dark:text-app-text dark:hover:bg-app-surface/80';

export const overlayBackdrop =
  'bg-slate-900/50 backdrop-blur-sm dark:bg-black/55 dark:backdrop-blur-[2px]';

export const mutedText = 'text-slate-500 dark:text-app-muted';

export const headingText = 'text-slate-900 dark:text-app-text-strong';

export const tableRowHover =
  'hover:bg-slate-50 dark:hover:bg-app-surface/60';
