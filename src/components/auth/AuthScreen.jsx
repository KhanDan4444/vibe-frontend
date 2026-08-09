import AuthHeroBackground from './AuthHeroBackground';

/**
 * Auth routes always render in light mode visually.
 * App default / saved preference stays dark after login — this does not persist light.
 */
export default function AuthScreen({ children, hero = false }) {
  if (hero) {
    return <AuthHeroBackground>{children}</AuthHeroBackground>;
  }

  return (
    <div className="safe-top safe-bottom flex min-h-[100dvh] items-center justify-center bg-app-bg px-4 py-8">
      {children}
    </div>
  );
}
