/** Auth hero: teal → slate gradient + soft top glow. */
export default function AuthHeroBackground({ children }) {
  return (
    <div className="auth-hero-bg safe-top safe-bottom relative flex min-h-[100dvh] flex-col">
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
