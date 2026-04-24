export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'kinetic.theme-preference';
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'dark';

export const resolveThemePreference = (
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme => {
  if (preference === 'auto') {
    return systemPrefersDark ? 'dark' : 'light';
  }

  return preference;
};
