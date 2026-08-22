import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RequiredMark from './RequiredMark';

const MENU_MAX_HEIGHT = 240;
const MENU_CHROME = 44; // search row

/**
 * Filterable single-select for growing option lists (branch, plan, etc.).
 * Menu is portaled + positioned with useLayoutEffect so it never stretches
 * scrollable modal bodies or flashes at the wrong place.
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
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = rect.width;
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      if (left < 8) left = 8;

      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
      const spaceAbove = rect.top - gap - 8;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
      const maxHeight = Math.min(MENU_MAX_HEIGHT, available);

      // Prefer bottom-anchoring when opening up so short menus sit on the trigger
      // (using top - maxHeight leaves a large gap when content is shorter than maxHeight).
      if (openUp) {
        setPosition({
          left,
          width,
          maxHeight,
          openUp: true,
          bottom: window.innerHeight - rect.top + gap,
        });
      } else {
        setPosition({
          left,
          width,
          maxHeight,
          openUp: false,
          top: rect.bottom + gap,
        });
      }
    };

    updatePosition();
    // Re-measure after paint in case fonts/layout settle.
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const target = e.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
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

  const listMax = position ? Math.max(80, position.maxHeight - MENU_CHROME) : 160;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <label htmlFor={fieldId} className="form-label">
          {label}
          {required ? <RequiredMark /> : null}
        </label>
      ) : null}
      <button
        ref={buttonRef}
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
          'focus-visible:!border-teal-600 focus-visible:!shadow-[inset_0_1px_2px_rgb(15_23_42/0.04),0_0_0_2px_rgb(13_148_136/0.2)]',
          open && !error
            ? '!border-teal-600 !shadow-[inset_0_1px_2px_rgb(15_23_42/0.04),0_0_0_2px_rgb(13_148_136/0.2)]'
            : '',
          error ? '!border-rose-400 !shadow-[0_0_0_2px_rgb(244_63_94/0.2)]' : '',
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

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[200] overflow-hidden rounded-lg border border-app-border-subtle bg-app-raised shadow-lg"
              style={{
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
                ...(position.openUp
                  ? { bottom: position.bottom, top: 'auto' }
                  : { top: position.top, bottom: 'auto' }),
              }}
            >
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
              <ul role="listbox" className="overflow-y-auto py-1" style={{ maxHeight: listMax }}>
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
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
