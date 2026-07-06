import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { setDocumentLanguage } from '../i18n';
import {
  persistLanguage,
  readBootstrapLanguage,
  readStoredLanguage,
} from '../utils/langStorage';
import {
  applyThemeClass,
  persistTheme,
  readBootstrapTheme,
  readStoredTheme,
} from '../utils/themeStorage';

const PreferencesContext = createContext(null);

function normalizeLanguage(stored) {
  return stored === 'am' ? 'am' : 'en';
}

export function PreferencesProvider({ children }) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [theme, setThemeState] = useState(() => readBootstrapTheme());
  const [isDark, setIsDark] = useState(() => readBootstrapTheme() === 'dark');
  const [language, setLanguageState] = useState(() => normalizeLanguage(readBootstrapLanguage()));
  const userScopeRef = useRef(null);
  const skipThemePersistRef = useRef(true);

  useEffect(() => {
    const scope = user ? `${user.gym_id ?? ''}:${user.id ?? ''}` : 'guest';
    if (scope === userScopeRef.current) return;

    userScopeRef.current = scope;
    skipThemePersistRef.current = true;
    const storedTheme = readStoredTheme(user);
    setThemeState(storedTheme);
    applyThemeClass(storedTheme);
    setIsDark(storedTheme === 'dark');
  }, [user?.id, user?.gym_id]);

  useEffect(() => {
    const code = normalizeLanguage(readStoredLanguage(user));
    setLanguageState(code);
    if (i18n.language !== code) {
      i18n.changeLanguage(code);
    }
    setDocumentLanguage(code);
  }, [user?.id, user?.gym_id, i18n]);

  useEffect(() => {
    applyThemeClass(theme);
    setIsDark(theme === 'dark');

    if (skipThemePersistRef.current) {
      skipThemePersistRef.current = false;
      return;
    }

    persistTheme(theme, user);
  }, [theme, user?.id, user?.gym_id]);

  const setTheme = useCallback((next) => {
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const setLanguage = useCallback(
    (lng) => {
      const code = persistLanguage(lng, user);
      setLanguageState(code);
      i18n.changeLanguage(code);
      setDocumentLanguage(code);
    },
    [i18n, user?.id, user?.gym_id, user?.email]
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      cycleTheme,
      language,
      setLanguage,
      isDark,
    }),
    [theme, setTheme, cycleTheme, language, setLanguage, isDark]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
