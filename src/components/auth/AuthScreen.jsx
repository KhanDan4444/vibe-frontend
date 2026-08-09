import AuthHeroBackground from './AuthHeroBackground';

/**
 * Auth routes always render in dark mode — matches the in-app default and avoids
 * a light login → dark dashboard mismatch. Does not change the user's saved theme.
 */
export default function AuthScreen({ children, hero = false }) {
  if (hero) {
    return (
      <div className="dark">
        <AuthHeroBackground>{children}</AuthHeroBackground>
      </div>
    );
  }

  return (
    <div className="dark safe-top safe-bottom flex min-h-[100dvh] items-center justify-center bg-app-bg px-4 py-8">
      {children}
    </div>
  );
}
