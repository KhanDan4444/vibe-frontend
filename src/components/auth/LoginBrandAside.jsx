import { useTranslation } from 'react-i18next';

/**
 * Desktop login left panel — soft gym backdrop + short product line.
 * Logo stays above the form on the right (LoginBrandPanel).
 */
export default function LoginBrandAside() {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden lg:flex lg:w-[48%] lg:flex-col xl:w-1/2">
      <img
        src="/login-aside-bg.png"
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover object-[center_70%] blur-[2px]"
        decoding="async"
      />
      <div className="absolute inset-0 bg-black/45" aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-end p-10 xl:p-14">
        <div className="max-w-md pb-2">
          <p className="text-base font-medium text-teal-200/90">{t('auth.brandSlogan')}</p>
          <p className="mt-2 text-[15px] leading-snug text-white/80">{t('auth.brandDescription')}</p>
        </div>
      </div>
    </aside>
  );
}
