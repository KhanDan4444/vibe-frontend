import { useTranslation } from 'react-i18next';

/** Phone: compact header above the card. Desktop: full left brand panel. */
export default function LoginBrandPanel({ variant = 'compact' }) {
  const { t } = useTranslation();
  const isPanel = variant === 'panel';

  return (
    <div
      className={
        isPanel
          ? 'flex flex-1 flex-col justify-center pr-0 lg:max-w-[360px] lg:pr-4'
          : 'mb-5 flex flex-col items-center text-center'
      }
    >
      <img
        src="/app-icon.png"
        alt=""
        className={
          isPanel
            ? 'mb-5 h-[72px] w-[72px] rounded-[18px]'
            : 'mb-3 h-14 w-14 rounded-2xl'
        }
      />
      <p
        className={
          isPanel
            ? 'text-left text-[32px] font-extrabold tracking-tight text-brand-text dark:text-brand'
            : 'text-[26px] font-extrabold tracking-tight text-brand-text dark:text-brand'
        }
      >
        {t('app.name')}
      </p>
      <p
        className={
          isPanel
            ? 'mt-1.5 max-w-[320px] text-left text-base leading-6 text-slate-600 dark:text-app-muted'
            : 'mt-1.5 max-w-[280px] text-sm leading-[21px] text-slate-600 dark:text-app-muted'
        }
      >
        {t('auth.tagline')}
      </p>
      {isPanel ? (
        <p className="mt-3 text-left text-[13px] font-semibold text-slate-500 dark:text-app-muted/80">
          {t('auth.signInSubtitle')}
        </p>
      ) : null}
    </div>
  );
}
