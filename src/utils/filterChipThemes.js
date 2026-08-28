/**
 * Color palettes aligned with vibe-mobile + --color-status-*.
 * Every status chip keeps a pill shell; attention filters use stronger tint.
 */
export const FILTER_CHIP_THEMES = {
  all: {
    dot: 'bg-app-muted',
    active:
      'bg-app-muted/20 border-app-muted text-app-text-strong',
    inactive:
      'bg-app-raised border-app-border text-app-muted hover:bg-app-surface/80 hover:text-app-text',
    badgeActive: 'bg-app-muted text-white',
    badgeInactive: 'bg-app-surface text-app-muted',
  },
  active: {
    dot: 'bg-[color:var(--color-status-active)]',
    active:
      'bg-[color:var(--color-status-active)]/15 border-[color:var(--color-status-active)] text-[color:var(--color-status-active)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-active)]/35 text-[color:var(--color-status-active)] hover:bg-[color:var(--color-status-active)]/10',
    badgeActive: 'bg-[color:var(--color-status-active)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-active)]/15 text-[color:var(--color-status-active)]',
  },
  unpaid: {
    dot: 'bg-[color:var(--color-status-unpaid)]',
    active:
      'bg-[color:var(--color-status-unpaid)]/15 border-[color:var(--color-status-unpaid)] text-[color:var(--color-status-unpaid)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-unpaid)]/35 text-[color:var(--color-status-unpaid)] hover:bg-[color:var(--color-status-unpaid)]/10',
    badgeActive: 'bg-[color:var(--color-status-unpaid)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-unpaid)]/15 text-[color:var(--color-status-unpaid)]',
  },
  due_soon: {
    dot: 'bg-[color:var(--color-status-due-soon)]',
    active:
      'bg-[color:var(--color-status-due-soon)]/15 border-[color:var(--color-status-due-soon)] text-[color:var(--color-status-due-soon)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-due-soon)]/35 text-[color:var(--color-status-due-soon)] hover:bg-[color:var(--color-status-due-soon)]/10',
    badgeActive: 'bg-[color:var(--color-status-due-soon)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-due-soon)]/15 text-[color:var(--color-status-due-soon)]',
  },
  trial_ending: {
    dot: 'bg-[color:var(--color-status-trialing)]',
    active:
      'bg-[color:var(--color-status-trialing)]/15 border-[color:var(--color-status-trialing)] text-[color:var(--color-status-trialing)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-trialing)]/35 text-[color:var(--color-status-trialing)] hover:bg-[color:var(--color-status-trialing)]/10',
    badgeActive: 'bg-[color:var(--color-status-trialing)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-trialing)]/15 text-[color:var(--color-status-trialing)]',
  },
  expired: {
    dot: 'bg-[color:var(--color-status-expired)]',
    active:
      'bg-[color:var(--color-status-expired)]/15 border-[color:var(--color-status-expired)] text-[color:var(--color-status-expired)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-expired)]/35 text-[color:var(--color-status-expired)] hover:bg-[color:var(--color-status-expired)]/10',
    badgeActive: 'bg-[color:var(--color-status-expired)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-expired)]/15 text-[color:var(--color-status-expired)]',
  },
  new: {
    /* Soft parchment — whitish cream, not bright */
    dot: 'bg-[#c4b8a8] dark:bg-[#c9c0b2]',
    active:
      'bg-[#efeae1] border-[#d4cdc0] text-[#6e675c] dark:bg-[#2e2b26] dark:border-[#6a6358] dark:text-[#d8d0c4]',
    inactive:
      'bg-app-raised border-[#d8d2c6]/80 text-[#8a8276] hover:bg-[#f5f1ea] dark:border-[#6a6358]/45 dark:text-[#b8b0a4] dark:hover:bg-[#2e2b26]/75',
    badgeActive: 'bg-[#a39888] text-white dark:bg-[#c9c0b2] dark:text-[#1c1a17]',
    badgeInactive:
      'bg-[#efeae1] text-[#6e675c] dark:bg-[#3a3630] dark:text-[#d8d0c4]',
  },
  inactive_week: {
    dot: 'bg-app-muted',
    active:
      'bg-app-muted/20 border-app-muted text-app-text-strong',
    inactive:
      'bg-app-raised border-app-border text-app-muted hover:bg-app-surface/80 hover:text-app-text',
    badgeActive: 'bg-app-muted text-white',
    badgeInactive: 'bg-app-surface text-app-muted',
  },
  former: {
    dot: 'bg-[color:var(--color-status-former)]',
    active:
      'bg-[color:var(--color-status-former)]/15 border-[color:var(--color-status-former)] text-[color:var(--color-status-former)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-former)]/40 text-[color:var(--color-status-former)] hover:bg-[color:var(--color-status-former)]/10',
    badgeActive: 'bg-[color:var(--color-status-former)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-former)]/15 text-[color:var(--color-status-former)]',
  },
};

/** Hex colors matching status tokens (for charts — light defaults). */
export const MEMBER_FILTER_CHART_COLORS = {
  Active: '#10b981',
  Unpaid: '#f97316',
  'Due Soon': '#38bdf8',
  Expired: '#fb7185',
  Former: '#78716c',
  Suspended: '#fb7185',
};
