/**
 * Light 3-step progress for enroll (and future longer forms).
 * Equal-width columns keep labels readable; visited steps stay clickable.
 */
import { useTranslation } from 'react-i18next';

export default function EnrollStepProgress({ steps, current, maxReached = current, onSelect, label }) {
  const { t } = useTranslation();
  const furthest = Math.max(current, maxReached);

  return (
    <nav aria-label={label || t('modals.member.enrollProgress')} className="mb-1">
      <ol className="flex w-full items-start">
        {steps.map((step, index) => {
          const n = index + 1;
          const active = n === current;
          const unlocked = n <= furthest;
          const completed = n < current;
          const clickable = unlocked && !active && typeof onSelect === 'function';
          const locked = !unlocked;
          const lineFilled = n < furthest;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center">
              {!isLast ? (
                <div
                  className="pointer-events-none absolute left-[calc(50%+1.35rem)] right-[calc(-50%+1.35rem)] top-5 z-0 h-0.5 overflow-hidden rounded-full bg-app-border-subtle"
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

              <button
                type="button"
                disabled={!clickable}
                onClick={(e) => {
                  if (!clickable) return;
                  onSelect(n);
                  // Pointer clicks: drop focus so Firefox doesn’t keep a sticky highlight.
                  if (e.detail > 0) e.currentTarget.blur();
                }}
                title={clickable ? t('modals.member.stepGoTo', { label: step.label }) : undefined}
                className={[
                  'group relative z-10 flex w-full min-w-0 flex-col items-center gap-1.5 px-1 py-1 outline-none',
                  clickable ? 'cursor-pointer' : locked ? 'cursor-not-allowed' : 'cursor-default',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
                aria-label={
                  clickable
                    ? t('modals.member.stepGoTo', { label: step.label })
                    : locked
                      ? t('modals.member.stepLocked', { label: step.label })
                      : step.label
                }
              >
                <span
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all',
                    active
                      ? 'bg-teal-700 text-white ring-2 ring-teal-600/40 ring-offset-2 ring-offset-app-raised dark:bg-teal-600 dark:ring-teal-400/35'
                      : clickable
                        ? 'bg-teal-700/85 text-white shadow-sm ring-1 ring-teal-600/25 group-hover:bg-teal-700 group-hover:ring-2 group-hover:ring-teal-600/35 group-focus-visible:ring-2 group-focus-visible:ring-teal-600/40 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-app-raised dark:bg-teal-600/90 dark:ring-teal-400/20 dark:group-hover:bg-teal-600'
                        : unlocked
                          ? 'bg-teal-700/85 text-white dark:bg-teal-600/90'
                          : 'bg-app-surface text-app-muted ring-1 ring-app-border-subtle opacity-70',
                  ].join(' ')}
                >
                  {completed ? (
                    <span className="text-base leading-none" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    n
                  )}
                </span>
                <span
                  className={[
                    'w-full text-center text-[11px] font-semibold leading-snug sm:text-xs',
                    active
                      ? 'text-app-text-strong'
                      : clickable
                        ? 'text-app-text-strong group-hover:underline group-hover:decoration-teal-600/60 group-hover:decoration-from-font group-hover:underline-offset-2'
                        : unlocked
                          ? 'text-app-text-strong'
                          : 'text-app-muted',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
