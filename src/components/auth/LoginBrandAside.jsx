import { useTranslation } from 'react-i18next';

/**
 * Desktop login left — quiet brand atmosphere + one short line.
 * Logo stays above the form on the right (no second lockup here).
 */
export default function LoginBrandAside() {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#0b1220] lg:flex lg:w-[46%] lg:flex-col">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(15,118,110,0.45),transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0b1220] to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-end p-10 xl:p-14">
        <p className="max-w-xs text-[15px] leading-relaxed text-white/60">
          {t('auth.brandDescription')}
        </p>
      </div>
    </aside>
  );
}
