import { useTranslation } from 'react-i18next';

/**
 * Login brand — transparent mark + slogan.
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
      <p className="text-sm font-semibold tracking-wide text-[#5eead4]/90 sm:text-base">
        {t('auth.brandSlogan')}
      </p>
    </div>
  );
}
