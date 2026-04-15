import { supabase } from '../../lib/supabase/client';
import type { Database } from '../../lib/supabase/database.types';

/**
 * Calculate which week a date belongs to (week starting on Monday)
 */
function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

/**
 * Backfill weekly_statistics from completed sessions
 * This aggregates historical session data into weekly snapshots for dashboard comparisons
 */
export async function backfillWeeklyStatistics(userId: string): Promise<number> {
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  try {
    console.log('[backfill] Starting weekly statistics backfill for user:', userId);

    // Query all completed sessions for this user
    const { data: sessions, error: fetchError } = await supabase
      .from('routine_sessions')
      .select(
        `
        id,
        started_at,
        ended_at,
        session_day_logs (
          id,
          session_exercise_logs (
            id,
            session_set_logs (
              actual_weight,
              actual_reps,
              actual_duration_minutes,
              actual_duration_seconds
            )
          )
        )
      `,
      )
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('started_at', { ascending: true });

    if (fetchError) {
      console.error('[backfill] Error fetching sessions:', fetchError);
      throw fetchError;
    }

    if (!sessions || sessions.length === 0) {
      console.log('[backfill] No completed sessions found for backfill');
      return 0;
    }

    // Group sessions by week
    const weeklyData: Map<string, any> = new Map();

    sessions.forEach((session: any) => {
      if (!session.started_at) return;

      const weekStart = getWeekStartDate(new Date(session.started_at));

      if (!weeklyData.has(weekStart)) {
        weeklyData.set(weekStart, {
          week_start_date: weekStart,
          user_id: userId,
          total_volume: 0,
          total_volume_minutes: 0,
          total_exercises: 0,
          total_sessions: 0,
          average_duration_minutes: 0,
          session_durations: [],
        });
      }

      const week = weeklyData.get(weekStart);
      let sessionDuration = 0;
      let exerciseCount = 0;

      // Calculate volumes and exercise counts
      if (session.session_day_logs && Array.isArray(session.session_day_logs)) {
        session.session_day_logs.forEach((dayLog: any) => {
          if (dayLog.session_exercise_logs && Array.isArray(dayLog.session_exercise_logs)) {
            dayLog.session_exercise_logs.forEach((exerciseLog: any) => {
              exerciseCount++;

              if (exerciseLog.session_set_logs && Array.isArray(exerciseLog.session_set_logs)) {
                exerciseLog.session_set_logs.forEach((setLog: any) => {
                  // Volume from weight
                  const reps = setLog.actual_reps || 0;
                  const weight = setLog.actual_weight || 0;
                  if (reps > 0 && weight > 0) {
                    week.total_volume += reps * weight;
                  }

                  // Volume from minutes
                  const durationMin = setLog.actual_duration_minutes || 0;
                  if (durationMin > 0) {
                    week.total_volume_minutes += durationMin;
                  }
                });
              }
            });
          }
        });
      }

      week.total_exercises += exerciseCount;
      week.total_sessions += 1;

      // Track session duration
      if (session.started_at && session.ended_at) {
        const durationMs = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
        const durationMin = Math.round(durationMs / 60000);
        week.session_durations.push(durationMin);
        sessionDuration = durationMin;
      }
    });

    // Calculate averages and prepare upsert data
    const upsertData = Array.from(weeklyData.values()).map(week => {
      const avgDuration =
        week.session_durations.length > 0
          ? Math.round(week.session_durations.reduce((a: number, b: number) => a + b, 0) / week.session_durations.length)
          : 0;

      return {
        user_id: week.user_id,
        week_start_date: week.week_start_date,
        total_volume: week.total_volume,
        total_volume_minutes: week.total_volume_minutes,
        total_exercises: week.total_exercises,
        total_sessions: week.total_sessions,
        average_duration_minutes: avgDuration,
      };
    });

    console.log(`[backfill] Upserting ${upsertData.length} weeks of data`);

    // Upsert all weeks
    const { error: upsertError, count } = await supabase
      .from('weekly_statistics')
      .upsert(upsertData, { onConflict: 'user_id,week_start_date' });

    if (upsertError) {
      console.error('[backfill] Error upserting weekly statistics:', upsertError);
      throw upsertError;
    }

    console.log(`[backfill] Successfully backfilled ${upsertData.length} weeks of statistics`);
    return upsertData.length;
  } catch (error) {
    console.error('[backfill] Error in backfillWeeklyStatistics:', error);
    throw error;
  }
}

/**
 * Check if user needs backfill and perform it if needed
 * This is called on first login after the feature is deployed
 */
export async function ensureWeeklyStatsBackfilled(userId: string): Promise<boolean> {
  try {
    // Check if user already has weekly stats
    const { data: existing } = await supabase
      .from('weekly_statistics')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[backfill] User already has weekly statistics, skipping backfill');
      return false;
    }

    // Perform backfill
    const count = await backfillWeeklyStatistics(userId);
    return count > 0;
  } catch (error) {
    console.error('[backfill] Error in ensureWeeklyStatsBackfilled:', error);
    // Don't throw - backfill failure shouldn't block app startup
    return false;
  }
}
