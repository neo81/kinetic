-- Internal RPC used only by the authenticated Edge Function after it validates
-- the caller's JWT. It runs as service_role (the invoker), so SECURITY DEFINER
-- is unnecessary.
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
