import LanguageSwitcher from '../LanguageSwitcher';

/**
 * Shared card shell for forgot / register / reset — dark glass card + language.
 */
export default function AuthFormShell({ children }) {
  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-x-0 -top-2 z-20 flex justify-end sm:-top-3">
        <div className="pointer-events-auto">
          <LanguageSwitcher tone="auth" />
        </div>
      </div>
      <div className="w-full space-y-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-sm sm:p-8">
        {children}
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
