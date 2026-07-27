import { useTranslation } from 'react-i18next';

/**
 * Desktop login left panel — gym atmosphere only.
 * Brand mark stays above the form on the right (avoids double logos).
 */
export default function LoginBrandAside() {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#07131a] lg:flex lg:w-[46%] lg:flex-col xl:w-[48%]">
      {/* Soft gym plate — opacity blend, not a muddy black wash over a logo splash */}
      <img
        src="/login-bg.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.55]"
        decoding="async"
      />
      {/* Cool teal depth, lighter toward the form edge so the split feels open */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-teal-950/50 via-transparent to-slate-950/70"
        aria-hidden
      />
      <div
        className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-950/80 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-end p-10 xl:p-12">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-black/35 px-5 py-4 backdrop-blur-sm">
          <p className="text-[15px] leading-relaxed text-white/90">
            {t('auth.brandDescription')}
          </p>
        </div>
      </div>
    </aside>
  );
}
