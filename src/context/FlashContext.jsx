import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import FlashToaster from '../components/FlashBanner';

const FlashContext = createContext(null);
const MAX_VISIBLE_TOASTS = 5;

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function FlashProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showFlash = useCallback((message) => {
    if (!message) return;
    const payload =
      typeof message === 'string' ? { title: message, variant: 'success' } : { variant: 'success', ...message };

    setToasts((prev) => {
      const next = [...prev, { id: createToastId(), ...payload }];
      if (next.length <= MAX_VISIBLE_TOASTS) return next;
      return next.slice(next.length - MAX_VISIBLE_TOASTS);
    });
  }, []);

  const clearFlash = useCallback(() => setToasts([]), []);

  const value = useMemo(() => ({ showFlash, clearFlash, dismissToast }), [showFlash, clearFlash, dismissToast]);

  return (
    <FlashContext.Provider value={value}>
      {children}
      <FlashToaster toasts={toasts} onDismiss={dismissToast} />
    </FlashContext.Provider>
  );
}

export function useFlash() {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error('useFlash must be used within FlashProvider');
  return ctx;
}
