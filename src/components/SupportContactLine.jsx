import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSupportContact } from '../hooks/useSupportContact';

/**
 * Compact platform support phone / Telegram line. Renders nothing if not configured.
 * @param {{ className?: string, variant?: 'default' | 'auth' | 'banner', withSection?: boolean }} props
 */
export default function SupportContactLine({ className = '', variant = 'default', withSection = false }) {
  const { t } = useTranslation();
  const { phone, phoneDisplay, telegram, telegramUrl, configured } = useSupportContact();

  if (!configured) return null;

  const linkClass =
    variant === 'auth'
      ? 'auth-link font-semibold'
      : variant === 'banner'
        ? 'font-semibold text-amber-800 underline decoration-amber-700/40 underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50'
        : 'font-semibold text-teal-700 underline decoration-teal-600/30 underline-offset-2 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200';

  const mutedClass =
    variant === 'auth'
      ? 'text-white/55'
      : variant === 'banner'
        ? 'text-amber-900/80 dark:text-amber-100/80'
        : 'text-app-muted';

  const line = (
    <p className={`text-sm leading-relaxed ${mutedClass} ${className}`.trim()}>
      <span className="mr-1">{t('support.needHelp')}</span>
      {phone ? (
        <a href={`tel:${phone}`} className={linkClass}>
          {t('support.callPhone', { phone: phoneDisplay || phone })}
        </a>
      ) : null}
      {phone && telegramUrl ? <span className="mx-1.5 opacity-60">·</span> : null}
      {telegramUrl ? (
        <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {t('support.telegram', { handle: telegram })}
        </a>
      ) : null}
    </p>
  );

  if (!withSection) return line;

  return (
    <section className="space-y-2 border-t border-app-border-subtle pt-5">
      <h3 className="text-sm font-semibold text-app-text-strong">{t('support.sectionTitle')}</h3>
      {line}
    </section>
  );
}
