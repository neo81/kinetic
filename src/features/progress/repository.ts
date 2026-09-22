import { supabase } from '../../lib/supabase/client';
import type {
  ExerciseProgressPoint,
  ProgressActivityDay,
  ProgressBucket,
  ProgressExerciseOption,
  ProgressOverview,
  ProgressInsights,
  ProgressRecord,
  ProgressRoutineDay,
  ProgressSeriesPoint,
  ProgressSummary,
  ProgressTrainingDistribution,
} from '../../types';

const emptySummary = (): ProgressSummary => ({
  sessions: 0,
  trainingDays: 0,
  durationMinutes: 0,
  averageDurationMinutes: 0,
  sets: 0,
  reps: 0,
  volumeKg: 0,
  timedMinutes: 0,
  uniqueExercises: 0,
});

const numberValue = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseSummary = (value: unknown): ProgressSummary => {
  if (!value || typeof value !== 'object') return emptySummary();
  const input = value as Record<string, unknown>;
  return {
    sessions: numberValue(input.sessions),
    trainingDays: numberValue(input.training_days),
    durationMinutes: numberValue(input.duration_minutes),
    averageDurationMinutes: numberValue(input.average_duration_minutes),
    sets: numberValue(input.sets),
    reps: numberValue(input.reps),
    volumeKg: numberValue(input.volume_kg),
    timedMinutes: numberValue(input.timed_minutes),
    uniqueExercises: numberValue(input.unique_exercises),
  };
};

const parseSeries = (value: unknown): ProgressSeriesPoint[] => !Array.isArray(value) ? [] : value.map((point) => {
  const input = point as Record<string, unknown>;
  return {
    bucketStart: String(input.bucket_start ?? ''),
    sessions: numberValue(input.sessions),
    durationMinutes: numberValue(input.duration_minutes),
    sets: numberValue(input.sets),
    reps: numberValue(input.reps),
    volumeKg: numberValue(input.volume_kg),
    timedMinutes: numberValue(input.timed_minutes),
  };
}).filter((point) => point.bucketStart);

const parseExercises = (value: unknown): ProgressExerciseOption[] => !Array.isArray(value) ? [] : value.map((exercise) => {
  const input = exercise as Record<string, unknown>;
  return {
    id: String(input.id ?? ''),
    name: String(input.name ?? ''),
    nameEn: typeof input.name_en === 'string' ? input.name_en : undefined,
    sessions: numberValue(input.sessions),
    lastPerformedAt: String(input.last_performed_at ?? ''),
  };
}).filter((exercise) => exercise.id);

export const progressRepository = {
  async getOverview(input: {
    from: Date;
    to: Date;
    bucket: ProgressBucket;
    timezone: string;
  }): Promise<ProgressOverview> {
    if (!supabase) throw new Error('Supabase is not available');

    const { data, error } = await supabase.rpc('get_progress_overview', {
      p_from: input.from.toISOString(),
      p_to: input.to.toISOString(),
      p_bucket: input.bucket,
      p_timezone: input.timezone,
    });

    if (error) throw error;
    const result = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};

    return {
      summary: parseSummary(result.summary),
      previousSummary: parseSummary(result.previous_summary),
      series: parseSeries(result.series),
      exercises: parseExercises(result.exercises),
    };
  },

  async getExerciseProgress(input: {
    exerciseId: string;
    from: Date;
    to: Date;
    bucket: ProgressBucket;
    timezone: string;
  }): Promise<ExerciseProgressPoint[]> {
    if (!supabase) throw new Error('Supabase is not available');

    const { data, error } = await supabase.rpc('get_exercise_progress', {
      p_exercise_id: input.exerciseId,
      p_from: input.from.toISOString(),
      p_to: input.to.toISOString(),
      p_bucket: input.bucket,
      p_timezone: input.timezone,
    });

    if (error) throw error;
    const result = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
    const points = result.points;
    if (!Array.isArray(points)) return [];

    return points.map((point) => {
      const row = point as Record<string, unknown>;
      return {
        bucketStart: String(row.bucket_start ?? ''),
        sessions: numberValue(row.sessions),
        sets: numberValue(row.sets),
        maxWeight: numberValue(row.max_weight),
        maxReps: numberValue(row.max_reps),
        volumeKg: numberValue(row.volume_kg),
        estimatedOneRepMax: numberValue(row.estimated_one_rep_max),
        adherencePercent: row.adherence_percent === null || row.adherence_percent === undefined
          ? null
          : numberValue(row.adherence_percent),
      };
    }).filter((point) => point.bucketStart);
  },

  async getInsights(input: {
    from: Date;
    to: Date;
    timezone: string;
  }): Promise<ProgressInsights> {
    if (!supabase) throw new Error('Supabase is not available');

    const { data, error } = await supabase.rpc('get_progress_insights', {
      p_from: input.from.toISOString(),
      p_to: input.to.toISOString(),
      p_timezone: input.timezone,
    });

    if (error) throw error;
    const result = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};

    const activity: ProgressActivityDay[] = Array.isArray(result.activity)
      ? result.activity.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          date: String(row.date ?? ''),
          sessions: numberValue(row.sessions),
          volumeKg: numberValue(row.volume_kg),
          durationMinutes: numberValue(row.duration_minutes),
        };
      }).filter((item) => item.date)
      : [];

    const routineDays: ProgressRoutineDay[] = Array.isArray(result.routine_days)
      ? result.routine_days.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          routineId: String(row.routine_id ?? ''),
          routineName: String(row.routine_name ?? ''),
          dayKey: String(row.day_key ?? ''),
          dayType: (row.day_type === 'core' ? 'core' : 'weekday') as ProgressRoutineDay['dayType'],
          dayNumber: row.day_number === null || row.day_number === undefined ? null : numberValue(row.day_number),
          dayTitle: typeof row.day_title === 'string' ? row.day_title : null,
          sessions: numberValue(row.sessions),
          sets: numberValue(row.sets),
          exercises: numberValue(row.exercises),
          volumeKg: numberValue(row.volume_kg),
          lastPerformedAt: String(row.last_performed_at ?? ''),
        };
      }).filter((item) => item.dayKey)
      : [];

    const records: ProgressRecord[] = Array.isArray(result.records)
      ? result.records.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          kind: row.kind as ProgressRecord['kind'],
          value: numberValue(row.value),
          unit: row.unit as ProgressRecord['unit'],
          achievedAt: String(row.achieved_at ?? ''),
          exerciseId: typeof row.exercise_id === 'string' ? row.exercise_id : undefined,
          exerciseName: typeof row.exercise_name === 'string' ? row.exercise_name : undefined,
          exerciseNameEn: typeof row.exercise_name_en === 'string' ? row.exercise_name_en : undefined,
        };
      }).filter((item) => item.kind && item.achievedAt)
      : [];

    const estimatedMaxes = Array.isArray(result.estimated_maxes)
      ? result.estimated_maxes.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          exerciseId: String(row.exercise_id ?? ''),
          exerciseName: String(row.exercise_name ?? ''),
          exerciseNameEn: typeof row.exercise_name_en === 'string' ? row.exercise_name_en : undefined,
          estimatedOneRepMax: numberValue(row.estimated_one_rep_max),
          weight: numberValue(row.weight),
          reps: numberValue(row.reps),
          achievedAt: String(row.achieved_at ?? ''),
        };
      }).filter((item) => item.exerciseId)
      : [];

    return { activity, routineDays, records, estimatedMaxes };
  },

  async getTrainingDistribution(input: {
    from: Date;
    to: Date;
    timezone: string;
  }): Promise<ProgressTrainingDistribution> {
    if (!supabase) throw new Error('Supabase is not available');

    const { data, error } = await supabase.rpc('get_progress_training_distribution', {
      p_from: input.from.toISOString(),
      p_to: input.to.toISOString(),
      p_timezone: input.timezone,
    });

    if (error) throw error;
    const result = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
    const consistencyValue = result.consistency && typeof result.consistency === 'object' && !Array.isArray(result.consistency)
      ? result.consistency as Record<string, unknown>
      : {};

    return {
      muscleGroups: Array.isArray(result.muscle_groups)
        ? result.muscle_groups.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            code: String(row.code ?? ''),
            name: String(row.name ?? ''),
            sessions: numberValue(row.sessions),
            sets: numberValue(row.sets),
            reps: numberValue(row.reps),
            volumeKg: numberValue(row.volume_kg),
            sharePercent: numberValue(row.share_percent),
            lastPerformedAt: String(row.last_performed_at ?? ''),
          };
        }).filter((item) => item.code)
        : [],
      consistency: {
        activeWeeks: numberValue(consistencyValue.active_weeks),
        totalWeeks: numberValue(consistencyValue.total_weeks),
        consistencyPercent: numberValue(consistencyValue.consistency_percent),
        longestStreakWeeks: numberValue(consistencyValue.longest_streak_weeks),
        averageSessionsPerActiveWeek: numberValue(consistencyValue.average_sessions_per_active_week),
      },
    };
  },
};
