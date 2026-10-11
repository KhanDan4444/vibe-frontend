import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Auth hero: teal → slate gradient (matches prior auth look). */
export default function AuthHeroBackground({ children }) {
  const { t } = useTranslation();
  return (
    <div className="auth-hero-bg safe-top safe-bottom relative flex min-h-[100dvh] flex-col">
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      <p className="relative z-10 pb-4 text-center">
        <Link
          to="/privacy"
          className="text-xs font-normal text-white/40 no-underline hover:text-white/70 hover:underline"
        >
          {t('auth.privacyPolicy')}
        </Link>
      </p>
    </div>
  );
}
