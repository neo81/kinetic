export type ReleaseNote = {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
};

export type AppRelease = {
  version: string;
  title: string;
  titleEn?: string;
  publishedAt: string;
  notes: ReleaseNote[];
};

export const getLocalizedReleaseText = (
  language: AppLanguage,
  canonical: string,
  english?: string,
): string => language === 'en' && english?.trim() ? english : canonical;

export const fallbackReleaseHistory: AppRelease[] = [
  {
    version: '2026.07.29',
    title: 'Sesiones y rutinas más flexibles',
    titleEn: 'More flexible sessions and routines',
    publishedAt: '2026-07-29T15:00:00.000Z',
    notes: [
      {
        title: 'Ordena tus ejercicios',
        titleEn: 'Reorder your exercises',
        description: 'Ahora puedes cambiar el orden de los ejercicios arrastrándolos desde el asa lateral.',
        descriptionEn: 'You can now change the exercise order by dragging exercises from the side handle.',
      },
      {
        title: 'CORE opcional en cada sesión',
        titleEn: 'Optional CORE in every session',
        description: 'CORE queda disponible al elegir un día, pero solo cuenta si realizas alguno de sus ejercicios.',
        descriptionEn: 'CORE remains available after choosing a day, but it only counts when you complete at least one of its exercises.',
      },
      {
        title: 'Edición de rutinas más estable',
        titleEn: 'More reliable routine editing',
        description: 'El orden de los ejercicios se conserva al editarlos y se mejoró el guardado de sus series.',
        descriptionEn: 'Exercise order is preserved while editing, and saving configured sets is now more reliable.',
      },
    ],
  },
];
import type { AppLanguage } from '../i18n/translations';
