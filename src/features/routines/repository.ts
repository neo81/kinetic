import { supabase } from '../../lib/supabase/client';
import type { Database } from '../../lib/supabase/database.types';
import type { Exercise, Routine, CompletedSession, UserGoals, WeeklyStats, DashboardData } from '../../types';
import { mapSupabaseErrorCode, RoutineRepositoryError } from './errors';
import { loadCachedRoutines, saveCachedRoutines } from './localRoutineCache';
import { syncQueue } from '../../services/syncQueue';

type RoutineRow = Database['public']['Tables']['routines']['Row'];
type RoutineDayRow = Database['public']['Tables']['routine_days']['Row'];
type RoutineDayExerciseRow = Database['public']['Tables']['routine_day_exercises']['Row'];
type ExerciseRow = Database['public']['Tables']['exercises']['Row'];
type MuscleGroupRow = Database['public']['Tables']['muscle_groups']['Row'];
type ExerciseSetRow = Database['public']['Tables']['exercise_sets']['Row'];

type RoutineQueryRow = RoutineRow & {
  routine_days?: Array<
    RoutineDayRow & {
      routine_day_exercises?: Array<
        RoutineDayExerciseRow & {
          exercises?: (ExerciseRow & {
            muscle_groups?: MuscleGroupRow | null;
          }) | null;
          exercise_sets?: ExerciseSetRow[];
        }
      >;
    }
  >;
};

type SaveRoutineInput = {
  name: string;
  days: number[];
  focus?: string;
  notes?: string;
};

type RoutineDayInput = {
  id?: string;
  dayType: 'core' | 'weekday';
  dayNumber: number | null;
  title: string;
  position: number;
  exercises: Routine['dayEntries'][number]['exercises'];
};

type RepositoryNotice = {
  level: 'warning';
  title: string;
  message: string;
};

let localRoutines: Routine[] = [];
let lastRepositoryNotice: RepositoryNotice | null = null;

const setRepositoryNotice = (notice: RepositoryNotice) => {
  lastRepositoryNotice = notice;
};

export const consumeRoutinesRepositoryNotice = (): RepositoryNotice | null => {
  const notice = lastRepositoryNotice;
  lastRepositoryNotice = null;
  return notice;
};

const ensureHydratedFromStorage = () => {
  if (localRoutines.length > 0) {
    return;
  }
  localRoutines = loadCachedRoutines();
};

const commitLocalRoutines = (next: Routine[]) => {
  localRoutines = next;
  saveCachedRoutines(localRoutines);
};

const mergeRemoteWithPendingLocal = (remote: Routine[], previousLocal: Routine[]): Routine[] => {
  const byId = new Map<string, Routine>();
  for (const routine of remote) {
    byId.set(routine.id, routine);
  }
  for (const routine of previousLocal) {
    if (routine.syncPending) {
      byId.set(routine.id, routine);
    }
  }
  return [...byId.values()].sort((a, b) => {
    if (!!a.syncPending !== !!b.syncPending) {
      return a.syncPending ? -1 : 1;
    }
    const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return tb - ta;
  });
};

const buildFrequencyLabel = (days: number[]) =>
  `${Math.max(days.length, 1)} vez${days.length === 1 ? '' : 'es'} / semana`;

const flattenRoutineExercises = (routine: Routine) =>
  (routine.dayEntries ?? []).flatMap((day) => day.exercises.map((entry) => entry.exercise));

const normalizeDayExercises = (exercises: Routine['dayEntries'][number]['exercises']) =>
  exercises.map((item, index) => ({
    ...item,
    position: index + 1,
  }));

const normalizeRoutineDayEntries = (dayEntries: Routine['dayEntries'] = []) => {
  const sorted = [...dayEntries].sort((left, right) => left.position - right.position);
  const coreDays = sorted
    .filter((day) => day.dayType === 'core')
    .map((day) => ({
      ...day,
      position: 0,
      title: day.title || 'Core',
      exercises: normalizeDayExercises(day.exercises),
    }));

  const weekdayDays = sorted
    .filter((day) => day.dayType === 'weekday')
    .sort((left, right) => (left.dayNumber ?? 0) - (right.dayNumber ?? 0))
    .map((day, index) => ({
      ...day,
      position: index + 1,
      title: day.title || `Dia ${day.dayNumber}`,
      exercises: normalizeDayExercises(day.exercises),
    }));

  return [...coreDays, ...weekdayDays];
};

const applyRoutineDerivedFields = (routine: Routine): Routine => {
  const dayEntries = normalizeRoutineDayEntries(routine.dayEntries);
  const weekdayDays = dayEntries.filter((day) => day.dayType === 'weekday');

  return {
    ...routine,
    dayEntries,
    days: weekdayDays
      .map((day) => day.dayNumber)
      .filter((dayNumber): dayNumber is number => typeof dayNumber === 'number'),
    frequency: buildFrequencyLabel(
      weekdayDays
        .map((day) => day.dayNumber)
        .filter((dayNumber): dayNumber is number => typeof dayNumber === 'number'),
    ),
    focus: dayEntries.find((day) => day.dayType === 'core')?.title || weekdayDays[0]?.title || '',
    exercises: dayEntries.flatMap((day) => day.exercises.map((entry) => entry.exercise)),
  };
};

const buildRoutineDayInputs = (
  currentRoutine: Routine | null,
  input: SaveRoutineInput,
): RoutineDayInput[] => {
  const sortedDays = [...input.days].sort((left, right) => left - right);
  const currentDayEntries = currentRoutine?.dayEntries ?? [];
  const currentCoreDay = currentDayEntries.find((day) => day.dayType === 'core');
  const shouldIncludeCore = !!currentCoreDay || input.focus?.toLowerCase() === 'dia core';

  return [
    ...(shouldIncludeCore
      ? [
          {
            id: currentCoreDay?.id,
            dayType: 'core' as const,
            dayNumber: null,
            title: 'Core',
            position: 0,
            exercises: currentCoreDay?.exercises ?? [],
          },
        ]
      : []),
    ...sortedDays.map((dayNumber, index) => {
      const existingDay = currentDayEntries.find(
        (day) => day.dayType === 'weekday' && day.dayNumber === dayNumber,
      );

      return {
        id: existingDay?.id,
        dayType: 'weekday' as const,
        dayNumber,
        title: `Dia ${dayNumber}`,
        position: index + 1,
        exercises: existingDay?.exercises ?? [],
      };
    }),
  ];
};

const buildRoutineFallback = (
  currentRoutine: Routine | null,
  input: SaveRoutineInput,
): Routine => {
  const dayEntries = buildRoutineDayInputs(currentRoutine, input).map((day) => ({
    id: day.id ?? crypto.randomUUID(),
    dayType: day.dayType,
    dayNumber: day.dayNumber,
    title: day.title,
    position: day.position,
    exercises: day.exercises,
  }));

  const routine: Routine = currentRoutine
    ? {
        ...currentRoutine,
        name: input.name,
        days: [...input.days].sort((left, right) => left - right),
        focus: input.focus || currentRoutine.focus,
        frequency: buildFrequencyLabel(input.days),
        notes: input.notes,
        syncPending: true,
        dayEntries,
        updatedAt: new Date().toISOString(),
      }
    : {
        id: crypto.randomUUID(),
        name: input.name,
        frequency: buildFrequencyLabel(input.days),
        days: [...input.days].sort((left, right) => left - right),
        focus: input.focus || '',
        exercises: [],
        notes: input.notes,
        syncPending: true,
        dayEntries,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  return applyRoutineDerivedFields(routine);
};

const mapExercise = (
  routineExercise: RoutineDayExerciseRow & {
    exercises?: (ExerciseRow & { muscle_groups?: MuscleGroupRow | null }) | null;
    exercise_sets?: ExerciseSetRow[];
  },
): Exercise => ({
  id: routineExercise.exercises?.id || routineExercise.exercise_id,
  name: routineExercise.exercises?.name || 'Ejercicio sin nombre',
  description: (routineExercise.exercises as any)?.description || undefined,
  muscleGroup: routineExercise.exercises?.muscle_groups?.name || 'Sin grupo',
  measureUnit: (routineExercise as any).measure_unit || 'kg',
  sets:
    routineExercise.exercise_sets?.map((set) => ({
      setNumber: set.set_number,
      reps: Number(set.reps ?? 0),
      weight: Number(set.weight ?? 0),
      durationMinutes: Number(set.duration_minutes ?? 0),
      durationSeconds: Number(set.duration_seconds ?? 0),
      notes: set.notes ?? undefined,
    })) ?? [],
  notes: routineExercise.notes ?? undefined,
});

const mapRoutine = (row: RoutineQueryRow): Routine => {
  const routineDays = (row.routine_days ?? []).sort((left, right) => left.position - right.position);
  const weekdayNumbers = routineDays
    .filter((day) => day.day_type === 'weekday' && typeof day.day_number === 'number')
    .map((day) => day.day_number as number);

  const flattenedExercises = routineDays.flatMap((day) =>
    (day.routine_day_exercises ?? [])
      .sort((left, right) => left.position - right.position)
      .map(mapExercise),
  );

  return {
    id: row.id,
    name: row.name,
    frequency: buildFrequencyLabel(weekdayNumbers),
    days: weekdayNumbers,
    focus: routineDays[0]?.title || '',
    exercises: flattenedExercises,
    notes: row.notes ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dayEntries: routineDays.map((day) => ({
      id: day.id,
      dayType: day.day_type,
      dayNumber: day.day_number,
      title:
        day.title ||
        (day.day_type === 'core'
          ? 'Core'
          : `Dia ${day.day_number}`),
      position: day.position,
      exercises: (day.routine_day_exercises ?? [])
        .sort((left, right) => left.position - right.position)
        .map((routineExercise) => ({
          id: routineExercise.id,
          exerciseId: routineExercise.exercise_id,
          exercise: mapExercise(routineExercise),
          position: routineExercise.position,
          restSeconds: routineExercise.rest_seconds,
          notes: routineExercise.notes,
        })),
    })),
    syncPending: false,
  };
};

const syncExerciseSets = async (
  routineDayExerciseId: string,
  sets: Exercise['sets'],
) => {
  if (!supabase) {
    return;
  }

  const { error: deleteSetsError } = await supabase
    .from('exercise_sets')
    .delete()
    .eq('routine_day_exercise_id', routineDayExerciseId);

  if (deleteSetsError) {
    throw new RoutineRepositoryError(
      mapSupabaseErrorCode(deleteSetsError.message),
      'No se pudieron actualizar las series del ejercicio.',
      { cause: deleteSetsError },
    );
  }

  if (sets.length === 0) {
    return;
  }

  const setRows: Database['public']['Tables']['exercise_sets']['Insert'][] = sets.map((set, index) => ({
    routine_day_exercise_id: routineDayExerciseId,
    set_number: set.setNumber ?? index + 1,
    reps: set.reps,
    weight: set.weight,
    duration_minutes: set.durationMinutes ?? null,
    duration_seconds: set.durationSeconds ?? null,
    notes: set.notes ?? null,
  }));

  const { error: insertSetsError } = await supabase.from('exercise_sets').insert(setRows);
  if (insertSetsError) {
    throw new RoutineRepositoryError(
      mapSupabaseErrorCode(insertSetsError.message),
      'No se pudieron guardar las series del ejercicio.',
      { cause: insertSetsError },
    );
  }
};

const syncRoutineDayExercises = async (
  routineDayId: string,
  exercises: Routine['dayEntries'][number]['exercises'],
) => {
  if (!supabase) {
    return;
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from('routine_day_exercises')
    .select('id')
    .eq('routine_day_id', routineDayId);

  if (existingRowsError) {
    throw new RoutineRepositoryError(
      mapSupabaseErrorCode(existingRowsError.message),
      'No se pudieron cargar los ejercicios del dia.',
      { cause: existingRowsError },
    );
  }

  const desiredIds = new Set(exercises.map((item) => item.id));
  const removableIds = (existingRows ?? [])
    .map((row) => row.id)
    .filter((id) => !desiredIds.has(id));

  if (removableIds.length > 0) {
    const { error: deleteRowsError } = await supabase
      .from('routine_day_exercises')
      .delete()
      .in('id', removableIds);

    if (deleteRowsError) {
      throw new RoutineRepositoryError(
        mapSupabaseErrorCode(deleteRowsError.message),
        'No se pudieron quitar ejercicios eliminados del dia.',
        { cause: deleteRowsError },
      );
    }
  }

  for (const [index, item] of exercises.entries()) {
    const payload: Database['public']['Tables']['routine_day_exercises']['Insert'] = {
      id: item.id,
      routine_day_id: routineDayId,
      exercise_id: item.exerciseId,
      position: index + 1,
      rest_seconds: item.restSeconds ?? null,
      notes: item.notes ?? item.exercise.notes ?? null,
      measure_unit: (item.exercise.measureUnit ?? 'kg') as any,
    };

    const { data: savedRow, error: upsertRowError } = await supabase
      .from('routine_day_exercises')
      .upsert(payload)
      .select('id')
      .single();

    if (upsertRowError || !savedRow) {
      throw new RoutineRepositoryError(
        mapSupabaseErrorCode(upsertRowError?.message),
        'No se pudo guardar un ejercicio del dia.',
        { cause: upsertRowError ?? undefined },
      );
    }

    await syncExerciseSets(savedRow.id, item.exercise.sets);
  }
};

const listSupabaseRoutines = async (): Promise<Routine[] | null> => {
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new RoutineRepositoryError(
      'SUPABASE_AUTH',
      'No se pudo validar la sesion de usuario.',
      { cause: userError },
    );
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('routines')
    .select(
      `
        id,
        user_id,
        name,
        notes,
        is_active,
        created_at,
        updated_at,
        routine_days (
          id,
          routine_id,
          day_type,
          day_number,
          title,
          position,
          created_at,
          routine_day_exercises (
            id,
            routine_day_id,
            exercise_id,
            position,
            rest_seconds,
            notes,
            measure_unit,
            created_at,
            exercises (
              id,
              name,
              description,
              muscle_group_id,
              equipment,
              is_active,
              created_at,
              muscle_groups (
                id,
                code,
                name,
                body_side,
                sort_order
              )
            ),
            exercise_sets (
              id,
              routine_day_exercise_id,
              set_number,
              reps,
              weight,
              duration_minutes,
              duration_seconds,
              notes,
              created_at
            )
          )
        )
      `,
    )
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error al cargar rutinas desde Supabase:', error.message);
    throw new RoutineRepositoryError(
      mapSupabaseErrorCode(error.message),
      'No se pudieron cargar las rutinas remotas.',
      { cause: error },
    );
  }

  return (data as unknown as RoutineQueryRow[]).map(mapRoutine);
};

const saveSupabaseRoutine = async (
  currentRoutine: Routine | null,
  input: SaveRoutineInput,
): Promise<Routine | null> => {
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new RoutineRepositoryError(
      'SUPABASE_AUTH',
      'No se pudo validar la sesion de usuario.',
      { cause: userError },
    );
  }

  if (!user) {
    return null;
  }

  const routinePayload = {
    user_id: user.id,
    name: input.name,
    notes: input.notes ?? null,
  };

  const upsertPayload = currentRoutine
    ? { ...routinePayload, id: currentRoutine.id }
    : routinePayload;

  const { data: routineRow, error: routineError } = await supabase
    .from('routines')
    .upsert(upsertPayload)
    .select('id, user_id, name, notes, is_active, created_at, updated_at')
    .single();

  if (routineError || !routineRow) {
    console.error('Error al guardar rutina en Supabase:', routineError?.message);
    throw new RoutineRepositoryError(
      mapSupabaseErrorCode(routineError?.message),
      'No se pudo guardar la rutina en el servidor.',
      { cause: routineError ?? undefined },
    );
  }

  const routineId = routineRow.id;
  const desiredDays = buildRoutineDayInputs(currentRoutine, input);

  const { data: existingDays, error: existingDaysError } = await supabase
    .from('routine_days')
    .select('id')
    .eq('routine_id', routineId);

  if (existingDaysError) {
    throw new RoutineRepositoryError(
      mapSupabaseErrorCode(existingDaysError.message),
      'No se pudieron cargar los dias actuales de la rutina.',
      { cause: existingDaysError },
    );
  }

  const desiredDayIds = new Set(desiredDays.flatMap((day) => (day.id ? [day.id] : [])));
  const removableDayIds = (existingDays ?? [])
    .map((day) => day.id)
    .filter((id) => !desiredDayIds.has(id));

  if (removableDayIds.length > 0) {
    const { error: deleteDaysError } = await supabase.from('routine_days').delete().in('id', removableDayIds);
    if (deleteDaysError) {
      throw new RoutineRepositoryError(
        mapSupabaseErrorCode(deleteDaysError.message),
        'No se pudieron eliminar dias removidos de la rutina.',
        { cause: deleteDaysError },
      );
    }
  }

  for (const day of desiredDays) {
    const dayPayload: Database['public']['Tables']['routine_days']['Insert'] = {
      id: day.id,
      routine_id: routineId,
      day_type: day.dayType,
      day_number: day.dayNumber,
      title: day.title,
      position: day.position,
    };

    const { data: savedDay, error: upsertDayError } = await supabase
      .from('routine_days')
      .upsert(dayPayload)
      .select('id')
      .single();

    if (upsertDayError || !savedDay) {
      throw new RoutineRepositoryError(
        mapSupabaseErrorCode(upsertDayError?.message),
        'No se pudo guardar un dia de la rutina.',
        { cause: upsertDayError ?? undefined },
      );
    }

    await syncRoutineDayExercises(savedDay.id, day.exercises);
  }

  const routines = await listSupabaseRoutines();
  return routines?.find((routine) => routine.id === routineId) ?? null;
};

const fetchCompletedSessions = async (userId: string): Promise<CompletedSession[]> => {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('routine_sessions')
      .select(`
        id,
        started_at,
        ended_at,
        routines (
          name
        ),
        session_day_logs (
          id,
          routine_day_id,
          routine_days (
            day_type,
            day_number
          ),
          session_exercise_logs (
            id,
            session_set_logs (
              reps,
              weight,
              duration_minutes,
              duration_seconds
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('ended_at', { ascending: false });

    if (error) {
      console.error('Error fetching completed sessions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Process and aggregate session data
    const sessions: CompletedSession[] = data.map((session: any) => {
      const startDate = new Date(session.started_at);
      const endDate = new Date(session.ended_at);
      const durationMs = endDate.getTime() - startDate.getTime();

      const dayLogs = session.session_day_logs || [];
      const dayCount = dayLogs.length;

      // Build day info string (e.g., "Core + Día 1", "Día 1, Día 2")
      const dayNames = dayLogs
        .map((dayLog: any) => {
          if (dayLog.routine_days?.day_type === 'core') {
            return '⚡ Core';
          }
          const dayNum = dayLog.routine_days?.day_number ?? 0;
          return `Día ${dayNum}`;
        })
        .join(', ');

      // Count exercises and calculate total volume (weight and time)
      let exerciseCount = 0;
      let totalVolumeWeight = 0;
      let totalVolumeMinutes = 0;

      dayLogs.forEach((dayLog: any) => {
        const exercises = dayLog.session_exercise_logs || [];
        exerciseCount += exercises.length;

        exercises.forEach((exercise: any) => {
          const sets = exercise.session_set_logs || [];
          sets.forEach((set: any) => {
            // Weight-based exercises (reps × weight)
            const reps = Number(set.reps ?? 0);
            const weight = Number(set.weight ?? 0);
            if (weight > 0) {
              totalVolumeWeight += reps * weight;
            }

            // Time-based exercises (duration in minutes)
            const durationMinutes = Number(set.duration_minutes ?? 0);
            const durationSeconds = Number(set.duration_seconds ?? 0);
            totalVolumeMinutes += durationMinutes + durationSeconds / 60;
          });
        });
      });

      return {
        id: session.id,
        routineName: session.routines?.name || 'Rutina sin nombre',
        endedAt: endDate,
        startedAt: startDate,
        durationMs,
        dayCount,
        dayInfo: dayNames || `${dayCount} días`,
        exerciseCount,
        totalVolume: totalVolumeWeight, // For backward compatibility
        totalVolumeWeight,
        totalVolumeMinutes,
      };
    });

    return sessions;
  } catch (error) {
    console.error('Error in fetchCompletedSessions:', error);
    return [];
  }
};

// Helper function to calculate percentage change between two values
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

// Helper function to calculate progress toward a goal (0-100)
const calculateProgressToGoal = (current: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
};

// Get user's weekly goals (with defaults if not set)
const fetchUserGoals = async (userId: string): Promise<UserGoals> => {
  if (!supabase) {
    return {
      weeklyVolumeTarget: 20000,
      weeklyExercisesTarget: 30,
      weeklyDurationTarget: 300,
    };
  }

  try {
    const { data, error } = await supabase
      .from('user_goals')
      .select('weekly_volume_target, weekly_exercises_target, weekly_duration_target')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      // Return defaults if not found
      return {
        weeklyVolumeTarget: 20000,
        weeklyExercisesTarget: 30,
        weeklyDurationTarget: 300,
      };
    }

    return {
      weeklyVolumeTarget: Number(data.weekly_volume_target) || 20000,
      weeklyExercisesTarget: data.weekly_exercises_target || 30,
      weeklyDurationTarget: data.weekly_duration_target || 300,
    };
  } catch (error) {
    console.error('Error fetching user goals:', error);
    return {
      weeklyVolumeTarget: 20000,
      weeklyExercisesTarget: 30,
      weeklyDurationTarget: 300,
    };
  }
};

// Calculate weekly statistics for a given week (weekOffset: 0 = this week, -1 = last week)
const calculateWeeklyStats = (sessions: CompletedSession[], weekOffset: number = 0): WeeklyStats => {
  const now = new Date();
  const startOfCurrentWeek = new Date(now);
  startOfCurrentWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfCurrentWeek.setHours(0, 0, 0, 0);

  const weekStart = new Date(startOfCurrentWeek);
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Filter sessions for the target week
  const weekSessions = sessions.filter(sess => {
    const sessDate = new Date(sess.endedAt);
    return sessDate >= weekStart && sessDate < weekEnd;
  });

  // Aggregate stats
  let totalVolume = 0;
  let totalVolumeMinutes = 0;
  let totalExercises = 0;
  let totalDuration = 0;

  weekSessions.forEach(session => {
    totalVolume += session.totalVolumeWeight;
    totalVolumeMinutes += session.totalVolumeMinutes;
    totalExercises += session.exerciseCount;
    totalDuration += session.durationMs / (1000 * 60); // Convert to minutes
  });

  return {
    volume: totalVolume,
    volumeMinutes: totalVolumeMinutes,
    exercises: totalExercises,
    sessions: weekSessions.length,
    avgDuration: weekSessions.length > 0 ? Math.round(totalDuration / weekSessions.length) : 0,
    changeVsLastWeek: { volumeChange: 0, exerciseChange: 0, durationChange: 0 }, // Will be filled in comparison
  };
};

export const routinesRepository = {
  async list(): Promise<Routine[]> {
    ensureHydratedFromStorage();
    try {
      const routines = await listSupabaseRoutines();
      if (routines !== null) {
        const merged = mergeRemoteWithPendingLocal(routines, localRoutines);
        commitLocalRoutines(merged);
        return merged;
      }
    } catch (error) {
      ensureHydratedFromStorage();
      if (localRoutines.length === 0) {
        throw error;
      }

      console.error('Fallo la sincronizacion remota, usando cache local:', error);
      setRepositoryNotice({
        level: 'warning',
        title: 'Sincronizacion parcial',
        message: 'No se pudo conectar al servidor. Se muestran datos locales.',
      });
    }

    return localRoutines;
  },

  async saveRoutine(currentRoutine: Routine | null, input: SaveRoutineInput, shouldSync = true): Promise<Routine> {
    try {
      if (shouldSync) {
        const savedRoutine = await saveSupabaseRoutine(currentRoutine, input);
        if (savedRoutine) {
          const next = localRoutines.some((routine) => routine.id === savedRoutine.id)
            ? localRoutines.map((routine) => (routine.id === savedRoutine.id ? savedRoutine : routine))
            : [savedRoutine, ...localRoutines];
          commitLocalRoutines(next);
          return savedRoutine;
        }
      }
    } catch (error) {
      console.error('Fallo el guardado remoto, usando almacenamiento local:', error);
      setRepositoryNotice({
        level: 'warning',
        title: 'Guardado local',
        message: 'Se guardo en este dispositivo. Se sincronizara cuando haya conexion.',
      });
    }

    const fallbackRoutine = buildRoutineFallback(currentRoutine, input);

    const nextLocal = currentRoutine
      ? localRoutines.map((routine) => (routine.id === fallbackRoutine.id ? fallbackRoutine : routine))
      : [fallbackRoutine, ...localRoutines];
    commitLocalRoutines(nextLocal);

    return fallbackRoutine;
  },

  async saveExercise(currentRoutine: Routine, exercise: Exercise, routineDayId: string, instanceId?: string): Promise<Routine> {
    const updatedDayEntries = (currentRoutine.dayEntries ?? []).map((day) => {
      if (day.id !== routineDayId) {
        return day;
      }

      // Si existe instanceId, buscamos para actualizar en lugar de añadir
      const existingIndex = instanceId 
        ? day.exercises.findIndex(ex => ex.id === instanceId)
        : -1;

      let newExercises = [...day.exercises];
      if (existingIndex >= 0) {
        // Actualizar existente
        newExercises[existingIndex] = {
          ...newExercises[existingIndex],
          exercise,
        };
      } else {
        // Añadir nuevo
        newExercises.push({
          id: crypto.randomUUID(),
          exerciseId: exercise.id,
          exercise,
          position: day.exercises.length + 1,
        });
      }

      return {
        ...day,
        exercises: newExercises,
      };
    });

    const updatedRoutine: Routine = {
      ...currentRoutine,
      dayEntries: updatedDayEntries,
      updatedAt: new Date().toISOString(),
    };
    const normalizedRoutine = applyRoutineDerivedFields(updatedRoutine);

    if (supabase && !normalizedRoutine.syncPending) {
      const targetDay = normalizedRoutine.dayEntries?.find((day) => day.id === routineDayId);
      if (targetDay) {
        const targetItem = instanceId
          ? targetDay.exercises.find((item) => item.id === instanceId)
          : targetDay.exercises[targetDay.exercises.length - 1];

        if (targetItem) {
          const payload: Database['public']['Tables']['routine_day_exercises']['Insert'] = {
            id: targetItem.id,
            routine_day_id: routineDayId,
            exercise_id: targetItem.exerciseId,
            position: targetItem.position,
            rest_seconds: targetItem.restSeconds ?? null,
            notes: targetItem.notes ?? targetItem.exercise.notes ?? null,
            measure_unit: (targetItem.exercise.measureUnit ?? 'kg') as any,
          };

          const { data: savedRow, error: upsertRowError } = await supabase
            .from('routine_day_exercises')
            .upsert(payload)
            .select('id')
            .single();

          if (upsertRowError || !savedRow) {
            throw new RoutineRepositoryError(
              mapSupabaseErrorCode(upsertRowError?.message),
              'No se pudo guardar el ejercicio en el servidor.',
              { cause: upsertRowError ?? undefined },
            );
          }

          await syncExerciseSets(savedRow.id, targetItem.exercise.sets);
        }
      }
    }

    commitLocalRoutines(
      localRoutines.map((routine) =>
        routine.id === normalizedRoutine.id ? normalizedRoutine : routine,
      ),
    );

    return normalizedRoutine;
  },

  async deleteRoutine(routineId: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('routines').delete().eq('id', routineId);
      if (error) {
        console.error('Error al borrar rutina:', error);
        throw new RoutineRepositoryError(
          mapSupabaseErrorCode(error.message),
          'No se pudo borrar la rutina remotamente.',
          { cause: error },
        );
      }
    }
    const nextLocal = localRoutines.filter((r) => r.id !== routineId);
    commitLocalRoutines(nextLocal);
  },

  async deleteRoutineDay(routineId: string, routineDayId: string): Promise<Routine> {
    if (supabase) {
      const { error } = await supabase.from('routine_days').delete().eq('id', routineDayId);
      if (error) {
        console.error('Error al borrar dia de rutina:', error);
        throw new RoutineRepositoryError(
          mapSupabaseErrorCode(error.message),
          'No se pudo borrar el dia remotamente.',
          { cause: error },
        );
      }
    }
    
    const targetRoutine = localRoutines.find((r) => r.id === routineId);
    if (!targetRoutine) {
      throw new Error('Rutina no encontrada en cache.');
    }

    const nextDays = (targetRoutine.dayEntries ?? []).filter((d) => d.id !== routineDayId);
    const updatedRoutine = applyRoutineDerivedFields({
      ...targetRoutine,
      dayEntries: nextDays,
      updatedAt: new Date().toISOString(),
    });

    commitLocalRoutines(localRoutines.map((r) => (r.id === routineId ? updatedRoutine : r)));
    return updatedRoutine;
  },

  async deleteExercise(routineId: string, dayId: string, exerciseId: string): Promise<Routine> {
    if (supabase) {
      const { error } = await supabase.from('routine_day_exercises').delete().eq('id', exerciseId);
      if (error) {
        console.error('Error al borrar ejercicio de rutina:', error);
        throw new RoutineRepositoryError(
          mapSupabaseErrorCode(error.message),
          'No se pudo borrar el ejercicio remotamente.',
          { cause: error },
        );
      }
    }

    const targetRoutine = localRoutines.find((r) => r.id === routineId);
    if (!targetRoutine) {
      throw new Error('Rutina no encontrada en cache.');
    }

    const updatedDayEntries = (targetRoutine.dayEntries ?? []).map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: normalizeDayExercises(day.exercises.filter((ex) => ex.id !== exerciseId)),
      };
    });

    const updatedRoutine = applyRoutineDerivedFields({
      ...targetRoutine,
      dayEntries: updatedDayEntries,
      updatedAt: new Date().toISOString(),
    });

    commitLocalRoutines(localRoutines.map((r) => (r.id === routineId ? updatedRoutine : r)));
    return updatedRoutine;
  },

  async getCompletedSessions(userId: string): Promise<CompletedSession[]> {
    return fetchCompletedSessions(userId);
  },

  async getUserGoals(userId: string): Promise<UserGoals> {
    return fetchUserGoals(userId);
  },

  async getDashboardData(userId: string): Promise<DashboardData> {
    try {
      const allSessions = await fetchCompletedSessions(userId);
      const goals = await fetchUserGoals(userId);

      // Calculate this week and last week stats
      const thisWeek = calculateWeeklyStats(allSessions, 0);
      const lastWeek = calculateWeeklyStats(allSessions, -1);

      // Calculate percentage changes
      thisWeek.changeVsLastWeek.volumeChange = calculatePercentageChange(thisWeek.volume, lastWeek.volume);
      thisWeek.changeVsLastWeek.exerciseChange = calculatePercentageChange(thisWeek.exercises, lastWeek.exercises);
      thisWeek.changeVsLastWeek.durationChange = calculatePercentageChange(thisWeek.avgDuration, lastWeek.avgDuration);

      return {
        thisWeek,
        lastWeek,
        goals,
      };
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      // Return default empty structure
      return {
        thisWeek: {
          volume: 0,
          volumeMinutes: 0,
          exercises: 0,
          sessions: 0,
          avgDuration: 0,
          changeVsLastWeek: { volumeChange: 0, exerciseChange: 0, durationChange: 0 },
        },
        lastWeek: {
          volume: 0,
          volumeMinutes: 0,
          exercises: 0,
          sessions: 0,
          avgDuration: 0,
          changeVsLastWeek: { volumeChange: 0, exerciseChange: 0, durationChange: 0 },
        },
        goals: {
          weeklyVolumeTarget: 20000,
          weeklyExercisesTarget: 30,
          weeklyDurationTarget: 300,
        },
      };
    }
  },

  async saveUserGoals(userId: string, goals: Partial<UserGoals>): Promise<UserGoals> {
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    try {
      const payload: any = {
        user_id: userId,
      };

      if (goals.weeklyVolumeTarget !== undefined) {
        payload.weekly_volume_target = goals.weeklyVolumeTarget;
      }
      if (goals.weeklyExercisesTarget !== undefined) {
        payload.weekly_exercises_target = goals.weeklyExercisesTarget;
      }
      if (goals.weeklyDurationTarget !== undefined) {
        payload.weekly_duration_target = goals.weeklyDurationTarget;
      }

      const { data, error } = await supabase
        .from('user_goals')
        .upsert(payload)
        .select('weekly_volume_target, weekly_exercises_target, weekly_duration_target')
        .maybeSingle();

      if (error) {
        console.error('Error saving user goals:', error);
        throw error;
      }

      if (!data) {
        console.error('No data returned from saveUserGoals upsert');
        throw new Error('No se pudo guardar los objetivos');
      }

      return {
        weeklyVolumeTarget: Number(data.weekly_volume_target) || 20000,
        weeklyExercisesTarget: data.weekly_exercises_target || 30,
        weeklyDurationTarget: data.weekly_duration_target || 300,
      };
    } catch (error) {
      console.error('Error in saveUserGoals:', error);
      throw error;
    }
  },

  /**
   * SYNC QUEUE HANDLERS
   * These are called by the sync processor to handle queued operations
   */

  async handleRoutineSaveSync(payload: any): Promise<void> {
    const { routine, input } = payload;
    console.log('[repository] Syncing routine save:', routine.id);

    // Re-attempt the save
    // Note: We don't throw errors here - the sync processor expects them
    // But we still need to await and let errors propagate
    await saveSupabaseRoutine(routine, input);
  },

  async handleSessionEndSync(payload: any): Promise<void> {
    // This will be handled differently since session end requires special logic
    // For now, just log
    console.log('[repository] Session end sync not implemented via queue yet');
    throw new Error('Session end sync requires direct implementation in useAppState');
  },

  async handleGoalsUpdateSync(payload: any): Promise<void> {
    const { userId, goals } = payload;
    console.log('[repository] Syncing goals update:', userId);

    await this.saveUserGoals(userId, goals);
  },

  async handleProfileUpdateSync(payload: any): Promise<void> {
    // This will be implemented when profile sync is added
    console.log('[repository] Profile update sync not fully implemented yet');
    throw new Error('Profile sync not implemented');
  },
};
