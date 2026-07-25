import { useTranslation } from 'react-i18next';

/**
 * Login brand — same home-screen icon treatment as mobile.
 * Slogan is live text (EN / AM) so it localizes cleanly.
 */
export default function LoginBrandPanel() {
  const { t } = useTranslation();

  return (
    <div className="mb-8 flex flex-col items-center text-center animate-in fade-in duration-500 sm:mb-10">
      <img
        src="/app-icon.png"
        alt="ንቁ"
        className="mb-4 h-[6.5rem] w-[6.5rem] rounded-[1.35rem] object-contain shadow-lg shadow-black/30 sm:mb-5 sm:h-28 sm:w-28 sm:rounded-[1.5rem]"
      />
      <p className="text-sm font-bold tracking-wide text-teal-300 sm:text-base">
        {t('auth.brandSlogan')}
      </p>
    </div>
  );
}
