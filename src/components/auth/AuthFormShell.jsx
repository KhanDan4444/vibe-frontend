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

/** Quiet step dots for multi-step auth flows (0-based active index). */
export function AuthStepDots({ activeIndex = 0, steps = 2 }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      {Array.from({ length: steps }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === activeIndex ? 'w-8 bg-[#0f766e]' : 'w-3 bg-white/20'
          }`}
        />
      ))}
    </div>
  );
}
