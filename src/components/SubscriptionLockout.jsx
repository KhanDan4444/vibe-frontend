import React from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

/**
 * Full lockout screen when the gym SaaS license is expired.
 */
export default function SubscriptionLockout({ gymName }) {
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg p-6">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 shadow-sm text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <AlertCircle className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold text-app-text-strong">{t('lockout.title')}</h1>
        {gymName && (
          <p className="mt-2 text-sm font-semibold text-app-text-strong">{gymName}</p>
        )}
        <p className="mt-2 text-sm text-app-text">{t('lockout.body')}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          {t('lockout.signOut')}
        </button>
      </div>
    </div>
  );
}
