import { describe, expect, it } from 'vitest';
import { fallbackReleaseHistory, getLocalizedReleaseText } from './releaseNotes';

describe('release notes localization', () => {
  it('uses English content without changing the canonical Spanish release', () => {
    const release = fallbackReleaseHistory[0];
    expect(getLocalizedReleaseText('en', release.title, release.titleEn)).toBe('Clearer workouts and a new mobile experience');
    expect(release.title).toBe('Entrenamientos más claros y una nueva experiencia móvil');
  });

  it('keeps the latest fallback release complete and bilingual', () => {
    const release = fallbackReleaseHistory[0];
    expect(release.version).toBe('2026.08.22');
    expect(release.notes).toHaveLength(6);
    expect(release.notes.every((note) => note.titleEn && note.descriptionEn)).toBe(true);
  });

  it('falls back to canonical content when an English translation is unavailable', () => {
    expect(getLocalizedReleaseText('en', 'Contenido canónico')).toBe('Contenido canónico');
    expect(getLocalizedReleaseText('en', 'Contenido canónico', '  ')).toBe('Contenido canónico');
  });
});
