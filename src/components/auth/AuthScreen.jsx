import AuthHeroBackground from './AuthHeroBackground';

/**
 * Auth routes render in a nested dark shell (glass login).
 * Document theme follows the app default / saved preference (dark by default).
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
