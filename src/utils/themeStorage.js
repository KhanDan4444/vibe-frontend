const LEGACY_THEME_STORAGE_KEY = 'vibe-theme';
export function themeStorageKey(user) {
  if (!user) return null;
  if (user.gym_id) return `vibe-theme:gym:${user.gym_id}`;
  return `vibe-theme:user:${user.id}`;
}

export function readStoredTheme(user) {
  if (typeof window === 'undefined') return 'light';

  const key = themeStorageKey(user);
  if (key) {
    const scoped = localStorage.getItem(key);
    if (scoped === 'dark' || scoped === 'light') return scoped;
  }

  const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (legacy === 'dark' || legacy === 'light') return legacy;

  return 'light';
}

export function readBootstrapTheme() {
  return readStoredTheme(null);
}

export function applyThemeClass(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', theme === 'dark' ? '#13161c' : '#f8fafc');
  }
}

export function bootstrapTheme() {
  applyThemeClass(readBootstrapTheme());
}

export function persistTheme(theme, user) {
  if (typeof window === 'undefined') return;
  const key = themeStorageKey(user);
  if (!key) return;
  localStorage.setItem(key, theme);
  if (localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) {
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }
}

export { LEGACY_THEME_STORAGE_KEY };
