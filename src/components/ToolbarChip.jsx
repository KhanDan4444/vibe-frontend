/** Quiet toolbar chip for short discrete filters (actor / status / type). */
export function ToolbarChip({ label, count, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`toolbar-chip ${active ? 'toolbar-chip--active' : ''}`}
    >
      <span>{label}</span>
      {count != null ? <span className="toolbar-chip-count">{count}</span> : null}
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

/** Joined Staff | Trainers control — one selected pill, teal fill. */
export function TeamSegment({ children }) {
  return <div className="team-segment" role="tablist">{children}</div>;
}
