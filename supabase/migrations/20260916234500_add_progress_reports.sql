-- Aggregated progress reports for the mobile UI. The functions run with the
-- caller's permissions so the existing RLS policies remain authoritative.

create index if not exists routine_sessions_user_status_ended_at_idx
  on public.routine_sessions (user_id, status, ended_at desc)
  include (id, started_at, routine_id);

create index if not exists session_day_logs_session_id_idx
  on public.session_day_logs (session_id);

create index if not exists session_exercise_logs_day_exercise_idx
  on public.session_exercise_logs (session_day_log_id, exercise_id);

create index if not exists session_set_logs_exercise_set_idx
  on public.session_set_logs (session_exercise_log_id, set_number)
  include (completed, reps, weight, duration_minutes, duration_seconds, load_type);

create or replace function public.get_progress_overview(
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_bucket text default 'day',
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_bucket text;
  v_previous_from timestamp with time zone;
  v_previous_to timestamp with time zone;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'Invalid progress report range' using errcode = '22023';
  end if;

  v_bucket := case when p_bucket in ('day', 'week', 'month') then p_bucket else 'day' end;
  v_previous_to := p_from;
  v_previous_from := p_from - (p_to - p_from);

  with
  current_sessions as (
    select
      rs.id,
      rs.started_at,
      rs.ended_at,
      date_trunc(v_bucket, timezone(p_timezone, rs.ended_at)) as bucket_start,
      timezone(p_timezone, rs.ended_at)::date as training_date
    from public.routine_sessions rs
    where rs.user_id = auth.uid()
      and rs.status = 'completed'
      and rs.ended_at >= p_from
      and rs.ended_at < p_to
  ),
  current_sets as (
    select
      cs.id as session_id,
      cs.bucket_start,
      sel.exercise_id,
      ssl.reps,
      ssl.weight,
      ssl.duration_minutes,
      ssl.duration_seconds,
      ssl.load_type
    from current_sessions cs
    join public.session_day_logs sdl on sdl.session_id = cs.id
    join public.session_exercise_logs sel on sel.session_day_log_id = sdl.id
    join public.session_set_logs ssl on ssl.session_exercise_log_id = sel.id
    where ssl.completed = true
  ),
  current_summary as (
    select jsonb_build_object(
      'sessions', (select count(*) from current_sessions),
      'training_days', (select count(distinct training_date) from current_sessions),
      'duration_minutes', coalesce((
        select round(sum(greatest(extract(epoch from (ended_at - started_at)), 0)) / 60.0, 1)
        from current_sessions
        where started_at is not null and ended_at is not null
      ), 0),
      'average_duration_minutes', coalesce((
        select round(avg(greatest(extract(epoch from (ended_at - started_at)), 0)) / 60.0, 1)
        from current_sessions
        where started_at is not null and ended_at is not null
      ), 0),
      'sets', (select count(*) from current_sets),
      'reps', coalesce((select sum(coalesce(reps, 0)) from current_sets), 0),
      'volume_kg', coalesce((
        select round(sum(
          case when load_type = 'external' and coalesce(weight, 0) > 0 and coalesce(reps, 0) > 0
            then weight * reps else 0 end
        ), 1) from current_sets
      ), 0),
      'timed_minutes', coalesce((
        select round(sum(coalesce(duration_minutes, 0) + coalesce(duration_seconds, 0) / 60.0), 1)
        from current_sets
      ), 0),
      'unique_exercises', (select count(distinct exercise_id) from current_sets where exercise_id is not null)
    ) as value
  ),
  previous_sessions as (
    select rs.id, rs.started_at, rs.ended_at, timezone(p_timezone, rs.ended_at)::date as training_date
    from public.routine_sessions rs
    where rs.user_id = auth.uid()
      and rs.status = 'completed'
      and rs.ended_at >= v_previous_from
      and rs.ended_at < v_previous_to
  ),
  previous_sets as (
    select sel.exercise_id, ssl.reps, ssl.weight, ssl.duration_minutes, ssl.duration_seconds, ssl.load_type
    from previous_sessions ps
    join public.session_day_logs sdl on sdl.session_id = ps.id
    join public.session_exercise_logs sel on sel.session_day_log_id = sdl.id
    join public.session_set_logs ssl on ssl.session_exercise_log_id = sel.id
    where ssl.completed = true
  ),
  previous_summary as (
    select jsonb_build_object(
      'sessions', (select count(*) from previous_sessions),
      'training_days', (select count(distinct training_date) from previous_sessions),
      'duration_minutes', coalesce((
        select round(sum(greatest(extract(epoch from (ended_at - started_at)), 0)) / 60.0, 1)
        from previous_sessions where started_at is not null and ended_at is not null
      ), 0),
      'average_duration_minutes', coalesce((
        select round(avg(greatest(extract(epoch from (ended_at - started_at)), 0)) / 60.0, 1)
        from previous_sessions where started_at is not null and ended_at is not null
      ), 0),
      'sets', (select count(*) from previous_sets),
      'reps', coalesce((select sum(coalesce(reps, 0)) from previous_sets), 0),
      'volume_kg', coalesce((
        select round(sum(
          case when load_type = 'external' and coalesce(weight, 0) > 0 and coalesce(reps, 0) > 0
            then weight * reps else 0 end
        ), 1) from previous_sets
      ), 0),
      'timed_minutes', coalesce((
        select round(sum(coalesce(duration_minutes, 0) + coalesce(duration_seconds, 0) / 60.0), 1)
        from previous_sets
      ), 0),
      'unique_exercises', (select count(distinct exercise_id) from previous_sets where exercise_id is not null)
    ) as value
  ),
  bucket_sessions as (
    select
      bucket_start,
      count(*) as sessions,
      round(sum(greatest(extract(epoch from (ended_at - started_at)), 0)) / 60.0, 1) as duration_minutes
    from current_sessions
    where started_at is not null and ended_at is not null
    group by bucket_start
  ),
  bucket_sets as (
    select
      bucket_start,
      count(*) as sets,
      coalesce(sum(coalesce(reps, 0)), 0) as reps,
      round(sum(
        case when load_type = 'external' and coalesce(weight, 0) > 0 and coalesce(reps, 0) > 0
          then weight * reps else 0 end
      ), 1) as volume_kg,
      round(sum(coalesce(duration_minutes, 0) + coalesce(duration_seconds, 0) / 60.0), 1) as timed_minutes
    from current_sets
    group by bucket_start
  ),
  bucket_grid as (
    select generate_series(
      date_trunc(v_bucket, timezone(p_timezone, p_from)),
      date_trunc(v_bucket, timezone(p_timezone, p_to - interval '1 millisecond')),
      case v_bucket
        when 'month' then interval '1 month'
        when 'week' then interval '1 week'
        else interval '1 day'
      end
    ) as bucket_start
  ),
  series as (
    select jsonb_agg(
      jsonb_build_object(
        'bucket_start', grid.bucket_start,
        'sessions', coalesce(bs.sessions, 0),
        'duration_minutes', coalesce(bs.duration_minutes, 0),
        'sets', coalesce(bset.sets, 0),
        'reps', coalesce(bset.reps, 0),
        'volume_kg', coalesce(bset.volume_kg, 0),
        'timed_minutes', coalesce(bset.timed_minutes, 0)
      ) order by grid.bucket_start
    ) as value
    from bucket_grid grid
    left join bucket_sessions bs on bs.bucket_start = grid.bucket_start
    left join bucket_sets bset on bset.bucket_start = grid.bucket_start
  ),
  exercises as (
    select jsonb_agg(
      jsonb_build_object(
        'id', ranked.exercise_id,
        'name', ranked.name,
        'name_en', ranked.name_en,
        'sessions', ranked.sessions,
        'last_performed_at', ranked.last_performed_at
      ) order by ranked.last_performed_at desc, ranked.name
    ) as value
    from (
      select
        cs.exercise_id,
        e.name,
        e.name_en,
        count(distinct cs.session_id) as sessions,
        max(rs.ended_at) as last_performed_at
      from current_sets cs
      join public.exercises e on e.id = cs.exercise_id
      join current_sessions rs on rs.id = cs.session_id
      where cs.exercise_id is not null
      group by cs.exercise_id, e.name, e.name_en
    ) ranked
  )
  select jsonb_build_object(
    'summary', current_summary.value,
    'previous_summary', previous_summary.value,
    'series', coalesce(series.value, '[]'::jsonb),
    'exercises', coalesce(exercises.value, '[]'::jsonb)
  )
  into v_result
  from current_summary, previous_summary, series, exercises;

  return v_result;
end;
$$;

create or replace function public.get_exercise_progress(
  p_exercise_id uuid,
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_bucket text default 'day',
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_bucket text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'Invalid exercise progress range' using errcode = '22023';
  end if;

  v_bucket := case when p_bucket in ('day', 'week', 'month') then p_bucket else 'day' end;

  with points as (
    select
      date_trunc(v_bucket, timezone(p_timezone, rs.ended_at)) as bucket_start,
      count(distinct rs.id) as sessions,
      count(*) as sets,
      coalesce(max(case when ssl.load_type = 'external' then ssl.weight end), 0) as max_weight,
      coalesce(max(ssl.reps), 0) as max_reps,
      round(sum(
        case when ssl.load_type = 'external' and coalesce(ssl.weight, 0) > 0 and coalesce(ssl.reps, 0) > 0
          then ssl.weight * ssl.reps else 0 end
      ), 1) as volume_kg
    from public.routine_sessions rs
    join public.session_day_logs sdl on sdl.session_id = rs.id
    join public.session_exercise_logs sel on sel.session_day_log_id = sdl.id
    join public.session_set_logs ssl on ssl.session_exercise_log_id = sel.id
    where rs.user_id = auth.uid()
      and rs.status = 'completed'
      and rs.ended_at >= p_from
      and rs.ended_at < p_to
      and sel.exercise_id = p_exercise_id
      and ssl.completed = true
    group by bucket_start
    order by bucket_start
  )
  select jsonb_build_object(
    'points', coalesce(jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start,
      'sessions', sessions,
      'sets', sets,
      'max_weight', max_weight,
      'max_reps', max_reps,
      'volume_kg', volume_kg
    ) order by bucket_start), '[]'::jsonb)
  )
  into v_result
  from points;

  return v_result;
end;
$$;

revoke all on function public.get_progress_overview(timestamp with time zone, timestamp with time zone, text, text) from public;
revoke all on function public.get_progress_overview(timestamp with time zone, timestamp with time zone, text, text) from anon;
grant execute on function public.get_progress_overview(timestamp with time zone, timestamp with time zone, text, text) to authenticated;

revoke all on function public.get_exercise_progress(uuid, timestamp with time zone, timestamp with time zone, text, text) from public;
revoke all on function public.get_exercise_progress(uuid, timestamp with time zone, timestamp with time zone, text, text) from anon;
grant execute on function public.get_exercise_progress(uuid, timestamp with time zone, timestamp with time zone, text, text) to authenticated;
