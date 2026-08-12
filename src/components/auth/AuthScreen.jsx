import AuthHeroBackground from './AuthHeroBackground';

/**
 * Auth routes always render in dark mode — matches the in-app default and avoids
 * a light login → dark dashboard mismatch. Does not change the user's saved theme.
 */
export default function AuthScreen({ children }) {
  return (
    <div className="dark">
      <AuthHeroBackground>{children}</AuthHeroBackground>
    </div>
  );
}
