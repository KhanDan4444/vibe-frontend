/** Color palettes aligned with vibe-mobile member filter chips + --color-status-*. */
export const FILTER_CHIP_THEMES = {
  all: {
    dot: 'bg-app-muted',
    active: 'bg-app-muted/15 border-app-muted text-app-text-strong',
    inactive:
      'bg-app-raised border-app-border-subtle text-app-text hover:bg-app-surface/60',
    badgeActive: 'bg-app-muted text-white',
    badgeInactive: 'bg-app-surface text-app-muted',
  },
  active: {
    dot: 'bg-[color:var(--color-status-active)]',
    active:
      'bg-[color:var(--color-status-active)]/15 border-[color:var(--color-status-active)] text-[color:var(--color-status-active)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-active)]/30 text-[color:var(--color-status-active)] hover:bg-[color:var(--color-status-active)]/10',
    badgeActive: 'bg-[color:var(--color-status-active)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-active)]/15 text-[color:var(--color-status-active)]',
  },
  unpaid: {
    dot: 'bg-[color:var(--color-status-unpaid)]',
    active:
      'bg-[color:var(--color-status-unpaid)]/15 border-[color:var(--color-status-unpaid)] text-[color:var(--color-status-unpaid)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-unpaid)]/30 text-[color:var(--color-status-unpaid)] hover:bg-[color:var(--color-status-unpaid)]/10',
    badgeActive: 'bg-[color:var(--color-status-unpaid)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-unpaid)]/15 text-[color:var(--color-status-unpaid)]',
  },
  due_soon: {
    dot: 'bg-[color:var(--color-status-due-soon)]',
    active:
      'bg-[color:var(--color-status-due-soon)]/15 border-[color:var(--color-status-due-soon)] text-[color:var(--color-status-due-soon)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-due-soon)]/30 text-[color:var(--color-status-due-soon)] hover:bg-[color:var(--color-status-due-soon)]/10',
    badgeActive: 'bg-[color:var(--color-status-due-soon)] text-white',
    badgeInactive:
      'bg-[color:var(--color-status-due-soon)]/15 text-[color:var(--color-status-due-soon)]',
  },
  expired: {
    dot: 'bg-[color:var(--color-status-expired)]',
    active:
      'bg-[color:var(--color-status-expired)]/15 border-[color:var(--color-status-expired)] text-[color:var(--color-status-expired)]',
    inactive:
      'bg-app-raised border-[color:var(--color-status-expired)]/30 text-[color:var(--color-status-expired)] hover:bg-[color:var(--color-status-expired)]/10',
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
