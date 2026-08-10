import React from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

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
          className="mx-auto mb-4 h-11 w-auto max-w-[11rem] object-contain object-center sm:h-12 sm:max-w-[12rem]"
        />
        <p className="mb-6 text-sm font-semibold tracking-wide text-[#5eead4]/90">
          {t('auth.brandSlogan')}
        </p>

        <h1 className="text-2xl font-bold text-amber-200/70">{t('lockout.title')}</h1>

        {gymName ? (
          <p className="mt-3 text-sm font-medium text-white/70">{gymName}</p>
        ) : null}

        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/60">
          {t('lockout.body')}
        </p>

        <details className="mx-auto mt-4 max-w-sm group">
          <summary className="auth-link cursor-pointer list-none text-center text-sm [&::-webkit-details-marker]:hidden">
            {t('lockout.helpLink')}
          </summary>
          <p className="mt-2 text-center text-xs leading-relaxed text-white/45">
            {t('lockout.hint')}
          </p>
        </details>

        <button
          type="button"
          onClick={logout}
          className="mt-8 inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#0d9488] focus:outline-none focus:ring-2 focus:ring-teal-700/40 sm:w-auto"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {t('lockout.signOut')}
        </button>
      </div>
    </div>
  );
}
