import { DEFAULT_LANGUAGE, type AppLanguage } from './translations';

export const LANGUAGE_STORAGE_KEY = 'kinetic.language';

export const normalizeLanguage = (value: unknown): AppLanguage | null => {
  if (value === 'en') return 'en';
  if (value === 'es' || value === 'es-419') return 'es-419';
  return null;
};

export const getStoredLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)) ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export const persistLanguage = (language: AppLanguage): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // La preferencia remota podrá recuperarse en el próximo inicio de sesión.
  }
};
