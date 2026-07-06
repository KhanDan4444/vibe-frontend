const TOKEN_KEY = 'token';
const REMEMBER_PREF_KEY = 'vibe-remember-me';

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

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token, rememberMe) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  setRememberMePreference(rememberMe);
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
