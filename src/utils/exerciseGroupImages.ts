const EXERCISE_GROUP_IMAGES: Record<string, string> = {
  abdomen: '/exercise-groups/abdomen.png',
  abductores: '/exercise-groups/abductores.png',
  aductores: '/exercise-groups/aductores.png',
  antebrazo: '/exercise-groups/antebrazo.png',
  biceps: '/exercise-groups/biceps.png',
  cuadriceps: '/exercise-groups/cuadriceps.png',
  dorsales: '/exercise-groups/dorsales.png',
  gluteos: '/exercise-groups/gluteos.png',
  hombros: '/exercise-groups/hombros.png',
  isquiotibiales: '/exercise-groups/isquiotibiales.png',
  lumbares: '/exercise-groups/lumbares.png',
  oblicuos: '/exercise-groups/oblicuos.png',
  pantorrillas: '/exercise-groups/pantorrillas.png',
  pectorales: '/exercise-groups/pectorales.png',
  trapecio: '/exercise-groups/trapecio.png',
  triceps: '/exercise-groups/triceps.png',
};

const normalizeGroupKey = (group?: string) =>
  (group ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getExerciseGroupImage = (group?: string) =>
  EXERCISE_GROUP_IMAGES[normalizeGroupKey(group)] ?? '/exercise-placeholder.png';

