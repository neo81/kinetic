import { supabase } from '../../lib/supabase/client';
import type { Database } from '../../lib/supabase/database.types';
import type { Exercise, Routine } from '../../types';
import { mapSupabaseErrorCode, RoutineRepositoryError } from './errors';
import { loadCachedRoutines, saveCachedRoutines } from './localRoutineCache';

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

  return (data as RoutineQueryRow[]).map(mapRoutine);
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

  await supabase.from('routine_days').delete().eq('routine_id', routineId);

  const sortedDays = [...input.days].sort((left, right) => left - right);
  const dayRows: Database['public']['Tables']['routine_days']['Insert'][] = sortedDays.map((dayNumber, index) => ({
    routine_id: routineId,
    day_type: 'weekday',
    day_number: dayNumber,
    title: `Dia ${dayNumber}`,
    position: index + 1,
  }));

  if (input.focus?.toLowerCase() === 'dia core') {
    dayRows.unshift({
      routine_id: routineId,
      day_type: 'core',
      day_number: null,
      title: 'Core',
      position: 0,
    });
  }

  if (dayRows.length > 0) {
    const { error: daysError } = await supabase.from('routine_days').insert(dayRows);
    if (daysError) {
      console.error('Error al guardar dias de rutina en Supabase:', daysError.message);
      throw new RoutineRepositoryError(
        mapSupabaseErrorCode(daysError.message),
        'No se pudieron guardar los dias de la rutina en el servidor.',
        { cause: daysError },
      );
    }
  }

  const routines = await listSupabaseRoutines();
  return routines?.find((routine) => routine.id === routineId) ?? null;
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

    const fallbackRoutine: Routine = currentRoutine
      ? {
          ...currentRoutine,
          name: input.name,
          days: [...input.days].sort((left, right) => left - right),
          focus: input.focus || currentRoutine.focus,
          frequency: buildFrequencyLabel(input.days),
          notes: input.notes,
          syncPending: true,
          dayEntries: [
            ...(input.focus?.toLowerCase() === 'dia core'
              ? [
                  {
                    id: currentRoutine.dayEntries?.find((day) => day.dayType === 'core')?.id || crypto.randomUUID(),
                    dayType: 'core' as const,
                    dayNumber: null,
                    title: 'Core',
                    position: 0,
                    exercises: currentRoutine.dayEntries?.find((day) => day.dayType === 'core')?.exercises || [],
                  },
                ]
              : []),
            ...[...input.days]
              .sort((left, right) => left - right)
              .map((dayNumber, index) => {
                const existingDay = currentRoutine.dayEntries?.find(
                  (day) => day.dayType === 'weekday' && day.dayNumber === dayNumber,
                );

                return {
                  id: existingDay?.id || crypto.randomUUID(),
                  dayType: 'weekday' as const,
                  dayNumber,
                  title: `Dia ${dayNumber}`,
                  position: index + 1,
                  exercises: existingDay?.exercises || [],
                };
              }),
          ],
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
          dayEntries: [
            ...(input.focus?.toLowerCase() === 'dia core'
              ? [
                  {
                    id: crypto.randomUUID(),
                    dayType: 'core' as const,
                    dayNumber: null,
                    title: 'Core',
                    position: 0,
                    exercises: [],
                  },
                ]
              : []),
            ...[...input.days]
              .sort((left, right) => left - right)
              .map((dayNumber, index) => ({
                id: crypto.randomUUID(),
                dayType: 'weekday' as const,
                dayNumber,
                title: `Dia ${dayNumber}`,
                position: index + 1,
                exercises: [],
              })),
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    fallbackRoutine.exercises = flattenRoutineExercises(fallbackRoutine);

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
      exercises: updatedDayEntries.flatMap((day) => day.exercises.map((entry) => entry.exercise)),
      updatedAt: new Date().toISOString(),
    };

    commitLocalRoutines(
      localRoutines.map((routine) =>
        routine.id === updatedRoutine.id ? updatedRoutine : routine,
      ),
    );

    return updatedRoutine;
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
    const updatedRoutine: Routine = {
      ...targetRoutine,
      dayEntries: nextDays,
      exercises: nextDays.flatMap((day) => day.exercises.map((entry) => entry.exercise)),
      updatedAt: new Date().toISOString(),
    };

    commitLocalRoutines(localRoutines.map((r) => (r.id === routineId ? updatedRoutine : r)));
    return updatedRoutine;
  },

  async deleteExercise(routineId: string, dayId: string, exerciseId: string): Promise<Routine> {
    if (supabase) {
      const { error } = await supabase.from('routine_exercises').delete().eq('id', exerciseId);
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
        exercises: day.exercises.filter((ex) => ex.id !== exerciseId),
      };
    });

    const updatedRoutine: Routine = {
      ...targetRoutine,
      dayEntries: updatedDayEntries,
      exercises: updatedDayEntries.flatMap((day) => day.exercises.map((entry) => entry.exercise)),
      updatedAt: new Date().toISOString(),
    };

    commitLocalRoutines(localRoutines.map((r) => (r.id === routineId ? updatedRoutine : r)));
    return updatedRoutine;
  },
};
