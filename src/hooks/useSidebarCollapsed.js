import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'niku.sidebar.collapsed';
const SHORTCUT_HINT_KEY = 'niku.sidebar.shortcutHintSeen';

/** Desktop sidebar widths — keep aside + main padding in sync. */
export const SIDEBAR_WIDTH_EXPANDED = 'w-64';
export const SIDEBAR_PAD_EXPANDED = 'lg:pl-64';
export const SIDEBAR_WIDTH_COLLAPSED = 'w-[4.75rem]';
export const SIDEBAR_PAD_COLLAPSED = 'lg:pl-[4.75rem]';

/** Width/padding motion — instant under prefers-reduced-motion. */
export const SIDEBAR_MOTION =
  'transition-[width,padding,box-shadow] duration-[180ms] ease-out motion-reduce:transition-none motion-reduce:duration-0';

export const SIDEBAR_LABEL_VISIBLE =
  'max-w-[11rem] opacity-100 transition-[opacity,max-width] duration-[180ms] ease-out motion-reduce:transition-none motion-reduce:duration-0';
export const SIDEBAR_LABEL_HIDDEN =
  'max-w-0 overflow-hidden opacity-0 transition-[opacity,max-width] duration-[120ms] ease-in motion-reduce:transition-none motion-reduce:duration-0';

function readStoredCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function readShortcutHintSeen() {
  try {
    return localStorage.getItem(SHORTCUT_HINT_KEY) === '1';
  } catch {
    return true;
  }
}

function writeShortcutHintSeen() {
  try {
    localStorage.setItem(SHORTCUT_HINT_KEY, '1');
  } catch {
    /* ignore */
  }
}

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

/** Platform-aware chord shown in tooltips / aria. */
export function getSidebarShortcutHint() {
  if (typeof navigator === 'undefined') return 'Ctrl+B';
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  if (/Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS/i.test(ua)) return '⌘B';
  return 'Ctrl+B';
}

/**
 * Desktop-only collapse preference (mobile drawer stays full-width).
 * Expands/collapses only via toggle click or ⌘/Ctrl+B — no hover peek overlay.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);
  const [shortcutCoachOpen, setShortcutCoachOpen] = useState(false);
  const collapseToggleRef = useRef(null);

  const dismissShortcutCoach = useCallback(() => {
    writeShortcutHintSeen();
    setShortcutCoachOpen(false);
  }, []);

  const maybeOfferShortcutCoach = useCallback(() => {
    if (readShortcutHintSeen()) return;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) return;
    setShortcutCoachOpen(true);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsed]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== 'b') return;
      if (isTypingTarget(e.target)) return;
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) return;
      e.preventDefault();
      dismissShortcutCoach();
      setCollapsed((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dismissShortcutCoach]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      if (next) {
        queueMicrotask(() => maybeOfferShortcutCoach());
      } else {
        setShortcutCoachOpen(false);
      }
      return next;
    });
  }, [maybeOfferShortcutCoach]);

  const showLabels = !collapsed;
  const compact = collapsed;

  const asideWidthClass = showLabels ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;
  const asidePadClass = showLabels ? 'p-6' : 'px-2 py-4';
  const contentPadClass = collapsed ? SIDEBAR_PAD_COLLAPSED : SIDEBAR_PAD_EXPANDED;

  const asideClassName = [
    'fixed inset-y-0 left-0 z-30 hidden flex-col lg:flex',
    SIDEBAR_MOTION,
    asideWidthClass,
    asidePadClass,
  ].join(' ');

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
    showLabels,
    compact,
    asideClassName,
    contentPadClass,
    shortcutHint: getSidebarShortcutHint(),
    shortcutCoachOpen,
    dismissShortcutCoach,
    collapseToggleRef,
  };
}
