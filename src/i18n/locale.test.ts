import { describe, expect, it } from 'vitest';
import { APP_LANGUAGE, APP_LOCALE, formatAppDate, formatAppNumber } from './locale';

describe('configuración regional de la aplicación', () => {
  it('usa español latinoamericano como idioma y locale base', () => {
    expect(APP_LANGUAGE).toBe('es-419');
    expect(APP_LOCALE).toBe('es-419');
  });

  it('formatea nombres de meses y números con la configuración central', () => {
    expect(formatAppDate('2026-07-31T12:00:00.000Z', { month: 'long', timeZone: 'UTC' })).toBe('julio');
    expect(formatAppNumber(1234.5)).toBe(new Intl.NumberFormat(APP_LOCALE).format(1234.5));
  });
});
