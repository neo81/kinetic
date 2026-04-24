import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  getStoredThemePreference,
  getSystemPreferredTheme,
  persistThemePreference,
  setDocumentTheme,
} from './themeManager';
import { resolveThemePreference, THEME_STORAGE_KEY } from './theme';

describe('theme helpers', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('resolves auto using the system preference', () => {
    expect(resolveThemePreference('auto', true)).toBe('dark');
    expect(resolveThemePreference('auto', false)).toBe('light');
    expect(resolveThemePreference('dark', false)).toBe('dark');
    expect(resolveThemePreference('light', true)).toBe('light');
  });

  it('persists and reads the stored theme preference', () => {
    persistThemePreference('auto');

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('auto');
    expect(getStoredThemePreference()).toBe('auto');
  });

  it('applies the resolved theme to the document root', () => {
    applyTheme('light');

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('sets the document theme from the current media query when using auto', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as typeof window.matchMedia;

    const resolvedTheme = setDocumentTheme('auto');

    expect(getSystemPreferredTheme()).toBe('dark');
    expect(resolvedTheme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
