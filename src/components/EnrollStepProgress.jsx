/**
 * Light 3-step progress for enroll (and future longer forms).
 * Circles and connector lines share one horizontal axis; labels sit below.
 */
export default function EnrollStepProgress({ steps, current, onSelect }) {
  return (
    <nav aria-label="Enroll progress" className="mb-1">
      <ol className="flex w-full items-start">
        {steps.map((step, index) => {
          const n = index + 1;
          const active = n === current;
          const done = n < current;
          const clickable = done && typeof onSelect === 'function';
          const lineFilled = n < current;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className={`flex items-start ${isLast ? 'shrink-0' : 'min-w-0 flex-1'}`}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSelect(n)}
                className={[
                  'flex w-14 shrink-0 flex-col items-center gap-1.5 rounded-lg py-0.5 transition-colors sm:w-16',
                  clickable ? 'cursor-pointer hover:bg-app-surface' : 'cursor-default',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    active || done
                      ? 'bg-teal-700 text-white dark:bg-teal-600'
                      : 'bg-app-surface text-app-muted ring-1 ring-app-border-subtle',
                  ].join(' ')}
                >
                  {n}
                </span>
                <span
                  className={[
                    'w-full truncate text-center text-[11px] font-semibold leading-tight sm:text-xs',
                    active || done ? 'text-app-text-strong' : 'text-app-muted',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </button>

              {!isLast ? (
                <div className="mx-1 flex h-10 min-w-[1rem] flex-1 items-center sm:mx-2" aria-hidden>
                  <div className="h-0.5 w-full overflow-hidden rounded-full bg-app-border-subtle">
                    <div
                      className={[
                        'h-full rounded-full bg-teal-600 transition-all duration-300 ease-out dark:bg-teal-500',
                        lineFilled ? 'w-full' : 'w-0',
                      ].join(' ')}
                    />
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
