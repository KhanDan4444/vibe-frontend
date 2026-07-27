/**
 * Shared light/dark surface classes for cards, panels, and chrome.
 *
 * Color semantics: teal/brand = primary actions; emerald/sky/rose/amber = status only.
 */

export const shellPage =
  'min-h-screen bg-slate-50 text-slate-900 dark:bg-app-bg dark:text-app-text';

export const shellHeader =
  'border-b border-slate-200/80 bg-white dark:border-app-border-subtle dark:bg-app-surface';

/** Refined dark sidebar — softer than slate-900 template look. */
export const sidebarSurface =
  'bg-[#1a1f28] text-slate-300 border-r border-white/[0.06] dark:bg-app-sidebar dark:text-app-text dark:border-app-border-subtle';

export const sidebarNavIdle =
  'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 dark:text-app-muted dark:hover:bg-app-raised/80 dark:hover:text-app-text-strong';

/** Active nav: subtle fill + left accent bar. */
export const sidebarNavActive =
  'relative bg-white/[0.08] text-white before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-teal-400 dark:bg-app-raised/90 dark:text-app-text-strong dark:before:bg-teal-400';

export const cardSurface =
  'rounded-xl bg-white ring-1 ring-slate-200/80 dark:bg-app-raised dark:ring-app-border-subtle';

/** Quieter panel — metrics and nested sections (same radius as cards). */
export const panelQuiet =
  'rounded-xl bg-white ring-1 ring-slate-200/70 dark:bg-app-raised/90 dark:ring-app-border-subtle';

export const sectionDivider =
  'border-t border-slate-100 dark:border-app-border-subtle';

export const cardHeader =
  'border-b border-slate-100/80 bg-slate-50/60 dark:border-app-border-subtle dark:bg-app-surface/60';

export const inputSurface =
  'rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-app-border dark:bg-app-input dark:text-app-text';

export const selectSurface =
  'h-10 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white bg-[length:16px] bg-[right_10px_center] bg-no-repeat px-3 pr-9 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-app-border-subtle dark:bg-app-raised dark:text-app-text-strong disabled:cursor-not-allowed disabled:opacity-60';

export const menuSurface =
  'rounded-xl bg-white ring-1 ring-slate-200/80 dark:bg-app-raised dark:ring-app-border-subtle';

export const menuItem =
  'text-slate-700 hover:bg-slate-50 dark:text-app-text dark:hover:bg-app-surface/80';

export const overlayBackdrop =
  'bg-slate-900/50 backdrop-blur-sm dark:bg-black/55 dark:backdrop-blur-[2px]';

export const mutedText = 'text-slate-500 dark:text-app-muted';

export const headingText = 'text-slate-900 dark:text-app-text-strong';

export const pageTitle =
  'text-2xl font-semibold tracking-tight text-slate-900 dark:text-app-text-strong sm:text-3xl';

export const tableRowHover =
  'hover:bg-slate-50/80 dark:hover:bg-app-surface/60';
