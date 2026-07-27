import { useTranslation } from 'react-i18next';

/**
 * Desktop login left panel — solid brand side (no stock photo).
 * Logo stays above the form on the right.
 */
export default function LoginBrandAside() {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#0b1220] lg:flex lg:w-[44%] lg:flex-col xl:w-[46%]">
      {/* Soft brand atmosphere — not a stock gym collage */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(15,118,110,0.35),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(45,212,191,0.08),transparent_45%)]"
        aria-hidden
      />
      <div
        className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-teal-600/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400/80">
            {t('app.name')}
          </p>
        </div>

        <div className="max-w-sm">
          <p className="text-3xl font-semibold leading-snug tracking-tight text-white xl:text-4xl">
            {t('auth.brandSlogan')}
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-white/65 xl:text-base">
            {t('auth.brandDescription')}
          </p>
        </div>

        <div className="h-px w-16 bg-teal-500/40" aria-hidden />
      </div>
    </aside>
  );
}
