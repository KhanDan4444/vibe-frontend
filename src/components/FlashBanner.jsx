import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, X } from 'lucide-react';

export default function FlashBanner({ message, onDismiss }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="safe-bottom fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-200 sm:bottom-6">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg">
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="flex-1 text-sm font-medium text-emerald-900">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-2 text-emerald-600 active:text-emerald-800 sm:hover:text-emerald-800"
          aria-label={t('aria.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
