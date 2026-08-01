import type { Routine, Exercise } from '../types';

export const initialRoutines: Routine[] = [];

export type LocalExercise = Exercise & {
  muscleGroupCode: string;
};

export const fallbackExerciseLibrary: LocalExercise[] = [
  // Pectoral
  { id: 'f1', name: 'Press de Banca con Barra', nameEn: 'Barbell Bench Press', muscleGroupCode: 'pectorales', equipment: 'Barra', muscleGroup: 'Pectorales', sets: [] },
  { id: 'f2', name: 'Press de Banca Inclinado', nameEn: 'Incline Dumbbell Bench Press', muscleGroupCode: 'pectorales', equipment: 'Mancuernas', muscleGroup: 'Pectorales', sets: [] },
  { id: 'f3', name: 'Aperturas en Polea', nameEn: 'Cable Fly', muscleGroupCode: 'pectorales', equipment: 'Polea', muscleGroup: 'Pectorales', sets: [] },
  { id: 'f4', name: 'Flexiones de Brazo', nameEn: 'Push-Up', muscleGroupCode: 'pectorales', equipment: 'Peso corporal', muscleGroup: 'Pectorales', sets: [] },

  // Hombros
  { id: 'f5', name: 'Press Militar', nameEn: 'Military Press', muscleGroupCode: 'hombros', equipment: 'Barra', muscleGroup: 'Hombros', sets: [] },
  { id: 'f6', name: 'Elevaciones Laterales', nameEn: 'Lateral Raise', muscleGroupCode: 'hombros', equipment: 'Mancuernas', muscleGroup: 'Hombros', sets: [] },
  { id: 'f7', name: 'Face Pulls', nameEn: 'Face Pull', muscleGroupCode: 'hombros', equipment: 'Polea', muscleGroup: 'Hombros', sets: [] },

  // Espalda (Dorsales/Trapecio)
  { id: 'f8', name: 'Dominadas', nameEn: 'Pull-Up', muscleGroupCode: 'dorsales', equipment: 'Barra', muscleGroup: 'Dorsales', sets: [] },
  { id: 'f9', name: 'Remo con Barra', nameEn: 'Barbell Row', muscleGroupCode: 'dorsales', equipment: 'Barra', muscleGroup: 'Dorsales', sets: [] },
  { id: 'f10', name: 'Jalón al Pecho', nameEn: 'Lat Pulldown', muscleGroupCode: 'dorsales', equipment: 'Polea', muscleGroup: 'Dorsales', sets: [] },
  { id: 'f11', name: 'Encogimientos', nameEn: 'Dumbbell Shrug', muscleGroupCode: 'trapecio', equipment: 'Mancuernas', muscleGroup: 'Trapecio', sets: [] },

  // Brazos (Biceps/Triceps/Antebrazo)
  { id: 'f12', name: 'Curl de Bíceps con Barra', nameEn: 'Barbell Biceps Curl', muscleGroupCode: 'biceps', equipment: 'Barra', muscleGroup: 'Bíceps', sets: [] },
  { id: 'f13', name: 'Martillo', nameEn: 'Hammer Curl', muscleGroupCode: 'biceps', equipment: 'Mancuernas', muscleGroup: 'Bíceps', sets: [] },
  { id: 'f14', name: 'Extensión de Tríceps', nameEn: 'Triceps Pushdown', muscleGroupCode: 'triceps', equipment: 'Polea', muscleGroup: 'Tríceps', sets: [] },
  { id: 'f15', name: 'Fondos en Paralelas', nameEn: 'Parallel Bar Dip', muscleGroupCode: 'triceps', equipment: 'Estación', muscleGroup: 'Tríceps', sets: [] },
  { id: 'f16', name: 'Curl de Antebrazo', nameEn: 'Barbell Wrist Curl', muscleGroupCode: 'antebrazo', equipment: 'Barra', muscleGroup: 'Antebrazo', sets: [] },

  // Core (Abdomen/Oblicuos/Lumbares)
  { id: 'f17', name: 'Plancha Abdominal', nameEn: 'Plank', muscleGroupCode: 'abdomen', equipment: 'Peso corporal', muscleGroup: 'Abdomen', sets: [] },
  { id: 'f18', name: 'Crunch en Polea', nameEn: 'Cable Crunch', muscleGroupCode: 'abdomen', equipment: 'Polea', muscleGroup: 'Abdomen', sets: [] },
  { id: 'f19', name: 'Russian Twists', nameEn: 'Russian Twist', muscleGroupCode: 'oblicuos', equipment: 'Disco', muscleGroup: 'Oblicuos', sets: [] },
  { id: 'f20', name: 'Hiperextensiones', nameEn: 'Back Extension', muscleGroupCode: 'lumbares', equipment: 'Banco Romano', muscleGroup: 'Lumbares', sets: [] },

  // Piernas (Cuadriceps/Isquios/Gluteos/Pantorrillas)
  { id: 'f21', name: 'Sentadilla con Barra', nameEn: 'Barbell Back Squat', muscleGroupCode: 'cuadriceps', equipment: 'Barra', muscleGroup: 'Cuádriceps', sets: [] },
  { id: 'f22', name: 'Prensa de Piernas', nameEn: 'Leg Press', muscleGroupCode: 'cuadriceps', equipment: 'Máquina', muscleGroup: 'Cuádriceps', sets: [] },
  { id: 'f23', name: 'Peso Muerto Rumano', nameEn: 'Romanian Deadlift', muscleGroupCode: 'isquiotibiales', equipment: 'Barra', muscleGroup: 'Isquiotibiales', sets: [] },
  { id: 'f24', name: 'Curl Femoral', nameEn: 'Leg Curl', muscleGroupCode: 'isquiotibiales', equipment: 'Máquina', muscleGroup: 'Isquiotibiales', sets: [] },
  { id: 'f25', name: 'Hip Thrust', nameEn: 'Hip Thrust', muscleGroupCode: 'gluteos', equipment: 'Barra', muscleGroup: 'Glúteos', sets: [] },
  { id: 'f26', name: 'Elevación de Talones', nameEn: 'Calf Raise', muscleGroupCode: 'pantorrillas', equipment: 'Máquina', muscleGroup: 'Pantorrillas', sets: [] },
  { id: 'f27', name: 'Abducción de Cadera', nameEn: 'Hip Abduction', muscleGroupCode: 'abductores', equipment: 'Máquina', muscleGroup: 'Abductores', sets: [] },
  { id: 'f28', name: 'Aducción de Cadera', nameEn: 'Hip Adduction', muscleGroupCode: 'aductores', equipment: 'Máquina', muscleGroup: 'Aductores', sets: [] },
];
