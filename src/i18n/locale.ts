export const APP_LANGUAGE = 'es-419';
export const APP_LOCALE = 'es-419';

export const formatAppDate = (
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string => new Intl.DateTimeFormat(APP_LOCALE, options).format(new Date(value));

export const formatAppTime = (
  value: Date | number | string,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false },
): string => new Intl.DateTimeFormat(APP_LOCALE, options).format(new Date(value));

export const formatAppNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
): string => new Intl.NumberFormat(APP_LOCALE, options).format(value);
