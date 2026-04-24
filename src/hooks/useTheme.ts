import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  getStoredThemePreference,
  persistThemePreference,
  resolveTheme,
  watchSystemTheme,
} from '../theme/themeManager';
import { type ResolvedTheme, type ThemePreference } from '../theme/theme';

type UseThemeOptions = {
  initialPreference?: ThemePreference;
};

export const useTheme = ({ initialPreference }: UseThemeOptions = {}) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(
    initialPreference ?? getStoredThemePreference(),
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(initialPreference ?? getStoredThemePreference()),
  );

  useEffect(() => {
    const nextResolvedTheme = resolveTheme(themePreference);
    setResolvedTheme(nextResolvedTheme);
    persistThemePreference(themePreference);
    applyTheme(nextResolvedTheme);
  }, [themePreference]);

  useEffect(() => {
    if (themePreference !== 'auto') {
      return;
    }

    return watchSystemTheme((nextResolvedTheme) => {
      setResolvedTheme(nextResolvedTheme);
      applyTheme(nextResolvedTheme);
    });
  }, [themePreference]);

  useEffect(() => {
    if (!initialPreference || initialPreference === themePreference) {
      return;
    }

    setThemePreferenceState(initialPreference);
  }, [initialPreference, themePreference]);

  const setThemePreference = useCallback((nextPreference: ThemePreference) => {
    setThemePreferenceState(nextPreference);
  }, []);

  return { themePreference, resolvedTheme, setThemePreference };
};
