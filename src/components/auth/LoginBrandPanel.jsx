import { useTranslation } from 'react-i18next';

export default function LoginBrandPanel() {
  const { t } = useTranslation();

  return (
    <div className="mb-5 flex flex-col items-center text-center animate-in fade-in duration-500">
      <img src="/app-icon.png" alt="" className="mb-3 h-14 w-14 rounded-2xl ring-2 ring-teal-600/40" />
      <p className="text-[26px] font-extrabold tracking-tight text-brand">{t('app.name')}</p>
      <p className="mt-1.5 max-w-[280px] text-sm leading-[21px] text-app-muted">{t('auth.tagline')}</p>
    </div>
  );
}
