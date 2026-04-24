import {
  DEFAULT_THEME_PREFERENCE,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from './theme';

const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const canUseWindow = () => typeof window !== 'undefined';

export const getSystemPreferredTheme = (): ResolvedTheme => {
  if (!canUseWindow() || typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
};

export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
  resolveThemePreference(preference, getSystemPreferredTheme() === 'dark');

export const applyTheme = (resolvedTheme: ResolvedTheme): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
};

export const setDocumentTheme = (preference: ThemePreference): ResolvedTheme => {
  const resolvedTheme = resolveTheme(preference);
  applyTheme(resolvedTheme);
  return resolvedTheme;
};

export const watchSystemTheme = (callback: (theme: ResolvedTheme) => void): (() => void) => {
  if (!canUseWindow() || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
  const handler = (event: MediaQueryListEvent) => {
    callback(event.matches ? 'dark' : 'light');
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
};

export const getStoredThemePreference = (): ThemePreference => {
  if (!canUseWindow()) {
    return DEFAULT_THEME_PREFERENCE;
  }

  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedValue === 'light' || storedValue === 'dark' || storedValue === 'auto') {
    return storedValue;
  }

  return DEFAULT_THEME_PREFERENCE;
};

export const persistThemePreference = (preference: ThemePreference): void => {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
};
