/**
 * routineImport.ts
 * Parsea un payload .kinetic.json, resuelve los IDs de ejercicios contra
 * la BD del importador y persiste la rutina como nueva (nuevos UUIDs siempre).
 *
 * Estrategia de resolución:
 *  - Ejercicio global (isCustom=false):
 *      1. Buscar por globalId en exercises WHERE user_id IS NULL
 *      2. Si no → buscar por name (case-insensitive)
 *      3. Si no → insertar copia como ejercicio custom del importador
 *  - Ejercicio custom (isCustom=true):
 *      1. Buscar en exercises del importador por name (case-insensitive)
 *      2. Si no → insertar nueva copia como ejercicio custom del importador
 */

import { supabase } from '../lib/supabase/client';
import type { Routine, RoutineDay, RoutineDayExercise, Exercise, ExerciseSet } from '../types';
import type { RoutineExportPayload, RoutineExportExercise } from './routineExport';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  routine: Routine;
  warnings: string[];
}

export class RoutineImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoutineImportError';
  }
}

// ─── Validación del payload ───────────────────────────────────────────────────

export function parseAndValidatePayload(jsonText: string): RoutineExportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new RoutineImportError('El archivo no es un JSON válido.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new RoutineImportError('Formato de archivo inválido.');
  }

  const p = parsed as Record<string, unknown>;

  if (p['version'] !== 1) {
    throw new RoutineImportError(
      `Versión de archivo no soportada (versión ${p['version']}). Solo se soporta la versión 1.`,
    );
  }

  if (!p['routine'] || typeof (p['routine'] as any)['name'] !== 'string') {
    throw new RoutineImportError('El archivo no contiene datos de rutina válidos.');
  }

  return parsed as RoutineExportPayload;
}

// ─── Resolución de ejercicios ─────────────────────────────────────────────────

/**
 * Intenta encontrar o crear el ejercicio correcto en la BD del importador.
 * Devuelve el UUID del ejercicio a usar (el de la BD del importador).
 */
async function resolveExerciseId(
  exportExercise: RoutineExportExercise,
  userId: string,
  warnings: string[],
): Promise<string> {
  if (!supabase) {
    throw new RoutineImportError('Sin conexión a la base de datos.');
  }

  const { exerciseRef } = exportExercise;

  if (!exerciseRef.isCustom) {
    // ── Paso 1: buscar global por UUID exacto ──────────────────────────────
    const { data: byId } = await supabase
      .from('exercises')
      .select('id')
      .eq('id', exerciseRef.globalId)
      .is('user_id', null)
      .maybeSingle();

    if (byId?.id) {
      return byId.id;
    }

    // ── Paso 2: buscar global por nombre ──────────────────────────────────
    const { data: byName } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name', exerciseRef.name)
      .is('user_id', null)
      .maybeSingle();

    if (byName?.id) {
      warnings.push(
        `Ejercicio "${exerciseRef.name}": no se encontró por ID, se usó por nombre.`,
      );
      return byName.id;
    }
  } else {
    // ── Ejercicio custom: buscar entre los del importador ─────────────────
    const { data: ownCustom } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name', exerciseRef.name)
      .eq('user_id', userId)
      .maybeSingle();

    if (ownCustom?.id) {
      warnings.push(
        `Ejercicio custom "${exerciseRef.name}": se reutilizó el tuyo existente.`,
      );
      return ownCustom.id;
    }
  }

  // ── Paso 3 (fallback): crear copia como custom del importador ─────────
  warnings.push(
    `Ejercicio "${exerciseRef.name}" no encontrado → se creó una copia custom en tu biblioteca.`,
  );

  // Intentar resolver muscle_group_id por código o nombre
  let muscleGroupId: number | null = null;

  if (exerciseRef.muscleGroupCode) {
    const { data: mgByCode } = await supabase
      .from('muscle_groups')
      .select('id')
      .eq('code', exerciseRef.muscleGroupCode)
      .maybeSingle();

    if (mgByCode?.id) {
      muscleGroupId = mgByCode.id as number;
    }
  }

  if (!muscleGroupId) {
    // Tomar el primero disponible como fallback
    const { data: mgFirst } = await supabase
      .from('muscle_groups')
      .select('id')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    muscleGroupId = (mgFirst?.id as number) ?? null;
  }

  if (!muscleGroupId) {
    throw new RoutineImportError(
      `No se pudo determinar el grupo muscular para "${exerciseRef.name}".`,
    );
  }

  const { data: newExercise, error: insertError } = await supabase
    .from('exercises')
    .insert({
      name: exerciseRef.name,
      description: exerciseRef.description ?? null,
      muscle_group_id: muscleGroupId,
      equipment: exerciseRef.equipment ?? null,
      user_id: userId,
    })
    .select('id')
    .single();

  if (insertError || !newExercise) {
    throw new RoutineImportError(
      `No se pudo crear el ejercicio custom "${exerciseRef.name}": ${insertError?.message ?? 'error desconocido'}`,
    );
  }

  return newExercise.id;
}

// ─── Construcción de la Routine en memoria ────────────────────────────────────

/**
 * Construye el objeto Routine completo a partir del payload resuelto.
 * Genera nuevos UUIDs para toda la jerarquía.
 */
async function buildRoutineFromPayload(
  payload: RoutineExportPayload,
  userId: string,
  warnings: string[],
): Promise<Routine> {
  const routineId = crypto.randomUUID();
  const dayEntries: RoutineDay[] = [];

  for (const exportDay of payload.routine.days) {
    const dayId = crypto.randomUUID();

    // Parallelize exercise ID resolution for all exercises in this day
    const resolvedExerciseIds = await Promise.all(
      exportDay.exercises.map((exportExercise) =>
        resolveExerciseId(exportExercise, userId, warnings)
      )
    );

    const exercises: RoutineDayExercise[] = exportDay.exercises.map((exportExercise, index) => {
      const resolvedExerciseId = resolvedExerciseIds[index];

      const sets: ExerciseSet[] = exportExercise.sets.map((s) => ({
        setNumber: s.setNumber,
        reps: (s as any).targetType === 'failure' ? null : (s.reps ?? 0),
        weight: s.weight ?? null,
        durationMinutes: s.durationMinutes ?? undefined,
        durationSeconds: s.durationSeconds ?? undefined,
        notes: s.notes ?? undefined,
        targetType: ((s as any).targetType ?? 'fixed_reps') as any,
      }));

      const exercise: Exercise = {
        id: resolvedExerciseId,
        name: exportExercise.exerciseRef.name,
        muscleGroup: exportExercise.exerciseRef.muscleGroupCode,
        description: exportExercise.exerciseRef.description,
        equipment: exportExercise.exerciseRef.equipment,
        measureUnit: (exportExercise.measureUnit as any) ?? 'kg',
        loadType: ((exportExercise as any).loadType ?? 'external') as any,
        sets,
        isCustom: exportExercise.exerciseRef.isCustom,
      };

      return {
        id: crypto.randomUUID(),
        exerciseId: resolvedExerciseId,
        exercise,
        position: exportExercise.position,
        restSeconds: exportExercise.restSeconds ?? null,
        notes: exportExercise.notes ?? null,
      };
    });

    dayEntries.push({
      id: dayId,
      dayType: exportDay.dayType,
      dayNumber: exportDay.dayNumber,
      title: exportDay.title,
      position: exportDay.position,
      exercises,
    });
  }

  // Reconstruir campos derivados (days[], frequency, focus, exercises[])
  const weekdayNumbers = dayEntries
    .filter((d) => d.dayType === 'weekday' && d.dayNumber !== null)
    .map((d) => d.dayNumber as number);

  const frequency = `${Math.max(weekdayNumbers.length, 1)} vez${weekdayNumbers.length === 1 ? '' : 'es'} / semana`;
  const focusDay = dayEntries.find((d) => d.dayType === 'core') ?? dayEntries[0];
  const allExercises = dayEntries.flatMap((d) => d.exercises.map((e) => e.exercise));

  const routine: Routine = {
    id: routineId,
    name: payload.routine.name,
    notes: payload.routine.notes ?? undefined,
    frequency,
    days: weekdayNumbers.sort((a, b) => a - b),
    focus: focusDay?.title ?? '',
    exercises: allExercises,
    dayEntries,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncPending: false,
  };

  return routine;
}

// ─── Persistencia en Supabase ─────────────────────────────────────────────────

async function persistImportedRoutine(routine: Routine): Promise<void> {
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new RoutineImportError('Sesión de usuario no disponible.');

  // Insertar rutina
  const { error: routineErr } = await supabase.from('routines').insert({
    id: routine.id,
    user_id: user.id,
    name: routine.name,
    notes: routine.notes ?? null,
    is_active: true,
  });

  if (routineErr) {
    throw new RoutineImportError(`Error al guardar la rutina: ${routineErr.message}`);
  }

  // Insertar días y ejercicios
  for (const day of routine.dayEntries ?? []) {
    const { error: dayErr } = await supabase.from('routine_days').insert({
      id: day.id,
      routine_id: routine.id,
      day_type: day.dayType,
      day_number: day.dayNumber,
      title: day.title,
      position: day.position,
    });

    if (dayErr) {
      throw new RoutineImportError(`Error al guardar el día "${day.title}": ${dayErr.message}`);
    }

    for (const item of day.exercises) {
      const { data: rdeRow, error: rdeErr } = await supabase
        .from('routine_day_exercises')
        .insert({
          id: item.id,
          routine_day_id: day.id,
          exercise_id: item.exerciseId,
          position: item.position,
          rest_seconds: item.restSeconds ?? null,
          notes: item.notes ?? null,
          measure_unit: (item.exercise.measureUnit ?? 'kg') as any,
          load_type: (item.exercise.loadType ?? 'external') as any,
        })
        .select('id')
        .single();

      if (rdeErr || !rdeRow) {
        throw new RoutineImportError(
          `Error al guardar el ejercicio "${item.exercise.name}": ${rdeErr?.message ?? 'error desconocido'}`,
        );
      }

      // Insertar series
      if (item.exercise.sets.length > 0) {
        const setRows = item.exercise.sets.map((s, idx) => ({
          routine_day_exercise_id: rdeRow.id,
          set_number: s.setNumber ?? idx + 1,
          reps: s.reps,
          weight: s.weight,
          duration_minutes: s.durationMinutes ?? null,
          duration_seconds: s.durationSeconds ?? null,
          notes: s.notes ?? null,
          target_type: s.targetType ?? 'fixed_reps',
        }));

        const { error: setsErr } = await supabase.from('exercise_sets').insert(setRows);
        if (setsErr) {
          throw new RoutineImportError(
            `Error al guardar series de "${item.exercise.name}": ${setsErr.message}`,
          );
        }
      }
    }
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Punto de entrada principal.
 * Parsea el JSON, resuelve IDs, persiste en Supabase y devuelve la Routine creada.
 */
export async function importRoutineFromJson(jsonText: string): Promise<ImportResult> {
  if (!supabase) {
    throw new RoutineImportError('Sin conexión a la base de datos.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new RoutineImportError('Debes estar autenticado para importar una rutina.');
  }

  const payload = parseAndValidatePayload(jsonText);
  const warnings: string[] = [];

  const routine = await buildRoutineFromPayload(payload, user.id, warnings);
  await persistImportedRoutine(routine);

  return { routine, warnings };
}
