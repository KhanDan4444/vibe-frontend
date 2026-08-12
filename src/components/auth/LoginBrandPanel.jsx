import { useTranslation } from 'react-i18next';

/**
 * Login brand — mark + slogan + teal rule (hero-level lockup).
 */
export default function LoginBrandPanel() {
  const { t } = useTranslation();

  return (
    <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
      <img
        src="/brand-lockup-mark.png?v=restore"
        alt="ንቁ"
        className="mb-4 h-16 w-auto max-w-[15rem] object-contain object-center sm:mb-5 sm:h-[4.75rem] sm:max-w-[17rem]"
      />
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#2dd4bf] sm:text-sm sm:tracking-[0.14em]">
        {t('auth.brandSlogan')}
      </p>
      <div
        aria-hidden
        className="mt-5 h-px w-9 rounded-full bg-teal-300/70 sm:mt-6 sm:w-10"
      />
    </div>
  );
}
