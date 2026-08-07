/**
 * Light 3-step progress for enroll (and future longer forms).
 * Completed steps are clickable to jump back.
 */
export default function EnrollStepProgress({ steps, current, onSelect }) {
  return (
    <nav aria-label="Enroll progress" className="mb-1">
      <ol className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const n = index + 1;
          const active = n === current;
          const done = n < current;
          const clickable = done && typeof onSelect === 'function';
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSelect(n)}
                className={[
                  'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors sm:px-2.5',
                  active ? 'bg-teal-700/10' : '',
                  clickable ? 'cursor-pointer hover:bg-app-surface' : 'cursor-default',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    active
                      ? 'bg-teal-700 text-white dark:bg-teal-600'
                      : done
                        ? 'bg-teal-700/20 text-teal-900 dark:text-teal-200'
                        : 'bg-app-surface text-app-muted',
                  ].join(' ')}
                >
                  {n}
                </span>
                <span
                  className={[
                    'truncate text-xs font-semibold sm:text-sm',
                    active || done ? 'text-app-text-strong' : 'text-app-muted',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </button>
              {index < steps.length - 1 ? (
                <span
                  className={`hidden h-px w-3 shrink-0 sm:block sm:w-4 ${done ? 'bg-teal-600/40' : 'bg-app-border-subtle'}`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
