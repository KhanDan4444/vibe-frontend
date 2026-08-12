/**
 * Color palettes aligned with vibe-mobile + --color-status-*.
 * All / Active stay quiet; unpaid / due soon / expired lead the eye.
 */
export const FILTER_CHIP_THEMES = {
  all: {
    dot: 'bg-app-muted/60',
    active: 'bg-app-surface border-app-border text-app-text-strong',
    inactive:
      'bg-transparent border-transparent text-app-muted hover:bg-app-surface/80 hover:text-app-text',
    badgeActive: 'bg-app-muted text-white',
    badgeInactive: 'bg-app-surface text-app-muted',
  },
  active: {
    dot: 'bg-[color:var(--color-status-active)]/70',
    active:
      'bg-[color:var(--color-status-active)]/12 border-[color:var(--color-status-active)]/50 text-[color:var(--color-status-active)]',
    inactive:
      'bg-transparent border-transparent text-app-muted hover:bg-[color:var(--color-status-active)]/10 hover:text-[color:var(--color-status-active)]',
    badgeActive: 'bg-[color:var(--color-status-active)] text-white',
    badgeInactive: 'bg-app-surface text-app-muted',
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
};

/** Hex colors matching status tokens (for charts — light defaults). */
export const MEMBER_FILTER_CHART_COLORS = {
  Active: '#10b981',
  Unpaid: '#f97316',
  'Due Soon': '#38bdf8',
  Expired: '#fb7185',
  Suspended: '#fb7185',
};
