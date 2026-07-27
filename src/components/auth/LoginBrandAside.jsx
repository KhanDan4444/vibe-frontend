import { useTranslation } from 'react-i18next';

/**
 * Desktop login left panel — sharp gym photo + brand.
 * Form stays on the right without a second logo.
 */
export default function LoginBrandAside() {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-slate-950 lg:flex lg:w-[50%] lg:flex-col">
      <img
        src="/login-gym.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        decoding="async"
      />
      {/* Keep photo readable: soft top fade + stronger bottom for type */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
        <img
          src="/brand-lockup-mark.png"
          alt={t('app.name')}
          className="h-12 w-auto max-w-[13rem] object-contain object-left drop-shadow-md xl:h-14 xl:max-w-[15rem]"
        />

        <div className="max-w-md">
          <p className="text-xl font-semibold tracking-wide text-teal-300 xl:text-2xl">
            {t('auth.brandSlogan')}
          </p>
          <p className="mt-3 text-base leading-relaxed text-white/90 xl:text-lg">
            {t('auth.brandDescription')}
          </p>
        </div>
      </div>
    </aside>
  );
}
