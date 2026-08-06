const REMEMBER_PREF_KEY = 'vibe-remember-me';
const LEGACY_TOKEN_KEY = 'token';
/** Web access token — used when httpOnly cookies are blocked (e.g. iOS Safari ITP on cross-origin API). */
const ACCESS_TOKEN_KEY = 'vibe_web_token';

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

function storageForRemember(rememberMe) {
  return rememberMe ? localStorage : sessionStorage;
}

/** Persist JWT so credentialed fetches work when Safari won't keep cross-site cookies. */
export function setAccessToken(token, rememberMe = true) {
  if (typeof window === 'undefined' || !token) return;
  clearAccessToken();
  storageForRemember(Boolean(rememberMe)).setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
}

/** @deprecated Use clearAccessToken */
export function clearLegacyStoredToken() {
  clearAccessToken();
}

export function authHeaderFromStorage() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
