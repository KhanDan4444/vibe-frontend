/** Quiet toolbar chip for short discrete filters (actor / status / type). */
export function ToolbarChip({ label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`toolbar-chip ${active ? 'toolbar-chip--active' : ''}`}
    >
      {label}
    </button>
  );
}

/** Horizontal scroll row matching FilterChipBar. */
export function ToolbarChipBar({ children, className = '' }) {
  return (
    <div className={`filter-chip-bar ${className}`}>
      <div className="filter-chip-row">{children}</div>
    </div>
  );
}
