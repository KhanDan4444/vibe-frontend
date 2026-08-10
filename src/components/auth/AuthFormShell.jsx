import LanguageSwitcher from '../LanguageSwitcher';

/**
 * Shared card shell for forgot / register / reset — branded glass + language.
 */
export default function AuthFormShell({ children }) {
  return (
    <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-sm sm:p-8">
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
        <LanguageSwitcher tone="auth" />
      </div>
      <div className="mb-5 flex justify-center pt-1">
        <img
          src="/brand-lockup-mark.png?v=restore"
          alt="ንቁ"
          className="h-11 w-auto max-w-[11rem] object-contain object-center sm:h-12 sm:max-w-[12rem]"
        />
      </div>
      <div className="space-y-5">{children}</div>
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
