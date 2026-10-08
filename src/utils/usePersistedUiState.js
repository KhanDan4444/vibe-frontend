import { useEffect, useRef, useState } from 'react';

const SAVE_MS = 300;

/**
 * Persist lightweight list UI (filters, search, sort) across reloads.
 * Defaults to localStorage to match mobile AsyncStorage survival.
 */
export function usePersistedUiState(key, initial, opts = {}) {
  const { enabled = true, storage = 'local', isValid } = opts;
  const store =
    typeof window === 'undefined'
      ? null
      : storage === 'session'
        ? window.sessionStorage
        : window.localStorage;

  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(!enabled);
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled || !store || !key) {
      setReady(true);
      return undefined;
    }
    let alive = true;
    setReady(false);
    try {
      const raw = store.getItem(key);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        if (isValid) {
          if (isValid(parsed)) setState(parsed);
        } else if (parsed !== undefined) {
          setState(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    if (alive) setReady(true);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per key
  }, [key, enabled, storage]);

  useEffect(() => {
    if (!enabled || !ready || !store || !key) return undefined;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        store.setItem(key, JSON.stringify(state));
      } catch {
        /* ignore */
      }
    }, SAVE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state, enabled, ready, key, store]);

  return [state, setState, ready];
}

export const LOGIN_LAST_IDENTIFIER_KEY = 'vibe.login.lastIdentifier';

export function readStoredString(key) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredString(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (!value) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
