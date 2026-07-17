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
    dot: 'bg-amber-400',
    active: 'bg-amber-400/20 border-amber-400 text-amber-700 dark:text-amber-300',
    inactive:
      'bg-white border-amber-200 text-amber-700 hover:bg-amber-50 dark:bg-app-raised dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10',
    badgeActive: 'bg-amber-400 text-white',
    badgeInactive: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
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
