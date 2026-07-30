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
    title: 'Sesiones y rutinas mas flexibles',
    publishedAt: '2026-07-29T15:00:00.000Z',
    notes: [
      {
        title: 'Ordena tus ejercicios',
        description: 'Ahora podes cambiar el orden de los ejercicios arrastrandolos desde el asa lateral.',
      },
      {
        title: 'CORE opcional en cada sesion',
        description: 'CORE queda disponible al elegir un dia, pero solo cuenta si realizas alguno de sus ejercicios.',
      },
      {
        title: 'Edicion de rutinas mas estable',
        description: 'El orden de los ejercicios se conserva al editarlos y se mejoro el guardado de sus series.',
      },
    ],
  },
];
