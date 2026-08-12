import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { menuSurface } from '../utils/surfaceClasses';

const COMPACT_WIDTH = 220;
const FIELD_MIN_WIDTH = 260;

/**
 * Compact toolbar picker — desktop stand-in for mobile PickerTrigger + SheetOption.
 * @param {{ id: string, label?: string, labelKey?: string, group?: string | null }[]} options
 * @param {{ id: string, labelKey: string }[]} [groups]
 */
export default function ToolbarPicker({
  value,
  onChange,
  options = [],
  groups = [],
  label,
  size = 'compact',
  className = '',
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  const resolve = (opt) => {
    if (!opt) return label || '';
    if (opt.labelKey) return t(opt.labelKey);
    return opt.label ?? String(opt.id);
  };

  const current = useMemo(
    () => options.find((opt) => String(opt.id) === String(value)),
    [options, value],
  );
  const currentLabel = resolve(current) || label || '';

  const ungrouped = useMemo(
    () => options.filter((opt) => !opt.group),
    [options],
  );
  const grouped = useMemo(
    () => groups
      .map((group) => ({
        ...group,
        options: options.filter((opt) => opt.group === group.id),
      }))
      .filter((group) => group.options.length > 0),
    [groups, options],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = size === 'field'
        ? Math.max(FIELD_MIN_WIDTH, Math.min(rect.width, 320))
        : Math.max(COMPACT_WIDTH, Math.min(rect.width, 280));
      const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
      const openUp = rect.bottom + 220 > window.innerHeight;
      setMenuPos({
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        left: Math.max(8, left),
        width: menuWidth,
      });
    };
    place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, size]);

  const renderItem = (opt) => {
    const selected = String(opt.id) === String(value);
    return (
      <button
        key={opt.id}
        type="button"
        role="menuitemradio"
        aria-checked={selected}
        className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-app-surface ${
          selected ? 'text-app-text-strong' : 'text-app-text'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
          if (!selected) onChange?.(opt.id);
        }}
      >
        <span className="min-w-0 flex-1 truncate">{resolve(opt)}</span>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
          {selected ? <Check className="h-4 w-4 text-brand" /> : null}
        </span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`toolbar-picker ${size === 'field' ? 'toolbar-picker--field' : ''} ${open ? 'toolbar-picker--open' : ''}`}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="min-w-0 truncate font-semibold text-brand-text dark:text-teal-300">
          {currentLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-app-muted transition-transform ${open ? 'rotate-180 text-brand' : ''}`}
          aria-hidden
        />
      </button>
      {open && menuPos ? (
        <div
          role="listbox"
          style={{
            position: 'fixed',
            top: menuPos.top,
            bottom: menuPos.bottom,
            left: menuPos.left,
            width: menuPos.width,
          }}
          className={`z-50 max-h-72 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100 ${menuSurface}`}
        >
          {ungrouped.map(renderItem)}
          {grouped.map((group) => (
            <div key={group.id}>
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-app-muted">
                {t(group.labelKey)}
              </p>
              {group.options.map(renderItem)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
