import { beforeEach, describe, expect, it } from 'vitest';
import {
  getStoredLanguage,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  persistLanguage,
} from './languageStorage';

describe('persistencia del idioma', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normaliza la preferencia española anterior a es-419', () => {
    expect(normalizeLanguage('es')).toBe('es-419');
    expect(normalizeLanguage('es-419')).toBe('es-419');
  });

  it('acepta inglés y rechaza valores desconocidos', () => {
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('fr')).toBeNull();
  });

  it('usa español latinoamericano cuando no hay una preferencia guardada', () => {
    expect(getStoredLanguage()).toBe('es-419');
  });

  it('guarda y recupera el idioma seleccionado', () => {
    persistLanguage('en');

    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(getStoredLanguage()).toBe('en');
  });
});
