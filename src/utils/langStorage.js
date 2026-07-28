export const LANGUAGE_STORAGE_KEY = 'vibe-lang';
export const GUEST_LANGUAGE_KEY = 'vibe-lang:guest';

/** @typedef {'en' | 'am' | 'om'} AppLanguage */

/** @param {string | null | undefined} code */
export function normalizeLanguage(code) {
  if (code === 'am' || code === 'om') return code;
  return 'en';
}

export function setDocumentLanguage(lng) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizeLanguage(lng);
  }
}

export function defaultGuestLanguage() {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || '';
    if (lang.startsWith('am')) return 'am';
    if (lang.startsWith('om')) return 'om';
  }
  return 'en';
}

export function readGuestLanguage() {
  if (typeof window === 'undefined') return 'en';
  const guest = localStorage.getItem(GUEST_LANGUAGE_KEY);
  if (guest === 'am' || guest === 'en' || guest === 'om') return guest;
  return defaultGuestLanguage();
}

export function persistGuestLanguage(code) {
  const normalized = normalizeLanguage(code);
  localStorage.setItem(GUEST_LANGUAGE_KEY, normalized);
  return normalized;
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

  if (!user) return readGuestLanguage();

  const key = languageStorageKey(user);
  if (key) {
    const scoped = localStorage.getItem(key);
    if (scoped === 'am' || scoped === 'en' || scoped === 'om') return scoped;
  }

  const legacy = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (legacy === 'am' || legacy === 'en' || legacy === 'om') return legacy;

  return 'en';
}

export function readBootstrapLanguage() {
  return readGuestLanguage();
}

export function persistLanguage(code, user) {
  const normalized = normalizeLanguage(code);
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
