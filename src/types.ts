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
  isFavorite?: boolean;
  isCustom?: boolean;
}

export type ExerciseEquipmentFilter =
  | 'Todos'
  | 'Barra'
  | 'Mancuerna'
  | 'Maquina'
  | 'Peso corporal'
  | 'Cable';

export type ExerciseSourceFilter = 'todos' | 'global' | 'custom';

export interface ExerciseFilter {
  equipment: ExerciseEquipmentFilter;
  source: ExerciseSourceFilter;
  onlyFavorites: boolean;
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
  routineDayIds: string[];
  activeRoutineDayId: string;
  startTimeMs: number;
  completedExercises: string[];
  completedDayIds: string[];
  exerciseGroupsByDay: Record<string, SessionExerciseGroup[]>;
  performanceData: {
    [exerciseId: string]: {
      [setNumber: number]: {
        actualReps: number | null;
        actualWeight: number | null;
        actualDurationMinutes: number | null;
        actualDurationSeconds: number | null;
        captured: boolean;
      };
    };
  };
}

export interface SessionExerciseGroup {
  id: string;
  exerciseIds: string[];
}

export interface SessionExportDayPayload {
  routine_day_id: string;
}

export interface SessionExportExercisePayload {
  exercise_id: string;
  routine_day_id: string;
  position: number;
  notes: string | null;
}

export interface SessionExportSetPayload {
  exercise_id: string;
  exercise_position: number;
  routine_day_id: string;
  set_number: number;
  planned_reps: number | null;
  planned_weight: number | null;
  planned_duration_minutes: number | null;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_duration_minutes: number | null;
  actual_duration_seconds: number | null;
}

export interface SessionExportPayload {
  days: SessionExportDayPayload[];
  exercises: SessionExportExercisePayload[];
  sets: SessionExportSetPayload[];
}

export interface CompletedSession {
  id: string;
  routineName: string;
  endedAt: Date;
  startedAt: Date;
  durationMs: number;
  dayCount: number;
  dayInfo: string;
  exerciseCount: number;
  totalVolume: number;
  totalVolumeWeight: number;
  totalVolumeMinutes: number;
}

export interface UserGoals {
  weeklyVolumeTarget: number;      // kg
  weeklyExercisesTarget: number;
  weeklyDurationTarget: number;    // minutes
}

export interface WeeklyStats {
  volume: number;                  // kg
  volumeMinutes: number;           // minutes
  exercises: number;
  sessions: number;
  avgDuration: number;             // minutes
  changeVsLastWeek: {
    volumeChange: number;          // percentage, e.g., 12.5 for +12.5%
    exerciseChange: number;        // percentage
    durationChange: number;        // percentage
  };
}

export interface DashboardData {
  thisWeek: WeeklyStats;
  lastWeek: WeeklyStats;
  goals: UserGoals;
}
