const EXERCISE_GROUP_IMAGES: Record<string, string> = {
  abdomen: '/exercise-groups/abdomen.webp',
  abductores: '/exercise-groups/abductores.webp',
  aductores: '/exercise-groups/aductores.webp',
  antebrazo: '/exercise-groups/antebrazo.webp',
  biceps: '/exercise-groups/biceps.webp',
  cuadriceps: '/exercise-groups/cuadriceps.webp',
  dorsales: '/exercise-groups/dorsales.webp',
  gluteos: '/exercise-groups/gluteos.webp',
  hombros: '/exercise-groups/hombros.webp',
  isquiotibiales: '/exercise-groups/isquiotibiales.webp',
  lumbares: '/exercise-groups/lumbares.webp',
  oblicuos: '/exercise-groups/oblicuos.webp',
  pantorrillas: '/exercise-groups/pantorrillas.webp',
  pectorales: '/exercise-groups/pectorales.webp',
  trapecio: '/exercise-groups/trapecio.webp',
  triceps: '/exercise-groups/triceps.webp',
};

const normalizeGroupKey = (group?: string) =>
  (group ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getExerciseGroupImage = (group?: string) =>
  EXERCISE_GROUP_IMAGES[normalizeGroupKey(group)] ?? '/exercise-placeholder.png';
