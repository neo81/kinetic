-- Complete a session and promote a uniform higher working weight into the
-- originating routine exercise. The progression is derived server-side from
-- the recorded sets so queued retries are idempotent and cannot affect a
-- different user's routine.
create or replace function public.end_session_transaction_service(
  p_session_id uuid,
  p_user_id uuid,
  p_ended_at timestamptz,
  p_session_data jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_session_user_id uuid;
  v_progressed_exercise_ids uuid[];
begin
  if p_user_id is null then
    raise exception 'Validated user is required'
      using errcode = '42501';
  end if;

  select user_id
  into v_session_user_id
  from public.routine_sessions
  where id = p_session_id;

  if v_session_user_id is null then
    raise exception 'Session not found'
      using errcode = 'P0002';
  end if;

  if v_session_user_id <> p_user_id then
    raise exception 'Not authorized to end this session'
      using errcode = '42501';
  end if;

  delete from public.session_day_logs
  where session_id = p_session_id;

  update public.routine_sessions
  set
    status = 'completed',
    ended_at = p_ended_at
  where id = p_session_id;

  insert into public.session_day_logs (
    session_id,
    routine_day_id,
    started_at,
    ended_at
  )
  select
    p_session_id,
    (day_obj->>'routine_day_id')::uuid,
    null,
    p_ended_at
  from pg_catalog.jsonb_array_elements(
    coalesce(p_session_data->'days', '[]'::jsonb)
  ) as day_obj;

  insert into public.session_exercise_logs (
    session_day_log_id,
    exercise_id,
    position,
    notes
  )
  select
    sdl.id,
    (exercise_obj->>'exercise_id')::uuid,
    nullif(exercise_obj->>'position', '')::integer,
    nullif(exercise_obj->>'notes', '')
  from pg_catalog.jsonb_array_elements(
    coalesce(p_session_data->'exercises', '[]'::jsonb)
  ) as exercise_obj
  join public.session_day_logs sdl
    on sdl.session_id = p_session_id
   and sdl.routine_day_id = (exercise_obj->>'routine_day_id')::uuid;

  insert into public.session_set_logs (
    session_exercise_log_id,
    set_number,
    reps,
    weight,
    duration_minutes,
    duration_seconds,
    completed,
    target_type,
    load_type,
    body_weight_kg_snapshot
  )
  select
    sel.id,
    (set_obj->>'set_number')::integer,
    coalesce(
      nullif(set_obj->>'actual_reps', '')::numeric,
      nullif(set_obj->>'planned_reps', '')::numeric
    ),
    coalesce(
      nullif(set_obj->>'actual_weight', '')::numeric,
      nullif(set_obj->>'planned_weight', '')::numeric
    ),
    coalesce(
      nullif(set_obj->>'actual_duration_minutes', '')::numeric,
      nullif(set_obj->>'planned_duration_minutes', '')::numeric
    ),
    nullif(set_obj->>'actual_duration_seconds', '')::numeric,
    true,
    coalesce(nullif(set_obj->>'target_type', ''), 'fixed_reps'),
    coalesce(nullif(set_obj->>'load_type', ''), 'external'),
    nullif(set_obj->>'body_weight_kg_snapshot', '')::numeric
  from pg_catalog.jsonb_array_elements(
    coalesce(p_session_data->'sets', '[]'::jsonb)
  ) as set_obj
  join public.session_day_logs sdl
    on sdl.session_id = p_session_id
   and sdl.routine_day_id = (set_obj->>'routine_day_id')::uuid
  join public.session_exercise_logs sel
    on sel.session_day_log_id = sdl.id
   and sel.exercise_id = (set_obj->>'exercise_id')::uuid
   and coalesce(sel.position, 0) = coalesce(
     nullif(set_obj->>'exercise_position', '')::integer,
     0
   );

  -- Serialize progression against edits from another device. The following
  -- statement gets a fresh snapshot after these rows are locked and only
  -- promotes weights that still match the plan captured at session start.
  perform 1
  from public.exercise_sets planned
  join public.routine_day_exercises rde
    on rde.id = planned.routine_day_exercise_id
  join public.routine_days rd
    on rd.id = rde.routine_day_id
  join public.routine_sessions session
    on session.id = p_session_id
   and session.routine_id = rd.routine_id
   and session.user_id = p_user_id
  where rde.id in (
    select nullif(set_obj->>'routine_day_exercise_id', '')::uuid
    from pg_catalog.jsonb_array_elements(
      coalesce(p_session_data->'sets', '[]'::jsonb)
    ) as set_obj
    where nullif(set_obj->>'routine_day_exercise_id', '') is not null
  )
  for update of planned;

  with recorded_sets as (
    select
      nullif(set_obj->>'routine_day_exercise_id', '')::uuid as routine_day_exercise_id,
      nullif(set_obj->>'set_number', '')::integer as set_number,
      nullif(set_obj->>'planned_weight', '')::numeric as planned_weight,
      nullif(set_obj->>'actual_weight', '')::numeric as actual_weight,
      nullif(set_obj->>'actual_reps', '')::numeric as actual_reps,
      coalesce(nullif(set_obj->>'load_type', ''), 'external') as load_type
    from pg_catalog.jsonb_array_elements(
      coalesce(p_session_data->'sets', '[]'::jsonb)
    ) as set_obj
  ),
  eligible_progressions as (
    select
      rde.id as routine_day_exercise_id,
      min(planned.weight) as previous_weight,
      min(recorded.actual_weight) as new_weight
    from recorded_sets recorded
    join public.routine_day_exercises rde
      on rde.id = recorded.routine_day_exercise_id
    join public.routine_days rd
      on rd.id = rde.routine_day_id
    join public.routines routine
      on routine.id = rd.routine_id
     and routine.user_id = p_user_id
    join public.routine_sessions session
      on session.id = p_session_id
     and session.routine_id = routine.id
     and session.user_id = p_user_id
    join public.exercise_sets planned
      on planned.routine_day_exercise_id = rde.id
     and planned.set_number = recorded.set_number
    where coalesce(rde.measure_unit, 'kg') = 'kg'
      and rde.load_type = 'external'
      and exists (
        select 1
        from pg_catalog.jsonb_array_elements(
          coalesce(p_session_data->'days', '[]'::jsonb)
        ) as day_obj
        where (day_obj->>'routine_day_id')::uuid = rde.routine_day_id
      )
    group by rde.id
    having count(*) = count(distinct recorded.set_number)
      and count(*) = (
        select count(*)
        from public.exercise_sets all_planned
        where all_planned.routine_day_exercise_id = rde.id
      )
      and pg_catalog.bool_and(recorded.load_type = 'external')
      and pg_catalog.bool_and(recorded.actual_reps is not null and recorded.actual_reps > 0)
      and pg_catalog.bool_and(recorded.actual_weight is not null and recorded.actual_weight > 0)
      and min(recorded.actual_weight) = max(recorded.actual_weight)
      and pg_catalog.bool_and(recorded.planned_weight is not null)
      and min(recorded.planned_weight) = max(recorded.planned_weight)
      and pg_catalog.bool_and(planned.weight is not null)
      and min(planned.weight) = max(planned.weight)
      and pg_catalog.bool_and(planned.weight is not distinct from recorded.planned_weight)
      and min(recorded.actual_weight) > max(planned.weight)
  ),
  updated_sets as (
    update public.exercise_sets exercise_set
    set weight = progression.new_weight
    from eligible_progressions progression
    where exercise_set.routine_day_exercise_id = progression.routine_day_exercise_id
      and exercise_set.weight is not distinct from progression.previous_weight
    returning exercise_set.routine_day_exercise_id
  )
  select pg_catalog.array_agg(distinct routine_day_exercise_id)
  into v_progressed_exercise_ids
  from updated_sets;

  if coalesce(pg_catalog.cardinality(v_progressed_exercise_ids), 0) > 0 then
    update public.routines routine
    set updated_at = pg_catalog.now()
    from public.routine_sessions session
    where session.id = p_session_id
      and session.user_id = p_user_id
      and routine.id = session.routine_id
      and routine.user_id = p_user_id;
  end if;

  return p_session_id;
exception
  when others then
    raise warning 'Error in end_session_transaction_service: %', sqlerrm;
    raise;
end;
$function$;

revoke execute on function public.end_session_transaction_service(
  uuid,
  uuid,
  timestamptz,
  jsonb
) from public, anon, authenticated;

grant execute on function public.end_session_transaction_service(
  uuid,
  uuid,
  timestamptz,
  jsonb
) to service_role;
