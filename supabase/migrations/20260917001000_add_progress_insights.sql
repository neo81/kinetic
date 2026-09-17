-- Preserve the plan and catalog labels used by future sessions so reports do
-- not change when a routine, day, or exercise is edited later.
alter table public.routine_sessions
  add column if not exists routine_name_snapshot text;

-- Completed history must survive deleting a routine. The snapshot keeps its
-- display name while the nullable reference stops cascading the session away.
alter table public.routine_sessions
  drop constraint if exists routine_sessions_routine_id_fkey;
alter table public.routine_sessions
  alter column routine_id drop not null;
alter table public.routine_sessions
  add constraint routine_sessions_routine_id_fkey
  foreign key (routine_id) references public.routines(id) on delete set null;

alter table public.session_day_logs
  add column if not exists day_type_snapshot text,
  add column if not exists day_number_snapshot integer,
  add column if not exists day_title_snapshot text;

alter table public.session_exercise_logs
  add column if not exists routine_day_exercise_id uuid references public.routine_day_exercises(id) on delete set null,
  add column if not exists exercise_name_snapshot text,
  add column if not exists exercise_name_en_snapshot text;

alter table public.session_set_logs
  add column if not exists planned_reps numeric(6,2),
  add column if not exists planned_weight numeric(8,2),
  add column if not exists planned_duration_minutes numeric(6,2),
  add column if not exists planned_duration_seconds numeric(6,2);

create index if not exists session_exercise_logs_routine_instance_idx
  on public.session_exercise_logs (routine_day_exercise_id)
  where routine_day_exercise_id is not null;

create or replace function public.capture_routine_session_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.routine_name_snapshot is null and new.routine_id is not null then
    select routine.name into new.routine_name_snapshot
    from public.routines routine
    where routine.id = new.routine_id;
  end if;
  return new;
end;
$$;

create or replace function public.capture_session_day_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.routine_day_id is not null and new.day_type_snapshot is null then
    select day.day_type, day.day_number, day.title
    into new.day_type_snapshot, new.day_number_snapshot, new.day_title_snapshot
    from public.routine_days day
    where day.id = new.routine_day_id;
  end if;
  return new;
end;
$$;

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

  if new.exercise_name_snapshot is null and new.exercise_id is not null then
    select exercise.name, exercise.name_en
    into new.exercise_name_snapshot, new.exercise_name_en_snapshot
    from public.exercises exercise
    where exercise.id = new.exercise_id;
  end if;
  return new;
end;
$$;

create or replace function public.capture_session_set_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_routine_day_exercise_id uuid;
begin
  select exercise_log.routine_day_exercise_id into v_routine_day_exercise_id
  from public.session_exercise_logs exercise_log
  where exercise_log.id = new.session_exercise_log_id;

  if v_routine_day_exercise_id is not null
     and new.planned_reps is null
     and new.planned_weight is null
     and new.planned_duration_minutes is null
     and new.planned_duration_seconds is null then
    select plan.reps, plan.weight, plan.duration_minutes, plan.duration_seconds
    into new.planned_reps, new.planned_weight, new.planned_duration_minutes, new.planned_duration_seconds
    from public.exercise_sets plan
    where plan.routine_day_exercise_id = v_routine_day_exercise_id
      and plan.set_number = new.set_number;
  end if;
  return new;
end;
$$;

drop trigger if exists capture_routine_session_snapshot_trigger on public.routine_sessions;
create trigger capture_routine_session_snapshot_trigger
before insert or update of routine_id on public.routine_sessions
for each row execute function public.capture_routine_session_snapshot();

drop trigger if exists capture_session_day_snapshot_trigger on public.session_day_logs;
create trigger capture_session_day_snapshot_trigger
before insert or update of routine_day_id on public.session_day_logs
for each row execute function public.capture_session_day_snapshot();

drop trigger if exists capture_session_exercise_snapshot_trigger on public.session_exercise_logs;
create trigger capture_session_exercise_snapshot_trigger
before insert or update of exercise_id, position, session_day_log_id on public.session_exercise_logs
for each row execute function public.capture_session_exercise_snapshot();

drop trigger if exists capture_session_set_plan_trigger on public.session_set_logs;
create trigger capture_session_set_plan_trigger
before insert on public.session_set_logs
for each row execute function public.capture_session_set_plan();

-- Safe descriptive backfill for existing history. Planned targets are not
-- backfilled because the current routine may differ from the historical plan.
update public.routine_sessions session
set routine_name_snapshot = routine.name
from public.routines routine
where session.routine_id = routine.id
  and session.routine_name_snapshot is null;

update public.session_day_logs log
set
  day_type_snapshot = day.day_type,
  day_number_snapshot = day.day_number,
  day_title_snapshot = day.title
from public.routine_days day
where log.routine_day_id = day.id
  and log.day_type_snapshot is null;

update public.session_exercise_logs log
set
  routine_day_exercise_id = instance.id,
  exercise_name_snapshot = exercise.name,
  exercise_name_en_snapshot = exercise.name_en
from public.session_day_logs day_log
join public.routine_day_exercises instance
  on instance.routine_day_id = day_log.routine_day_id
join public.exercises exercise
  on exercise.id = instance.exercise_id
where log.session_day_log_id = day_log.id
  and log.exercise_id = instance.exercise_id
  and log.position = instance.position
  and log.routine_day_exercise_id is null;

update public.session_exercise_logs log
set
  exercise_name_snapshot = exercise.name,
  exercise_name_en_snapshot = exercise.name_en
from public.exercises exercise
where log.exercise_id = exercise.id
  and log.exercise_name_snapshot is null;

create or replace function public.get_progress_insights(
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
    raise exception 'Invalid progress insight range' using errcode = '22023';
  end if;

  with
  sessions as (
    select
      rs.id,
      rs.routine_id,
      coalesce(rs.routine_name_snapshot, routine.name, '') as routine_name,
      rs.started_at,
      rs.ended_at,
      timezone(p_timezone, rs.ended_at)::date as activity_date
    from public.routine_sessions rs
    left join public.routines routine on routine.id = rs.routine_id
    where rs.user_id = auth.uid()
      and rs.status = 'completed'
      and rs.ended_at >= p_from
      and rs.ended_at < p_to
  ),
  set_rows as (
    select
      session.id as session_id,
      session.routine_id,
      session.routine_name,
      session.ended_at,
      session.activity_date,
      day_log.id as day_log_id,
      coalesce(day_log.day_type_snapshot, day.day_type, 'weekday') as day_type,
      coalesce(day_log.day_number_snapshot, day.day_number) as day_number,
      coalesce(day_log.day_title_snapshot, day.title) as day_title,
      exercise_log.id as exercise_log_id,
      exercise_log.exercise_id,
      coalesce(exercise_log.exercise_name_snapshot, exercise.name, '') as exercise_name,
      coalesce(exercise_log.exercise_name_en_snapshot, exercise.name_en) as exercise_name_en,
      set_log.reps,
      set_log.weight,
      set_log.load_type,
      set_log.planned_reps,
      set_log.planned_weight
    from sessions session
    join public.session_day_logs day_log on day_log.session_id = session.id
    left join public.routine_days day on day.id = day_log.routine_day_id
    join public.session_exercise_logs exercise_log on exercise_log.session_day_log_id = day_log.id
    left join public.exercises exercise on exercise.id = exercise_log.exercise_id
    join public.session_set_logs set_log on set_log.session_exercise_log_id = exercise_log.id
    where set_log.completed = true
  ),
  session_volume as (
    select
      session.id,
      session.activity_date,
      session.started_at,
      session.ended_at,
      coalesce(sum(case when rows.load_type = 'external' then coalesce(rows.reps, 0) * coalesce(rows.weight, 0) else 0 end), 0) as volume_kg
    from sessions session
    left join set_rows rows on rows.session_id = session.id
    group by session.id, session.activity_date, session.started_at, session.ended_at
  ),
  activity as (
    select jsonb_agg(jsonb_build_object(
      'date', activity_date,
      'sessions', sessions,
      'volume_kg', volume_kg,
      'duration_minutes', duration_minutes
    ) order by activity_date) as value
    from (
      select
        activity_date,
        count(*) as sessions,
        round(sum(volume_kg), 1) as volume_kg,
        round(sum(greatest(extract(epoch from (ended_at - started_at)), 0)) / 60.0, 1) as duration_minutes
      from session_volume
      group by activity_date
    ) daily
  ),
  routine_days as (
    select jsonb_agg(jsonb_build_object(
      'routine_id', routine_id,
      'routine_name', routine_name,
      'day_key', day_key,
      'day_type', day_type,
      'day_number', day_number,
      'day_title', day_title,
      'sessions', sessions,
      'sets', sets,
      'exercises', exercises,
      'volume_kg', volume_kg,
      'last_performed_at', last_performed_at
    ) order by last_performed_at desc, routine_name, day_number nulls first) as value
    from (
      select
        routine_id,
        routine_name,
        concat(routine_id, ':', day_type, ':', coalesce(day_number::text, 'core'), ':', coalesce(day_title, '')) as day_key,
        day_type,
        day_number,
        day_title,
        count(distinct session_id) as sessions,
        count(*) as sets,
        count(distinct exercise_log_id) as exercises,
        round(sum(case when load_type = 'external' then coalesce(reps, 0) * coalesce(weight, 0) else 0 end), 1) as volume_kg,
        max(ended_at) as last_performed_at
      from set_rows
      group by routine_id, routine_name, day_type, day_number, day_title
    ) grouped_days
  ),
  ranked_estimates as (
    select
      exercise_id,
      exercise_name,
      exercise_name_en,
      weight,
      reps,
      ended_at,
      round(weight * (1 + reps / 30.0), 1) as estimated_one_rep_max,
      row_number() over (
        partition by exercise_id
        order by weight * (1 + reps / 30.0) desc, ended_at desc
      ) as rank_for_exercise
    from set_rows
    where load_type = 'external'
      and exercise_id is not null
      and weight > 0
      and reps between 1 and 12
  ),
  estimated_maxes as (
    select jsonb_agg(jsonb_build_object(
      'exercise_id', exercise_id,
      'exercise_name', exercise_name,
      'exercise_name_en', exercise_name_en,
      'estimated_one_rep_max', estimated_one_rep_max,
      'weight', weight,
      'reps', reps,
      'achieved_at', ended_at
    ) order by estimated_one_rep_max desc) as value
    from (
      select * from ranked_estimates
      where rank_for_exercise = 1
      order by estimated_one_rep_max desc
      limit 8
    ) best_estimates
  ),
  record_rows as (
    (
      select 1 as position, jsonb_build_object(
        'kind', 'heaviest_set', 'value', weight, 'unit', 'kg', 'achieved_at', ended_at,
        'exercise_id', exercise_id, 'exercise_name', exercise_name, 'exercise_name_en', exercise_name_en
      ) as record
      from set_rows
      where load_type = 'external' and weight > 0
      order by weight desc, ended_at desc limit 1
    )
    union all
    (
      select 2 as position, jsonb_build_object(
        'kind', 'most_reps', 'value', reps, 'unit', 'reps', 'achieved_at', ended_at,
        'exercise_id', exercise_id, 'exercise_name', exercise_name, 'exercise_name_en', exercise_name_en
      ) as record
      from set_rows
      where reps > 0
      order by reps desc, ended_at desc limit 1
    )
    union all
    (
      select 3 as position, jsonb_build_object(
        'kind', 'largest_session_volume', 'value', volume_kg, 'unit', 'kg', 'achieved_at', ended_at
      ) as record
      from session_volume
      order by volume_kg desc, ended_at desc limit 1
    )
    union all
    (
      select 4 as position, jsonb_build_object(
        'kind', 'longest_session',
        'value', round(greatest(extract(epoch from (ended_at - started_at)), 0) / 60.0, 1),
        'unit', 'minutes', 'achieved_at', ended_at
      ) as record
      from session_volume
      where started_at is not null and ended_at is not null
      order by greatest(extract(epoch from (ended_at - started_at)), 0) desc limit 1
    )
  ),
  records as (
    select jsonb_agg(record order by position) as value
    from record_rows
  )
  select jsonb_build_object(
    'activity', coalesce(activity.value, '[]'::jsonb),
    'routine_days', coalesce(routine_days.value, '[]'::jsonb),
    'records', coalesce(records.value, '[]'::jsonb),
    'estimated_maxes', coalesce(estimated_maxes.value, '[]'::jsonb)
  )
  into v_result
  from activity, routine_days, records, estimated_maxes;

  return v_result;
end;
$$;

-- Extend exercise progression with estimated strength and forward-only plan
-- adherence. Old rows return null adherence instead of fabricated values.
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
      round(sum(case when ssl.load_type = 'external' and coalesce(ssl.weight, 0) > 0 and coalesce(ssl.reps, 0) > 0 then ssl.weight * ssl.reps else 0 end), 1) as volume_kg,
      coalesce(max(case when ssl.load_type = 'external' and ssl.weight > 0 and ssl.reps between 1 and 12 then ssl.weight * (1 + ssl.reps / 30.0) end), 0) as estimated_one_rep_max,
      case when count(*) filter (where ssl.planned_reps is not null or ssl.planned_weight is not null) = 0 then null
        else round(100.0 * count(*) filter (
          where (ssl.planned_reps is null or ssl.reps >= ssl.planned_reps)
            and (ssl.planned_weight is null or ssl.weight >= ssl.planned_weight)
        ) / count(*) filter (where ssl.planned_reps is not null or ssl.planned_weight is not null), 1)
      end as adherence_percent
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
  select jsonb_build_object('points', coalesce(jsonb_agg(jsonb_build_object(
    'bucket_start', bucket_start,
    'sessions', sessions,
    'sets', sets,
    'max_weight', max_weight,
    'max_reps', max_reps,
    'volume_kg', volume_kg,
    'estimated_one_rep_max', round(estimated_one_rep_max, 1),
    'adherence_percent', adherence_percent
  ) order by bucket_start), '[]'::jsonb))
  into v_result
  from points;
  return v_result;
end;
$$;

revoke all on function public.get_progress_insights(timestamp with time zone, timestamp with time zone, text) from public, anon;
grant execute on function public.get_progress_insights(timestamp with time zone, timestamp with time zone, text) to authenticated;

revoke all on function public.capture_routine_session_snapshot() from public, anon, authenticated;
revoke all on function public.capture_session_day_snapshot() from public, anon, authenticated;
revoke all on function public.capture_session_exercise_snapshot() from public, anon, authenticated;
revoke all on function public.capture_session_set_plan() from public, anon, authenticated;
