import { DEFAULT_LANGUAGE, type AppLanguage } from './translations';

export const APP_LANGUAGE = DEFAULT_LANGUAGE;
export const APP_LOCALE = DEFAULT_LANGUAGE;

export const formatAppDate = (
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
  language: AppLanguage = DEFAULT_LANGUAGE,
): string => new Intl.DateTimeFormat(language, options).format(new Date(value));

export const formatAppTime = (
  value: Date | number | string,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false },
  language: AppLanguage = DEFAULT_LANGUAGE,
): string => new Intl.DateTimeFormat(language, options).format(new Date(value));

export const formatAppNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
  language: AppLanguage = DEFAULT_LANGUAGE,
): string => new Intl.NumberFormat(language, options).format(value);
