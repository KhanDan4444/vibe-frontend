import React from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';

/**
 * Full lockout screen when the gym SaaS license is expired.
 */
export default function SubscriptionLockout({ gymName }) {
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <div className="auth-hero-bg safe-top safe-bottom flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-xl backdrop-blur-sm sm:p-8">
        <img
          src="/brand-lockup-mark.png?v=restore"
          alt="ንቁ"
          className="mx-auto mb-6 h-11 w-auto max-w-[11rem] object-contain object-center sm:h-12 sm:max-w-[12rem]"
        />

        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
          {t('lockout.eyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{t('lockout.title')}</h1>

        {gymName ? (
          <p className="mt-3 text-sm font-medium text-white/70">{gymName}</p>
        ) : null}

        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/60">
          {t('lockout.body')}
        </p>

        <details className="mx-auto mt-4 max-w-sm group">
          <summary className="cursor-pointer list-none text-center text-sm font-medium text-white/55 transition-colors hover:text-white/80 [&::-webkit-details-marker]:hidden">
            {t('lockout.helpLink')}
          </summary>
          <p className="mt-2 text-center text-xs leading-relaxed text-white/45">
            {t('lockout.hint')}
          </p>
        </details>

        <Button
          type="button"
          variant="secondary"
          onClick={logout}
          className="mt-8 w-full border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.12] sm:w-auto"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {t('lockout.signOut')}
        </Button>
      </div>
    </div>
  );
}
