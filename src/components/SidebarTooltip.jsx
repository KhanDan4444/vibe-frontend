import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Fast right-side tooltip for the collapsed desktop sidebar rail.
 * Portaled to document.body so overflow / stacking never clips it.
 */
export default function SidebarTooltip({
  label,
  hint,
  enabled = true,
  children,
  className = '',
}) {
  const tipId = useId();
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (!enabled || !open) {
      setReady(false);
      return undefined;
    }
    const delay = reducedMotion ? 0 : 60;
    const id = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(id);
  }, [enabled, open, reducedMotion]);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !open || !ready) {
      setCoords(null);
      return undefined;
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [enabled, open, ready, updatePosition]);

  const show = enabled && open && ready && Boolean(label) && coords;

  return (
    <div
      ref={anchorRef}
      className={`relative ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      {children}
      {show
        ? createPortal(
            <div
              id={tipId}
              role="tooltip"
              className={`pointer-events-none fixed z-[300] -translate-y-1/2 ${
                reducedMotion ? '' : 'animate-in fade-in zoom-in-95 duration-100'
              }`}
              style={{ top: coords.top, left: coords.left }}
            >
              <div className="flex items-center gap-2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 dark:bg-zinc-900">
                <span className="whitespace-nowrap">{label}</span>
                {hint ? (
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-slate-300">
                    {hint}
                  </kbd>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
