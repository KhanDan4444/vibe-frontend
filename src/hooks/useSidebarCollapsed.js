import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'niku.sidebar.collapsed';
const SHORTCUT_HINT_KEY = 'niku.sidebar.shortcutHintSeen';
/** Delay before collapsed rail expands on hover — leaves room for icon tooltips. */
const PEEK_DELAY_MS = 380;

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

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
 * Supports ⌘/Ctrl+B and delayed hover peek (overlay expand without pushing content).
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);
  const [peeking, setPeeking] = useState(false);
  const [shortcutCoachOpen, setShortcutCoachOpen] = useState(false);
  const peekTimerRef = useRef(null);
  const collapseToggleRef = useRef(null);
  const coachOpenRef = useRef(false);

  useEffect(() => {
    coachOpenRef.current = shortcutCoachOpen;
  }, [shortcutCoachOpen]);

  const clearPeekTimer = useCallback(() => {
    if (peekTimerRef.current != null) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
  }, []);

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
    if (!collapsed) {
      clearPeekTimer();
      setPeeking(false);
    }
  }, [collapsed, clearPeekTimer]);

  useEffect(() => () => clearPeekTimer(), [clearPeekTimer]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== 'b') return;
      if (isTypingTarget(e.target)) return;
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) return;
      e.preventDefault();
      clearPeekTimer();
      setPeeking(false);
      dismissShortcutCoach();
      setCollapsed((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearPeekTimer, dismissShortcutCoach]);

  const toggleCollapsed = useCallback(() => {
    clearPeekTimer();
    setPeeking(false);
    setCollapsed((v) => {
      const next = !v;
      if (next) {
        queueMicrotask(() => maybeOfferShortcutCoach());
      } else {
        setShortcutCoachOpen(false);
      }
      return next;
    });
  }, [clearPeekTimer, maybeOfferShortcutCoach]);

  /** Mouse: delayed peek so icon tooltips can show first (instant if reduced motion). */
  const onSidebarEnter = useCallback(() => {
    if (!collapsed || coachOpenRef.current) return;
    clearPeekTimer();
    const delay = prefersReducedMotion() ? 0 : PEEK_DELAY_MS;
    peekTimerRef.current = setTimeout(() => {
      setPeeking(true);
      peekTimerRef.current = null;
    }, delay);
  }, [collapsed, clearPeekTimer]);

  /** Keyboard: expand labels immediately while focus is in the rail. */
  const onSidebarFocus = useCallback(() => {
    if (!collapsed) return;
    clearPeekTimer();
    setPeeking(true);
  }, [collapsed, clearPeekTimer]);

  const onSidebarLeave = useCallback(() => {
    clearPeekTimer();
    setPeeking(false);
  }, [clearPeekTimer]);

  const showLabels = !collapsed || peeking;
  const compact = collapsed && !peeking;
  const overlayPeek = collapsed && peeking;

  const asideWidthClass = showLabels ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;
  const asidePadClass = showLabels ? 'p-6' : 'px-2.5 py-5';
  const contentPadClass = collapsed ? SIDEBAR_PAD_COLLAPSED : SIDEBAR_PAD_EXPANDED;

  const asideClassName = [
    'fixed inset-y-0 left-0 hidden flex-col lg:flex',
    SIDEBAR_MOTION,
    asideWidthClass,
    asidePadClass,
    overlayPeek ? 'z-40 shadow-2xl shadow-black/25 ring-1 ring-white/10' : 'z-30',
  ].join(' ');

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
    peeking,
    showLabels,
    compact,
    overlayPeek,
    onSidebarEnter,
    onSidebarFocus,
    onSidebarLeave,
    asideClassName,
    contentPadClass,
    shortcutHint: getSidebarShortcutHint(),
    shortcutCoachOpen,
    dismissShortcutCoach,
    collapseToggleRef,
  };
}
