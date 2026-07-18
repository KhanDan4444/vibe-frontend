/** Color palettes aligned with vibe-mobile member filter chips. */
export const FILTER_CHIP_THEMES = {
  all: {
    dot: 'bg-slate-400',
    active: 'bg-slate-400/15 border-slate-400 text-slate-700 dark:text-slate-200',
    inactive:
      'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-app-raised dark:border-app-border-subtle dark:text-app-text dark:hover:bg-app-surface/60',
    badgeActive: 'bg-slate-400 text-white',
    badgeInactive: 'bg-slate-100 text-slate-500 dark:bg-app-surface dark:text-app-muted',
  },
  active: {
    dot: 'bg-emerald-400',
    active: 'bg-emerald-400/15 border-emerald-400 text-emerald-700 dark:text-emerald-300',
    inactive:
      'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:bg-app-raised dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10',
    badgeActive: 'bg-emerald-400 text-white',
    badgeInactive: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  unpaid: {
    dot: 'bg-orange-400',
    active: 'bg-orange-400/15 border-orange-400 text-orange-700 dark:text-orange-300',
    inactive:
      'bg-white border-orange-200 text-orange-700 hover:bg-orange-50 dark:bg-app-raised dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/10',
    badgeActive: 'bg-orange-400 text-white',
    badgeInactive: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  },
  due_soon: {
    dot: 'bg-sky-500',
    active: 'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300',
    inactive:
      'bg-white border-sky-200 text-sky-700 hover:bg-sky-50 dark:bg-app-raised dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10',
    badgeActive: 'bg-sky-500 text-white',
    badgeInactive: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  },
  expired: {
    dot: 'bg-red-400',
    active: 'bg-red-400/15 border-red-400 text-red-700 dark:text-red-300',
    inactive:
      'bg-white border-red-200 text-red-700 hover:bg-red-50 dark:bg-app-raised dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10',
    badgeActive: 'bg-red-400 text-white',
    badgeInactive: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  },
};

/** Hex colors matching FILTER_CHIP_THEMES dots (for charts / Recharts). */
export const MEMBER_FILTER_CHART_COLORS = {
  Active: '#34d399', // emerald-400
  Unpaid: '#fb923c', // orange-400
  'Due Soon': '#0ea5e9', // sky-500
  Expired: '#f87171', // red-400
};
