/**
 * routineExport.ts
 * Serializa una Routine al formato portátil .kinetic.json y dispara la descarga.
 * Los IDs del payload son solo referencia del exportador; al importar se generan nuevos UUIDs.
 */

import type { Routine } from '../types';

// ─── Tipos del payload ───────────────────────────────────────────────────────

export interface RoutineExportExerciseRef {
  /** UUID del ejercicio en la BD del exportador (útil para mismo-usuario). */
  globalId: string;
  name: string;
  /** Código estable de muscle_groups (ej: 'pectorales', 'biceps'). */
  muscleGroupCode: string;
  description?: string;
  equipment?: string;
  isCustom: boolean;
}

export interface RoutineExportSet {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  durationMinutes: number | null;
  durationSeconds: number | null;
  notes: string | null;
}

export interface RoutineExportExercise {
  /** Índice interno para referencias cruzadas en el archivo. */
  _exportId: string;
  position: number;
  restSeconds: number | null;
  notes: string | null;
  measureUnit: string;
  exerciseRef: RoutineExportExerciseRef;
  sets: RoutineExportSet[];
}

export interface RoutineExportDay {
  _exportId: string;
  dayType: 'core' | 'weekday';
  dayNumber: number | null;
  title: string;
  position: number;
  exercises: RoutineExportExercise[];
}

export interface RoutineExportCustomExercise {
  _exportId: string;
  /** UUID original del ejercicio custom en la BD del exportador. */
  originalId: string;
  name: string;
  muscleGroupCode: string;
  description?: string;
  equipment?: string;
}

export interface RoutineExportPayload {
  version: 1;
  exportedAt: string;
  exportedBy: string | null;
  routine: {
    name: string;
    notes: string | null;
    days: RoutineExportDay[];
    /** Ejercicios custom embebidos para que el importador pueda recrearlos. */
    customExercises: RoutineExportCustomExercise[];
  };
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Convierte una Routine al payload de exportación portable.
 * No hace llamadas a red; opera puramente sobre el objeto en memoria.
 */
export function buildRoutineExportPayload(
  routine: Routine,
  exportedBy: string | null = null,
): RoutineExportPayload {
  const customExercisesMap = new Map<string, RoutineExportCustomExercise>();
  let customExerciseCounter = 0;

  const days: RoutineExportDay[] = (routine.dayEntries ?? []).map((day, dayIdx) => {
    const exercises: RoutineExportExercise[] = day.exercises.map((item, exIdx) => {
      const ex = item.exercise;
      const isCustom = ex.isCustom === true;

      // Registrar ejercicios custom una sola vez
      if (isCustom && !customExercisesMap.has(ex.id)) {
        const customExportId = `custom-${customExerciseCounter++}`;
        customExercisesMap.set(ex.id, {
          _exportId: customExportId,
          originalId: ex.id,
          name: ex.name,
          muscleGroupCode: ex.muscleGroup ?? 'sin-grupo',
          description: ex.description,
          equipment: ex.equipment,
        });
      }

      const sets: RoutineExportSet[] = (ex.sets ?? []).map((s) => ({
        setNumber: s.setNumber ?? 1,
        reps: s.reps ?? null,
        weight: s.weight ?? null,
        durationMinutes: s.durationMinutes ?? null,
        durationSeconds: s.durationSeconds ?? null,
        notes: s.notes ?? null,
      }));

      return {
        _exportId: `rde-${dayIdx}-${exIdx}`,
        position: item.position,
        restSeconds: item.restSeconds ?? null,
        notes: item.notes ?? null,
        measureUnit: ex.measureUnit ?? 'kg',
        exerciseRef: {
          globalId: ex.id,
          name: ex.name,
          // muscleGroup contiene el nombre del grupo; usamos el campo directamente
          // ya que el código estable (muscle_groups.code) no está disponible en el tipo Exercise.
          // Al importar, se buscará primero por globalId y luego por name + muscleGroupCode.
          muscleGroupCode: (ex as any).muscleGroupCode ?? ex.muscleGroup ?? '',
          description: ex.description,
          equipment: ex.equipment,
          isCustom,
        },
        sets,
      };
    });

    return {
      _exportId: `day-${dayIdx}`,
      dayType: day.dayType,
      dayNumber: day.dayNumber,
      title: day.title,
      position: day.position,
      exercises,
    };
  });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy,
    routine: {
      name: routine.name,
      notes: routine.notes ?? null,
      days,
      customExercises: [...customExercisesMap.values()],
    },
  };
}

/**
 * Serializa y dispara la descarga del archivo .kinetic.json en el navegador.
 */
export function downloadRoutineAsJson(
  routine: Routine,
  exportedBy: string | null = null,
): void {
  const payload = buildRoutineExportPayload(routine, exportedBy);
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  const safeName = routine.name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
  anchor.href = url;
  anchor.download = `${safeName}.kinetic.json`;
  anchor.click();

  // Liberar URL de objeto después de la descarga
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
