import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { setDocumentLanguage } from '../i18n';
import {
  normalizeLanguage,
  persistGuestLanguage,
  persistLanguage,
  readGuestLanguage,
  readStoredLanguage,
  ensureUserLanguageFromGuest,
} from '../utils/langStorage';
import {
  applyThemeClass,
  persistTheme,
  readBootstrapTheme,
  readStoredTheme,
} from '../utils/themeStorage';

const PreferencesContext = createContext(null);

const AUTH_PATHS = ['/login', '/register-gym', '/forgot-password', '/reset-password'];

function isAuthPath(pathname) {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function PreferencesProvider({ children }) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const location = useLocation();
  const onAuthRoute = isAuthPath(location.pathname);
  const [theme, setThemeState] = useState(() => readBootstrapTheme());
  const [isDark, setIsDark] = useState(() => readBootstrapTheme() === 'dark');
  const [language, setLanguageState] = useState(() =>
    normalizeLanguage(onAuthRoute || !user ? readGuestLanguage() : readStoredLanguage(user))
  );
  const userScopeRef = useRef(null);
  const skipThemePersistRef = useRef(true);
  /** Prevents hydrate from overwriting the language just carried across login/logout. */
  const skipHydrateLanguageRef = useRef(false);
  const languageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => {
    const scope = user ? `${user.gym_id ?? ''}:${user.id ?? ''}` : 'guest';
    if (scope === userScopeRef.current) return;

    const previousScope = userScopeRef.current;
    userScopeRef.current = scope;
    skipThemePersistRef.current = true;
    const storedTheme = readStoredTheme(user);
    setThemeState(storedTheme);
    applyThemeClass(storedTheme);
    setIsDark(storedTheme === 'dark');

    // Login: keep the language chosen on the auth screen (don't snap back to English).
    if (user && previousScope === 'guest') {
      skipHydrateLanguageRef.current = true;
      const carried = normalizeLanguage(languageRef.current);
      persistLanguage(carried, user);
      persistGuestLanguage(carried);
      setLanguageState(carried);
      if (i18n.language !== carried) {
        i18n.changeLanguage(carried);
      }
      setDocumentLanguage(carried);
      return;
    }

    // Logout: carry the current language onto the login/guest screen
    // (previously reset to browser default, dropping an Amharic choice).
    if (!user && previousScope && previousScope !== 'guest') {
      skipHydrateLanguageRef.current = true;
      const carried = normalizeLanguage(languageRef.current);
      persistGuestLanguage(carried);
      setLanguageState(carried);
      if (i18n.language !== carried) {
        i18n.changeLanguage(carried);
      }
      setDocumentLanguage(carried);
    }
  }, [user?.id, user?.gym_id, i18n]);

  useEffect(() => {
    if (skipHydrateLanguageRef.current) {
      skipHydrateLanguageRef.current = false;
      return;
    }
    const code = normalizeLanguage(
      onAuthRoute || !user ? readGuestLanguage() : ensureUserLanguageFromGuest(user)
    );
    setLanguageState(code);
    if (i18n.language !== code) {
      i18n.changeLanguage(code);
    }
    setDocumentLanguage(code);
    // onAuthRoute is read for source selection but omitted from deps so leaving
    // /login after sign-in does not re-hydrate and fight the carried language.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
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
      // Mirror to guest storage so login/register keep the choice after logout.
      persistGuestLanguage(code);
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
