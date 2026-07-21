/** Login-only hero: brand gradient + subtle dot pattern. */
export default function AuthHeroBackground({ children }) {
  return (
    <div className="auth-hero-bg safe-top safe-bottom relative flex min-h-[100dvh] flex-col">
      <div className="auth-hero-pattern pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
