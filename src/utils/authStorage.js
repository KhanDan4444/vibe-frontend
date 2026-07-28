const REMEMBER_PREF_KEY = 'vibe-remember-me';
const LEGACY_TOKEN_KEY = 'token';

export function getRememberMePreference() {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(REMEMBER_PREF_KEY);
  if (stored === '0') return false;
  if (stored === '1') return true;
  return true;
}

export function setRememberMePreference(rememberMe) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMEMBER_PREF_KEY, rememberMe ? '1' : '0');
}

/** Drop JWT from browser storage — web auth uses httpOnly cookies now. */
export function clearLegacyStoredToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}
