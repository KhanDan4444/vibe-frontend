import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RequiredMark from './RequiredMark';

/**
 * Filterable single-select for growing option lists (branch, plan, etc.).
 */
export default function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error = false,
  required = false,
  className = '',
}) {
  const { t } = useTranslation();
  const autoId = useId();
  const fieldId = id || autoId;
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <label htmlFor={fieldId} className="form-label">
          {label}
          {required ? <RequiredMark /> : null}
        </label>
      ) : null}
      <button
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) setQuery('');
            return next;
          });
        }}
        className={[
          'admin-field mt-1 flex w-full cursor-pointer items-center justify-between gap-2 text-left',
          // Open state owns the teal ring — button :focus flickers when search input takes focus.
          'focus:!border-app-input-border focus:!ring-0 focus:outline-none',
          open && !error ? '!border-teal-600 ring-2 ring-teal-600/20' : '',
          error ? '!border-rose-400 ring-2 ring-rose-500/20' : '',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={selected ? 'text-app-text-strong' : 'text-app-muted'}>
          {selected?.label || placeholder || t('common.select')}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180 text-teal-600 dark:text-teal-400' : 'text-app-muted'}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-app-border-subtle bg-app-raised shadow-lg">
          <div className="flex items-center gap-2 border-b border-app-border-subtle px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-app-muted" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('common.search')}
              className="w-full bg-transparent text-sm text-app-text-strong outline-none placeholder:text-app-muted"
              aria-label={t('common.search')}
            />
          </div>
          <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-app-muted">{t('common.noResults')}</li>
            ) : (
              filtered.map((opt) => {
                const active = String(opt.value) === String(value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={[
                        'flex w-full px-3 py-2 text-left text-sm transition-colors',
                        active
                          ? 'bg-teal-700/10 font-medium text-teal-900 dark:text-teal-200'
                          : 'text-app-text-strong hover:bg-app-surface',
                      ].join(' ')}
                      onClick={() => {
                        onChange(String(opt.value));
                        setOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
