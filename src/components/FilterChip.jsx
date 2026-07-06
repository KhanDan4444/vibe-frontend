import { FILTER_CHIP_THEMES } from '../utils/filterChipThemes';

/**
 * Mobile-style status filter chip: colored dot, label, and count badge.
 * @param {'all'|'active'|'unpaid'|'due_soon'|'expired'} variant
 */
export function FilterChip({ variant = 'all', label, count, active = false, onClick }) {
  const theme = FILTER_CHIP_THEMES[variant] || FILTER_CHIP_THEMES.all;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-chip border ${active ? theme.active : theme.inactive}`}
    >
      <span className={`filter-chip-dot ${theme.dot}`} aria-hidden />
      <span className="filter-chip-label">{label}</span>
      <span className={`filter-chip-count ${active ? theme.badgeActive : theme.badgeInactive}`}>
        {count}
      </span>
    </button>
  );
}

/** Horizontal scroll row for filter chips (matches mobile toolbar). */
export function FilterChipBar({ children, className = '' }) {
  return (
    <div className={`filter-chip-bar mb-4 ${className}`}>
      <div className="filter-chip-row">{children}</div>
    </div>
  );
}
