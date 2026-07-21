import React from 'react';

/**
 * Designed empty list state — warm accent icon, title, one sentence, optional CTA.
 */
export default function EmptyState({
  icon: Icon,
  title,
  body,
  action = null,
  compact = false,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center animate-in fade-in duration-300 ${
        compact ? 'py-10 px-4' : 'py-16 px-6'
      } ${className}`}
      role="status"
    >
      {Icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-warm-soft text-accent-warm-text dark:text-accent-warm">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-slate-900 dark:text-app-text-strong">{title}</h3>
      {body ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-app-muted">{body}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
