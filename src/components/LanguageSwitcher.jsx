import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Languages, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../context/PreferencesContext';
import { menuItem, menuSurface } from '../utils/surfaceClasses';

const OPTIONS = [
  { code: 'en', labelKey: 'profile.english' },
  { code: 'am', labelKey: 'profile.amharic' },
];

/**
 * Header language picker — icon button with dropdown.
 * @param {{ compact?: boolean }} props
 */
export default function LanguageSwitcher({ compact = false }) {
  const { t } = useTranslation();
  const { language, setLanguage } = usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  const btnClass = compact
    ? 'rounded-lg p-2.5 text-slate-400 active:bg-slate-100 active:text-slate-600 dark:active:bg-app-raised'
    : 'rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-app-raised dark:hover:text-slate-200';

  const iconClass = compact ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={btnClass}
        aria-label={t('profile.language')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Languages className={iconClass} aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('profile.language')}
          className={`absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100 ${menuSurface}`}
        >
          {OPTIONS.map((opt) => {
            const selected = language === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setLanguage(opt.code);
                  close();
                }}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm ${menuItem}`}
              >
                <span>{t(opt.labelKey)}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
