import { userFromStoredToken } from './authSession';

export const LANGUAGE_STORAGE_KEY = 'vibe-lang';

export function setDocumentLanguage(lng) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng === 'am' ? 'am' : 'en';
  }
}

export function languageStorageKey(user) {
  if (!user) return null;
  if (user.gym_id) return `vibe-lang:gym:${user.gym_id}`;
  if (user.id != null) return `vibe-lang:user:${user.id}`;
  if (user.email) return `vibe-lang:email:${user.email}`;
  return null;
}

export function readStoredLanguage(user) {
  if (typeof window === 'undefined') return 'en';

  const key = languageStorageKey(user);
  if (key) {
    const scoped = localStorage.getItem(key);
    if (scoped === 'am' || scoped === 'en') return scoped;
  }

  const legacy = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (legacy === 'am' || legacy === 'en') return legacy;

  return 'en';
}

export function readBootstrapLanguage() {
  return readStoredLanguage(userFromStoredToken());
}

export function persistLanguage(code, user) {
  const normalized = code === 'am' ? 'am' : 'en';
  const key = languageStorageKey(user);
  if (key) {
    localStorage.setItem(key, normalized);
  }
  localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  return normalized;
}

export function bootstrapLanguage(i18n) {
  const lng = readBootstrapLanguage();
  if (i18n.language !== lng) {
    i18n.changeLanguage(lng);
  }
  setDocumentLanguage(lng);
  return lng;
}
