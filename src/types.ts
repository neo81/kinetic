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
  | 'progress'
  | 'routines-list';

export interface UserProfile {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  unitSystem: 'kg' | 'lb';
  bio: string | null;
  fitnessLevel: string | null;
  heightCm: number | null;
  bodyWeightKg: number | null;
}

export type ExerciseLoadType = 'external' | 'bodyweight';
export type ExerciseTargetType = 'fixed_reps' | 'failure';

export interface ExerciseSet {
  reps: number | null;
  weight: number | null;
  notes?: string;
  setNumber?: number;
  durationMinutes?: number;
  durationSeconds?: number;
  targetType?: ExerciseTargetType;
}

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  muscleGroup: string;
  muscleGroupCode?: string;
  muscle?: string;
  image?: string;
  sets: ExerciseSet[];
  measureUnit?: 'kg' | 'min' | 'sec';
  loadType?: ExerciseLoadType;
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
  skippedExercises?: string[];
  completedDayIds: string[];
  performanceData: {
    [exerciseId: string]: {
      [setNumber: number]: {
        actualReps: number | null;
        actualWeight: number | null;
        actualDurationMinutes: number | null;
        actualDurationSeconds: number | null;
        bodyWeightKgSnapshot?: number | null;
        captured: boolean;
      };
    };
  };
}

export interface SessionExportDayPayload {
  routine_day_id: string;
}

export interface SessionExportExercisePayload {
  exercise_id: string;
  routine_day_exercise_id: string;
  routine_day_id: string;
  position: number;
  notes: string | null;
}

export interface SessionExportSetPayload {
  exercise_id: string;
  routine_day_exercise_id: string;
  exercise_position: number;
  routine_day_id: string;
  set_number: number;
  planned_reps: number | null;
  planned_weight: number | null;
  planned_duration_minutes: number | null;
  planned_duration_seconds: number | null;
  target_type: ExerciseTargetType;
  load_type: ExerciseLoadType;
  body_weight_kg_snapshot: number | null;
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

export interface SessionWeightProgression {
  routineDayExerciseId: string;
  previousWeight: number;
  newWeight: number;
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
  days: CompletedSessionDay[];
}

export interface CompletedSessionDay {
  id: string;
  label: string;
  dayType: 'core' | 'weekday';
  dayNumber: number | null;
  exercises: CompletedSessionExercise[];
}

export interface CompletedSessionExercise {
  id: string;
  name: string;
  nameEn?: string;
  notes: string | null;
  position: number;
  sets: CompletedSessionSet[];
}

export interface CompletedSessionSet {
  id: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  durationMinutes: number | null;
  durationSeconds: number | null;
  loadType: ExerciseLoadType;
  targetType: ExerciseTargetType;
  bodyWeightKgSnapshot: number | null;
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

export type ProgressPeriod = '30d' | '60d' | '90d' | '6m' | '1y' | 'custom';
export type ProgressBucket = 'day' | 'week' | 'month';

export interface ProgressSummary {
  sessions: number;
  trainingDays: number;
  durationMinutes: number;
  averageDurationMinutes: number;
  sets: number;
  reps: number;
  volumeKg: number;
  timedMinutes: number;
  uniqueExercises: number;
}

export interface ProgressSeriesPoint {
  bucketStart: string;
  sessions: number;
  durationMinutes: number;
  sets: number;
  reps: number;
  volumeKg: number;
  timedMinutes: number;
}

export interface ProgressExerciseOption {
  id: string;
  name: string;
  nameEn?: string;
  sessions: number;
  lastPerformedAt: string;
}

export interface ProgressOverview {
  summary: ProgressSummary;
  previousSummary: ProgressSummary;
  series: ProgressSeriesPoint[];
  exercises: ProgressExerciseOption[];
}

export interface ExerciseProgressPoint {
  bucketStart: string;
  sessions: number;
  sets: number;
  maxWeight: number;
  maxReps: number;
  volumeKg: number;
  estimatedOneRepMax: number;
  adherencePercent: number | null;
}

export interface ProgressActivityDay {
  date: string;
  sessions: number;
  volumeKg: number;
  durationMinutes: number;
}

export interface ProgressRoutineDay {
  routineId: string;
  routineName: string;
  dayKey: string;
  dayType: 'core' | 'weekday';
  dayNumber: number | null;
  dayTitle: string | null;
  sessions: number;
  sets: number;
  exercises: number;
  volumeKg: number;
  lastPerformedAt: string;
}

export type ProgressRecordKind = 'heaviest_set' | 'most_reps' | 'largest_session_volume' | 'longest_session';

export interface ProgressRecord {
  kind: ProgressRecordKind;
  value: number;
  unit: 'kg' | 'reps' | 'minutes';
  achievedAt: string;
  exerciseId?: string;
  exerciseName?: string;
  exerciseNameEn?: string;
}

export interface ProgressEstimatedMax {
  exerciseId: string;
  exerciseName: string;
  exerciseNameEn?: string;
  estimatedOneRepMax: number;
  weight: number;
  reps: number;
  achievedAt: string;
}

export interface ProgressInsights {
  activity: ProgressActivityDay[];
  routineDays: ProgressRoutineDay[];
  records: ProgressRecord[];
  estimatedMaxes: ProgressEstimatedMax[];
}
