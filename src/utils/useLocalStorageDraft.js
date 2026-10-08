import { useCallback, useEffect, useRef, useState } from 'react';

const SAVE_MS = 400;

/**
 * Debounced localStorage draft for unfinished long forms.
 * Never store passwords, OTP codes, or photo data URLs.
 */
export function useLocalStorageDraft({
  key,
  enabled = true,
  value,
  isDirty,
  isValid,
  apply,
}) {
  const ready = useRef(false);
  const [hydrated, setHydrated] = useState(() => !enabled || !key);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const isValidRef = useRef(isValid);
  isValidRef.current = isValid;
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled || !key || typeof window === 'undefined') {
      ready.current = true;
      setHydrated(true);
      return undefined;
    }
    let alive = true;
    ready.current = false;
    setHydrated(false);
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const validate = isValidRef.current;
        const ok = validate ? validate(parsed) : parsed != null && typeof parsed === 'object';
        if (ok && isDirtyRef.current(parsed)) applyRef.current(parsed);
      }
    } catch {
      /* ignore corrupt draft */
    }
    if (alive) {
      ready.current = true;
      setHydrated(true);
    }
    return () => {
      alive = false;
    };
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !key || !ready.current || typeof window === 'undefined') return undefined;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        if (!isDirtyRef.current(value)) {
          window.localStorage.removeItem(key);
          return;
        }
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* quota / private mode */
      }
    }, SAVE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, enabled, key]);

  const clearDraft = useCallback(() => {
    ready.current = true;
    if (key && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }, [key]);

  return { clearDraft, hydrated };
}

export function clearLocalStorageDraft(key) {
  if (typeof window === 'undefined' || !key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
