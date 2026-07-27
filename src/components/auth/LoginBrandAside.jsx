import { useTranslation } from 'react-i18next';

/**
 * Desktop login left panel — gym photo + brand (logo + ንቁ).
 * Hidden on small screens; mobile keeps LoginBrandPanel above the form.
 */
export default function LoginBrandAside() {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden lg:flex lg:w-[48%] lg:flex-col xl:w-1/2">
      <img
        src="/login-bg.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        decoding="async"
      />
      {/* Light bottom shade so text stays readable — keep the gym photo visible */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-end p-10 xl:p-14">
        <div className="max-w-md pb-2">
          <img
            src="/brand-lockup-mark.png"
            alt={t('app.name')}
            className="h-16 w-auto max-w-[16rem] object-contain object-left xl:h-[4.5rem] xl:max-w-[18rem]"
          />
          <p className="mt-4 text-base font-medium text-teal-200/90">
            {t('auth.brandSlogan')}
          </p>
          <p className="mt-2 text-[15px] leading-snug text-white/80">
            {t('auth.brandDescription')}
          </p>
        </div>
      </div>
    </aside>
  );
}
