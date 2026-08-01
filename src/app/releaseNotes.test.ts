import { describe, expect, it } from 'vitest';
import { fallbackReleaseHistory, getLocalizedReleaseText } from './releaseNotes';

describe('release notes localization', () => {
  it('uses English content without changing the canonical Spanish release', () => {
    const release = fallbackReleaseHistory[0];
    expect(getLocalizedReleaseText('en', release.title, release.titleEn)).toBe('More flexible sessions and routines');
    expect(release.title).toBe('Sesiones y rutinas más flexibles');
  });

  it('falls back to canonical content when an English translation is unavailable', () => {
    expect(getLocalizedReleaseText('en', 'Contenido canónico')).toBe('Contenido canónico');
    expect(getLocalizedReleaseText('en', 'Contenido canónico', '  ')).toBe('Contenido canónico');
  });
});
