/**
 * Shared light/dark surface classes for cards, panels, and chrome.
 * Prefer app-* CSS vars (light defaults, html.dark overrides) over slate dualism.
 *
 * Color semantics: teal/brand = primary actions; status tokens = membership state only.
 */

export const shellPage =
  'min-h-screen bg-app-bg text-app-text-strong';

export const shellHeader =
  'border-b border-app-border-subtle bg-app-surface';

/** Teal-ink sidebar — brand atmosphere via .app-sidebar (CSS), dark chrome. */
export const sidebarSurface =
  'app-sidebar relative overflow-hidden text-slate-300 border-r border-white/[0.06] dark:text-app-text dark:border-app-border-subtle';

export const sidebarNavIdle =
  'relative z-[1] text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 dark:text-app-muted dark:hover:bg-app-raised/80 dark:hover:text-app-text-strong';

/** Active nav: subtle fill + left accent bar. */
export const sidebarNavActive =
  'relative z-[1] bg-white/[0.08] text-white before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-teal-400 dark:bg-app-raised/90 dark:text-app-text-strong dark:before:bg-teal-400';

export const cardSurface =
  'rounded-xl bg-app-raised ring-1 ring-app-border-subtle';

/** Quieter panel — surface tier, not full white card. */
export const panelQuiet =
  'rounded-xl bg-app-surface ring-1 ring-app-border-subtle';

export const sectionDivider =
  'border-t border-app-border-subtle';

export const cardHeader =
  'border-b border-app-border-subtle bg-app-surface';

export const inputSurface = 'w-full app-field';

export const selectSurface =
  'app-field ui-select h-10 w-fit max-w-full shrink-0 cursor-pointer';

export const menuSurface =
  'rounded-xl bg-app-raised ring-1 ring-app-border-subtle shadow-[0_8px_24px_rgb(28_25_23/0.08)] dark:shadow-none';

export const menuItem =
  'text-app-text hover:bg-app-surface';

export const overlayBackdrop =
  'bg-slate-900/50 backdrop-blur-sm dark:bg-black/55 dark:backdrop-blur-[2px]';

export const mutedText = 'text-app-muted';

export const headingText = 'text-app-text-strong';

/** Page-level H1 (PageHeader, dashboard). */
export const pageTitle =
  'font-display text-3xl font-semibold tracking-tight text-app-text-strong sm:text-4xl';

/** Mid-page section titles (payment history, charts). */
export const sectionTitle =
  'font-display text-base font-semibold tracking-tight text-app-text-strong sm:text-lg';

/** Compact panel / card chrome titles. */
export const panelTitle =
  'font-display text-sm font-semibold tracking-tight text-app-text-strong sm:text-base';

/** Modal / drawer titles. */
export const modalTitle =
  'font-display text-lg font-semibold tracking-tight text-app-text-strong';

export const tableRowHover =
  'hover:bg-app-surface';

/** Idle icon action in tables / list rows. */
export const iconActionIdle =
  'inline-flex items-center justify-center rounded-md text-app-muted hover:bg-app-surface hover:text-brand cursor-pointer';

export const iconActionSuccess =
  'text-app-muted hover:bg-app-surface hover:text-[color:var(--color-status-active)] cursor-pointer';

export const iconActionDanger =
  'text-app-muted hover:bg-app-surface hover:text-[color:var(--color-status-expired)] cursor-pointer';

/** Solid renew CTA — deep teal + white in both themes (avoid dark-mode bright brand fill). */
export const renewActionBtn =
  'inline-flex items-center gap-1 rounded-lg bg-[#0f766e] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0d9488] cursor-pointer dark:bg-teal-600 dark:hover:bg-teal-500';

/** Solid collect CTA — amber for unpaid / at-risk payment rows. */
export const collectActionBtn =
  'inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 cursor-pointer dark:bg-amber-600 dark:hover:bg-amber-500';
