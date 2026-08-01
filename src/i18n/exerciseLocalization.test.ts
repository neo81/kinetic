import { describe, expect, it } from 'vitest';
import { getExerciseDisplayDescription, getExerciseDisplayName } from './exerciseLocalization';
import { fallbackExerciseLibrary } from '../app/initialData';

describe('exercise localization', () => {
  const exercise = {
    name: 'Pullover en Polea Alta',
    nameEn: 'High Cable Pullover',
    description: 'Descripción en español',
    descriptionEn: 'English description',
  };

  it('keeps the canonical Spanish content in Spanish', () => {
    expect(getExerciseDisplayName(exercise, 'es-419')).toBe(exercise.name);
    expect(getExerciseDisplayDescription(exercise, 'es-419')).toBe(exercise.description);
  });

  it('uses the English display content without changing the canonical name', () => {
    expect(getExerciseDisplayName(exercise, 'en')).toBe(exercise.nameEn);
    expect(getExerciseDisplayDescription(exercise, 'en')).toBe(exercise.descriptionEn);
    expect(exercise.name).toBe('Pullover en Polea Alta');
  });

  it('falls back to the canonical content when a translation is missing or blank', () => {
    expect(getExerciseDisplayName({ name: 'Dominadas', nameEn: '  ' }, 'en')).toBe('Dominadas');
    expect(getExerciseDisplayDescription({ description: 'Original', descriptionEn: null as any }, 'en')).toBe('Original');
  });

  it('provides an English name for every exercise in the offline fallback catalog', () => {
    expect(fallbackExerciseLibrary).toHaveLength(28);
    expect(fallbackExerciseLibrary.every((exercise) => exercise.nameEn?.trim())).toBe(true);
    expect(getExerciseDisplayName(fallbackExerciseLibrary[0], 'en')).toBe('Barbell Bench Press');
    expect(fallbackExerciseLibrary[0].name).toBe('Press de Banca con Barra');
  });
});
