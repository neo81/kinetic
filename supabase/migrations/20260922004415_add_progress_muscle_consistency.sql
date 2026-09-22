-- Keep the muscle classification used by a completed session even if the
-- exercise catalog changes later.
alter table public.session_exercise_logs
  add column if not exists muscle_group_code_snapshot text,
  add column if not exists muscle_group_name_snapshot text;

create or replace function public.capture_session_exercise_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_routine_day_id uuid;
begin
  select log.routine_day_id into v_routine_day_id
  from public.session_day_logs log
  where log.id = new.session_day_log_id;

  if new.routine_day_exercise_id is null and v_routine_day_id is not null then
    select instance.id into new.routine_day_exercise_id
    from public.routine_day_exercises instance
    where instance.routine_day_id = v_routine_day_id
      and instance.exercise_id = new.exercise_id
      and instance.position = new.position
    limit 1;
  end if;

  if new.exercise_id is not null
     and (new.exercise_name_snapshot is null or new.muscle_group_code_snapshot is null) then
    select exercise.name, exercise.name_en, muscle.code, muscle.name
    into
      new.exercise_name_snapshot,
      new.exercise_name_en_snapshot,
      new.muscle_group_code_snapshot,
      new.muscle_group_name_snapshot
    from public.exercises exercise
    left join public.muscle_groups muscle on muscle.id = exercise.muscle_group_id
    where exercise.id = new.exercise_id;
  end if;
  return new;
end;
$$;

update public.session_exercise_logs log
set
  muscle_group_code_snapshot = muscle.code,
  muscle_group_name_snapshot = muscle.name
from public.exercises exercise
join public.muscle_groups muscle on muscle.id = exercise.muscle_group_id
where log.exercise_id = exercise.id
  and log.muscle_group_code_snapshot is null;

create or replace function public.get_progress_training_distribution(
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'Invalid progress distribution range' using errcode = '22023';
  end if;

  with
  sessions as (
    select
      session.id,
      session.ended_at,
      date_trunc('week', timezone(p_timezone, session.ended_at))::date as activity_week
    from public.routine_sessions session
    where session.user_id = auth.uid()
      and session.status = 'completed'
      and session.ended_at >= p_from
      and session.ended_at < p_to
  ),
  completed_sets as (
    select
      session.id as session_id,
      session.ended_at,
      exercise_log.id as exercise_log_id,
      coalesce(exercise_log.muscle_group_code_snapshot, muscle.code) as muscle_group_code,
      coalesce(exercise_log.muscle_group_name_snapshot, muscle.name) as muscle_group_name,
      set_log.reps,
      set_log.weight,
      set_log.load_type
    from sessions session
    join public.session_day_logs day_log on day_log.session_id = session.id
    join public.session_exercise_logs exercise_log on exercise_log.session_day_log_id = day_log.id
    left join public.exercises exercise on exercise.id = exercise_log.exercise_id
    left join public.muscle_groups muscle on muscle.id = exercise.muscle_group_id
    join public.session_set_logs set_log on set_log.session_exercise_log_id = exercise_log.id
    where set_log.completed = true
  ),
  muscle_groups as (
    select jsonb_agg(jsonb_build_object(
      'code', muscle_group_code,
      'name', muscle_group_name,
      'sessions', sessions,
      'sets', sets,
      'reps', reps,
      'volume_kg', volume_kg,
      'share_percent', share_percent,
      'last_performed_at', last_performed_at
    ) order by sets desc, muscle_group_name) as value
    from (
      select
        muscle_group_code,
        muscle_group_name,
        count(distinct session_id) as sessions,
        count(*) as sets,
        coalesce(sum(reps), 0) as reps,
        round(sum(case
          when load_type = 'external' then coalesce(reps, 0) * coalesce(weight, 0)
          else 0
        end), 1) as volume_kg,
        round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as share_percent,
        max(ended_at) as last_performed_at
      from completed_sets
      where muscle_group_code is not null
      group by muscle_group_code, muscle_group_name
    ) grouped_muscles
  ),
  active_weeks as (
    select activity_week, count(*) as sessions
    from sessions
    group by activity_week
  ),
  numbered_weeks as (
    select
      activity_week,
      activity_week - (row_number() over (order by activity_week)::integer * 7) as streak_group
    from active_weeks
  ),
  streaks as (
    select count(*) as streak_length
    from numbered_weeks
    group by streak_group
  ),
  consistency as (
    select jsonb_build_object(
      'active_weeks', (select count(*) from active_weeks),
      'total_weeks', greatest(
        1,
        1 + (
          date_trunc('week', timezone(p_timezone, p_to - interval '1 microsecond'))::date
          - date_trunc('week', timezone(p_timezone, p_from))::date
        ) / 7
      ),
      'consistency_percent', round(
        100.0 * (select count(*) from active_weeks) / greatest(
          1,
          1 + (
            date_trunc('week', timezone(p_timezone, p_to - interval '1 microsecond'))::date
            - date_trunc('week', timezone(p_timezone, p_from))::date
          ) / 7
        ),
        1
      ),
      'longest_streak_weeks', coalesce((select max(streak_length) from streaks), 0),
      'average_sessions_per_active_week', coalesce(
        round((select avg(sessions) from active_weeks), 1),
        0
      )
    ) as value
  )
  select jsonb_build_object(
    'muscle_groups', coalesce(muscle_groups.value, '[]'::jsonb),
    'consistency', consistency.value
  )
  into v_result
  from muscle_groups, consistency;

  return v_result;
end;
$$;

revoke all on function public.get_progress_training_distribution(timestamp with time zone, timestamp with time zone, text) from public, anon;
grant execute on function public.get_progress_training_distribution(timestamp with time zone, timestamp with time zone, text) to authenticated;

revoke all on function public.capture_session_exercise_snapshot() from public, anon, authenticated;
