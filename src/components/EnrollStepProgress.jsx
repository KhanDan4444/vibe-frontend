/**
 * Light 3-step progress for enroll (and future longer forms).
 * Completed steps are clickable to jump back; a line fills between steps as you advance.
 */
export default function EnrollStepProgress({ steps, current, onSelect }) {
  return (
    <nav aria-label="Enroll progress" className="mb-1">
      <ol className="flex w-full items-center">
        {steps.map((step, index) => {
          const n = index + 1;
          const active = n === current;
          const done = n < current;
          const clickable = done && typeof onSelect === 'function';
          const lineFilled = n < current;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className={`flex items-center ${isLast ? 'shrink-0' : 'min-w-0 flex-1'}`}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSelect(n)}
                className={[
                  'flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-1 py-1 transition-colors sm:px-1.5',
                  active ? 'bg-teal-700/10' : '',
                  clickable ? 'cursor-pointer hover:bg-app-surface' : 'cursor-default',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    active
                      ? 'bg-teal-700 text-white dark:bg-teal-600'
                      : done
                        ? 'bg-teal-700 text-white dark:bg-teal-600'
                        : 'bg-app-surface text-app-muted ring-1 ring-app-border-subtle',
                  ].join(' ')}
                >
                  {n}
                </span>
                <span
                  className={[
                    'max-w-[4.5rem] truncate text-center text-[11px] font-semibold sm:max-w-none sm:text-xs',
                    active || done ? 'text-app-text-strong' : 'text-app-muted',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </button>

              {!isLast ? (
                <div
                  className="mx-2 h-0.5 min-w-[1.25rem] flex-1 overflow-hidden rounded-full bg-app-border-subtle sm:mx-3"
                  aria-hidden
                >
                  <div
                    className={[
                      'h-full rounded-full bg-teal-600 transition-all duration-300 ease-out dark:bg-teal-500',
                      lineFilled ? 'w-full' : 'w-0',
                    ].join(' ')}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
