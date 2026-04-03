import type { Routine, Exercise } from '../types';

export const initialRoutines: Routine[] = [];

export type LocalExercise = Exercise & {
  muscleGroupCode: string;
};

export const fallbackExerciseLibrary: LocalExercise[] = [
  // Pectoral
  { id: 'f1', name: 'Press de Banca con Barra', muscleGroupCode: 'pectorales', equipment: 'Barra', muscleGroup: 'Pectorales', sets: [] },
  { id: 'f2', name: 'Press de Banca Inclinado', muscleGroupCode: 'pectorales', equipment: 'Mancuernas', muscleGroup: 'Pectorales', sets: [] },
  { id: 'f3', name: 'Aperturas en Polea', muscleGroupCode: 'pectorales', equipment: 'Polea', muscleGroup: 'Pectorales', sets: [] },
  { id: 'f4', name: 'Flexiones de Brazo', muscleGroupCode: 'pectorales', equipment: 'Peso corporal', muscleGroup: 'Pectorales', sets: [] },

  // Hombros
  { id: 'f5', name: 'Press Militar', muscleGroupCode: 'hombros', equipment: 'Barra', muscleGroup: 'Hombros', sets: [] },
  { id: 'f6', name: 'Elevaciones Laterales', muscleGroupCode: 'hombros', equipment: 'Mancuernas', muscleGroup: 'Hombros', sets: [] },
  { id: 'f7', name: 'Face Pulls', muscleGroupCode: 'hombros', equipment: 'Polea', muscleGroup: 'Hombros', sets: [] },

  // Espalda (Dorsales/Trapecio)
  { id: 'f8', name: 'Dominadas', muscleGroupCode: 'dorsales', equipment: 'Barra', muscleGroup: 'Dorsales', sets: [] },
  { id: 'f9', name: 'Remo con Barra', muscleGroupCode: 'dorsales', equipment: 'Barra', muscleGroup: 'Dorsales', sets: [] },
  { id: 'f10', name: 'Jalón al Pecho', muscleGroupCode: 'dorsales', equipment: 'Polea', muscleGroup: 'Dorsales', sets: [] },
  { id: 'f11', name: 'Encorogimientos', muscleGroupCode: 'trapecio', equipment: 'Mancuernas', muscleGroup: 'Trapecio', sets: [] },

  // Brazos (Biceps/Triceps/Antebrazo)
  { id: 'f12', name: 'Curl de Biceps con Barra', muscleGroupCode: 'biceps', equipment: 'Barra', muscleGroup: 'Biceps', sets: [] },
  { id: 'f13', name: 'Martillo', muscleGroupCode: 'biceps', equipment: 'Mancuernas', muscleGroup: 'Biceps', sets: [] },
  { id: 'f14', name: 'Extensión de Triceps', muscleGroupCode: 'triceps', equipment: 'Polea', muscleGroup: 'Triceps', sets: [] },
  { id: 'f15', name: 'Fondos en Paralelas', muscleGroupCode: 'triceps', equipment: 'Estación', muscleGroup: 'Triceps', sets: [] },
  { id: 'f16', name: 'Curl de Antebrazo', muscleGroupCode: 'antebrazo', equipment: 'Barra', muscleGroup: 'Antebrazo', sets: [] },

  // Core (Abdomen/Oblicuos/Lumbares)
  { id: 'f17', name: 'Plancha Abdominal', muscleGroupCode: 'abdomen', equipment: 'Peso corporal', muscleGroup: 'Abdomen', sets: [] },
  { id: 'f18', name: 'Crunch en Polea', muscleGroupCode: 'abdomen', equipment: 'Polea', muscleGroup: 'Abdomen', sets: [] },
  { id: 'f19', name: 'Russian Twists', muscleGroupCode: 'oblicuos', equipment: 'Disco', muscleGroup: 'Oblicuos', sets: [] },
  { id: 'f20', name: 'Hiperextensiones', muscleGroupCode: 'lumbares', equipment: 'Banco Romano', muscleGroup: 'Lumbares', sets: [] },

  // Piernas (Cuadriceps/Isquios/Gluteos/Pantorrillas)
  { id: 'f21', name: 'Sentadilla con Barra', muscleGroupCode: 'cuadriceps', equipment: 'Barra', muscleGroup: 'Cuadriceps', sets: [] },
  { id: 'f22', name: 'Prensa de Piernas', muscleGroupCode: 'cuadriceps', equipment: 'Máquina', muscleGroup: 'Cuadriceps', sets: [] },
  { id: 'f23', name: 'Peso Muerto Rumano', muscleGroupCode: 'isquiotibiales', equipment: 'Barra', muscleGroup: 'Isquiotibiales', sets: [] },
  { id: 'f24', name: 'Curl Femoral', muscleGroupCode: 'isquiotibiales', equipment: 'Máquina', muscleGroup: 'Isquiotibiales', sets: [] },
  { id: 'f25', name: 'Hip Thrust', muscleGroupCode: 'gluteos', equipment: 'Barra', muscleGroup: 'Glúteos', sets: [] },
  { id: 'f26', name: 'Elevación de Talones', muscleGroupCode: 'pantorrillas', equipment: 'Máquina', muscleGroup: 'Pantorrillas', sets: [] },
  { id: 'f27', name: 'Abducción de Cadera', muscleGroupCode: 'abductores', equipment: 'Máquina', muscleGroup: 'Abductores', sets: [] },
  { id: 'f28', name: 'Aducción de Cadera', muscleGroupCode: 'aductores', equipment: 'Máquina', muscleGroup: 'Aductores', sets: [] },
];
