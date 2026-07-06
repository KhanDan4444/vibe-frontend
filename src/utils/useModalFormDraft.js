import { useRef, useEffect, useCallback } from 'react';

/**
 * Preserve form values when a modal is dismissed (backdrop, Escape, X) and reopened.
 * Re-initializes when scope/mode changes, on first open, or after a successful submit.
 *
 * @param {{
 *   isOpen: boolean,
 *   scopeKey: string|number|null|undefined,
 *   initialize: () => void,
 *   modeKey?: string|number|null|undefined,
 *   saving?: boolean,
 * }} options
 */
export function useModalFormDraft({ isOpen, scopeKey, initialize, modeKey, saving = false }) {
  const touchedRef = useRef(false);
  const lastScopeRef = useRef(undefined);
  const lastModeRef = useRef(undefined);
  const wasOpenRef = useRef(false);
  const wasSavingRef = useRef(false);

  const markTouched = useCallback(() => {
    touchedRef.current = true;
  }, []);

  const clearTouched = useCallback(() => {
    touchedRef.current = false;
  }, []);

  const resetDraft = useCallback(() => {
    initialize();
    touchedRef.current = false;
  }, [initialize]);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    const opening = !wasOpenRef.current;
    wasOpenRef.current = true;

    const scopeChanged =
      lastScopeRef.current !== undefined && scopeKey !== lastScopeRef.current;
    const modeChanged =
      modeKey !== undefined &&
      lastModeRef.current !== undefined &&
      modeKey !== lastModeRef.current;
    const isFirstScope = lastScopeRef.current === undefined;

    if (scopeChanged || modeChanged) {
      initialize();
      touchedRef.current = false;
    } else if (opening && (isFirstScope || !touchedRef.current)) {
      initialize();
    }

    lastScopeRef.current = scopeKey;
    if (modeKey !== undefined) lastModeRef.current = modeKey;
  }, [isOpen, scopeKey, modeKey, initialize]);

  useEffect(() => {
    if (wasSavingRef.current && !saving && !isOpen) {
      initialize();
      touchedRef.current = false;
    }
    wasSavingRef.current = !!saving;
  }, [saving, isOpen, initialize]);

  return { markTouched, resetDraft, clearTouched };
}
