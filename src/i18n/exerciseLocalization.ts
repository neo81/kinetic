import type { Exercise } from '../types';
import type { AppLanguage } from './translations';

const nonEmpty = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

export const getExerciseDisplayName = (
  exercise: Pick<Exercise, 'name' | 'nameEn'>,
  language: AppLanguage,
): string => language === 'en' ? nonEmpty(exercise.nameEn) ?? exercise.name : exercise.name;

export const getExerciseDisplayDescription = (
  exercise: Pick<Exercise, 'description' | 'descriptionEn'>,
  language: AppLanguage,
): string | undefined => language === 'en'
  ? nonEmpty(exercise.descriptionEn) ?? nonEmpty(exercise.description)
  : nonEmpty(exercise.description);
