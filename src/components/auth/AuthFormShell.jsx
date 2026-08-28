import LanguageSwitcher from '../LanguageSwitcher';

/**
 * Shared shell for forgot / register / reset — soft glass, matches login hierarchy.
 */
export default function AuthFormShell({ children }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="auth-form-enter relative w-full max-w-md">
        <div className="absolute right-0 top-0 z-20">
          <LanguageSwitcher tone="auth" />
        </div>
        <div className="mb-7 flex flex-col items-center pt-1 sm:mb-8">
          <img
            src="/brand-lockup-mark.png?v=restore"
            alt="ንቁ"
            className="h-14 w-auto max-w-[13rem] object-contain object-center sm:h-16 sm:max-w-[14rem]"
          />
          <div
            aria-hidden
            className="mt-5 h-px w-9 rounded-full bg-teal-300/70 sm:mt-6 sm:w-10"
          />
        </div>
        <div className="auth-form-enter-delay space-y-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Step progress for multi-step auth flows (0-based active index).
 * @param {number} activeIndex
 * @param {number} steps
 * @param {string[]} [stepLabels] Screen-reader labels per step
 * @param {string} [progressLabel] Announced label for the step group
 */
export function AuthStepDots({ activeIndex = 0, steps = 2, stepLabels = [], progressLabel }) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(steps - 1, 0));

  return (
    <nav className="auth-step-dots" aria-label={progressLabel || undefined}>
      <ol className="auth-step-dots-list">
        {Array.from({ length: steps }, (_, i) => {
          const state = i < safeIndex ? 'complete' : i === safeIndex ? 'current' : 'upcoming';
          const label = stepLabels[i] || `Step ${i + 1} of ${steps}`;

          return (
            <li
              key={i}
              className="auth-step-dot-item"
              aria-current={state === 'current' ? 'step' : undefined}
              aria-label={label}
            >
              <span
                className={[
                  'auth-step-dot-pill',
                  state === 'current'
                    ? 'auth-step-dot-pill-active'
                    : state === 'complete'
                      ? 'auth-step-dot-pill-complete'
                      : 'auth-step-dot-pill-idle',
                ].join(' ')}
                aria-hidden
              />
              <span className="sr-only">
                {label}
                {state === 'current' ? ' (current step)' : state === 'complete' ? ' (completed)' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
