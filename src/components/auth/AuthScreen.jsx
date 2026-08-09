import AuthHeroBackground from './AuthHeroBackground';

/**
 * Auth UI uses a nested `.dark` shell (yesterday's glass login).
 * Document theme is forced light on auth routes elsewhere so the hero wash
 * composites like before — without changing the saved/app default (dark).
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
