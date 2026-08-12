import { useEffect, useRef, useState } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { iconActionIdle, menuSurface } from '../utils/surfaceClasses';

const MENU_WIDTH = 200;

/**
 * Overflow ⋯ menu for secondary row actions (edit / delete / etc.).
 * Pass `selected` on an item to show a checkmark slot (picker-style).
 * @param {{ key: string, label: string, icon?: React.ReactNode, danger?: boolean, selected?: boolean, onClick: () => void }[]} items
 */
export default function RowMoreMenu({ items }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const showCheckSlot = items?.some((item) => item.selected != null);

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
      const left = Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8);
      const openUp = rect.bottom + 160 > window.innerHeight;
      setMenuPos({
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        left: Math.max(8, left),
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
  }, [open]);

  if (!items?.length) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={`${iconActionIdle} row-icon-action`}
        aria-label={t('common.moreActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && menuPos ? (
        <div
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            bottom: menuPos.bottom,
            left: menuPos.left,
            width: MENU_WIDTH,
          }}
          className={`z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 ${menuSurface}`}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              aria-checked={item.selected != null ? Boolean(item.selected) : undefined}
              className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-app-surface ${
                item.danger
                  ? 'text-[color:var(--color-status-expired)]'
                  : item.selected
                    ? 'text-app-text-strong'
                    : 'text-app-text'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {showCheckSlot ? (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                  {item.selected ? <Check className="h-4 w-4 text-brand" /> : null}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
