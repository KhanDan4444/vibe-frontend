/**
 * Login hero: gym atmosphere as a brand backdrop.
 * Uses scrubbed asset (no baked-in logo/slogan) so UI copy stays clean.
 */
export default function AuthHeroBackground({ children }) {
  return (
    <div className="auth-hero-bg safe-top safe-bottom relative flex min-h-[100dvh] flex-col overflow-hidden">
      <img
        src="/login-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#020617]/[28%]" />
      <div className="pointer-events-none absolute inset-0 bg-teal-700/[0.08]" />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
