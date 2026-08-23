/**
 * Light 3-step progress for enroll (and future longer forms).
 * First/last steps sit on the form edges; connectors are straight bars between circles.
 */
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

function labelAlign(index, total) {
  if (index === 0) return 'text-left';
  if (index === total - 1) return 'text-right';
  return 'text-center';
}

export default function EnrollStepProgress({ steps, current, maxReached = current, onSelect, label }) {
  const { t } = useTranslation();
  const furthest = Math.max(current, maxReached);
  const total = steps.length;

  return (
    <nav aria-label={label || t('modals.member.enrollProgress')} className="mb-1 w-full">
      <div className="flex w-full items-center">
        {steps.map((step, index) => {
          const n = index + 1;
          const active = n === current;
          const unlocked = n <= furthest;
          const completed = n < current;
          const clickable = unlocked && !active && typeof onSelect === 'function';
          const locked = !unlocked;
          const connectorOn = furthest >= n;

          return (
            <Fragment key={step.id}>
              {index > 0 ? (
                <div
                  className="mx-2 h-0.5 min-w-0 flex-1 rounded-full bg-app-border-subtle sm:mx-3"
                  aria-hidden
                >
                  <div
                    className={[
                      'h-full rounded-full bg-teal-600 transition-all duration-300 ease-out dark:bg-teal-500',
                      connectorOn ? 'w-full' : 'w-0',
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
                  if (e.detail > 0) e.currentTarget.blur();
                }}
                title={clickable ? t('modals.member.stepGoTo', { label: step.label }) : undefined}
                className={[
                  'group relative z-10 flex shrink-0 flex-col items-center outline-none',
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
                {/* ~36–40px circle — under field height; progress chrome, not a control row */}
                <span
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all sm:h-10 sm:w-10',
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
              </button>
            </Fragment>
          );
        })}
      </div>

      <div className="mt-2 flex w-full">
        {steps.map((step, index) => {
          const n = index + 1;
          const active = n === current;
          const unlocked = n <= furthest;

          return (
            <div key={`${step.id}-label`} className="min-w-0 flex-1">
              <p
                className={[
                  'text-[11px] font-semibold leading-snug sm:text-xs',
                  labelAlign(index, total),
                  active || unlocked ? 'text-app-text-strong' : 'text-app-muted',
                ].join(' ')}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
