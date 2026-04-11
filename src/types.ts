export type View =
  | 'login'
  | 'dashboard'
  | 'routine-creator'
  | 'exercise-selector'
  | 'exercise-editor'
  | 'exercise-list'
  | 'routine-detail'
  | 'settings'
  | 'history'
  | 'routines-list';

export interface UserProfile {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  unitSystem: 'kg' | 'lb';
  bio: string | null;
  fitnessLevel: string | null;
}

export interface ExerciseSet {
  reps: number;
  weight: number;
  notes?: string;
  setNumber?: number;
  durationMinutes?: number;
  durationSeconds?: number;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  muscleGroup: string;
  muscle?: string;
  image?: string;
  sets: ExerciseSet[];
  measureUnit?: 'kg' | 'min' | 'sec';
  notes?: string;
  equipment?: string;
}

export interface RoutineDayExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  position: number;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface RoutineDay {
  id: string;
  dayType: 'core' | 'weekday';
  dayNumber: number | null;
  title: string;
  position: number;
  exercises: RoutineDayExercise[];
}

export interface Routine {
  id: string;
  name: string;
  frequency: string;
  lastSession?: string;
  days: number[];
  focus: string;
  exercises: Exercise[];
  dayEntries?: RoutineDay[];
  notes?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** True cuando la rutina solo está guardada en el cliente (fallo al subir a Supabase). */
  syncPending?: boolean;
}

export interface ActiveSession {
  id: string;
  routineId: string | null;
  routineName: string;
  routineDayId?: string;
  startTimeMs: number;
  completedExercises: string[];
}
