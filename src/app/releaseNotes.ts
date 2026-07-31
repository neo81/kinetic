export type ReleaseNote = {
  title: string;
  description: string;
};

export type AppRelease = {
  version: string;
  title: string;
  publishedAt: string;
  notes: ReleaseNote[];
};

export const fallbackReleaseHistory: AppRelease[] = [
  {
    version: '2026.07.29',
    title: 'Sesiones y rutinas más flexibles',
    publishedAt: '2026-07-29T15:00:00.000Z',
    notes: [
      {
        title: 'Ordena tus ejercicios',
        description: 'Ahora puedes cambiar el orden de los ejercicios arrastrándolos desde el asa lateral.',
      },
      {
        title: 'CORE opcional en cada sesión',
        description: 'CORE queda disponible al elegir un día, pero solo cuenta si realizas alguno de sus ejercicios.',
      },
      {
        title: 'Edición de rutinas más estable',
        description: 'El orden de los ejercicios se conserva al editarlos y se mejoró el guardado de sus series.',
      },
    ],
  },
];
