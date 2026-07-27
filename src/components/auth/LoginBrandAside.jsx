import { useTranslation } from 'react-i18next';

/**
 * Desktop login left panel — gym photo graded into the dark teal login palette.
 */
export default function LoginBrandAside() {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#0b1220] lg:flex lg:w-[50%] lg:flex-col">
      <img
        src="/login-gym.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.72] contrast-[1.05] saturate-[0.55] hue-rotate-[-8deg]"
        decoding="async"
      />
      {/* Brand teal wash — pulls the photo into the same palette as the form */}
      <div
        className="absolute inset-0 bg-teal-950/55 mix-blend-multiply"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-teal-900/40 via-transparent to-[#0b1220]/90"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/50 to-transparent"
        aria-hidden
      />
      {/* Soft join into the form column */}
      <div
        className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0b1220] to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-end p-10 xl:p-14">
        <p className="max-w-md text-base leading-relaxed text-white/85 xl:text-lg">
          {t('auth.brandDescription')}
        </p>
      </div>
    </aside>
  );
}
