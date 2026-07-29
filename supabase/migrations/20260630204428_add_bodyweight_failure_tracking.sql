alter table public.profiles
  add column if not exists height_cm numeric(5,2),
  add column if not exists body_weight_kg numeric(6,2);

alter table public.routine_day_exercises
  add column if not exists load_type text not null default 'external';

alter table public.exercise_sets
  add column if not exists target_type text not null default 'fixed_reps';

alter table public.session_set_logs
  add column if not exists target_type text not null default 'fixed_reps',
  add column if not exists load_type text not null default 'external',
  add column if not exists body_weight_kg_snapshot numeric(6,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_height_cm_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_height_cm_check
      check (height_cm is null or (height_cm >= 80 and height_cm <= 260));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_body_weight_kg_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_body_weight_kg_check
      check (body_weight_kg is null or (body_weight_kg >= 20 and body_weight_kg <= 400));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'routine_day_exercises_load_type_check'
      and conrelid = 'public.routine_day_exercises'::regclass
  ) then
    alter table public.routine_day_exercises
      add constraint routine_day_exercises_load_type_check
      check (load_type = any (array['external'::text, 'bodyweight'::text]));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exercise_sets_target_type_check'
      and conrelid = 'public.exercise_sets'::regclass
  ) then
    alter table public.exercise_sets
      add constraint exercise_sets_target_type_check
      check (target_type = any (array['fixed_reps'::text, 'failure'::text]));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'session_set_logs_target_type_check'
      and conrelid = 'public.session_set_logs'::regclass
  ) then
    alter table public.session_set_logs
      add constraint session_set_logs_target_type_check
      check (target_type = any (array['fixed_reps'::text, 'failure'::text]));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'session_set_logs_load_type_check'
      and conrelid = 'public.session_set_logs'::regclass
  ) then
    alter table public.session_set_logs
      add constraint session_set_logs_load_type_check
      check (load_type = any (array['external'::text, 'bodyweight'::text]));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'session_set_logs_body_weight_kg_snapshot_check'
      and conrelid = 'public.session_set_logs'::regclass
  ) then
    alter table public.session_set_logs
      add constraint session_set_logs_body_weight_kg_snapshot_check
      check (body_weight_kg_snapshot is null or (body_weight_kg_snapshot >= 20 and body_weight_kg_snapshot <= 400));
  end if;
end $$;

create index if not exists routine_day_exercises_load_type_idx
  on public.routine_day_exercises (load_type);

create index if not exists exercise_sets_target_type_idx
  on public.exercise_sets (target_type);

create or replace function public.end_session_transaction(p_session_id uuid, p_ended_at timestamp with time zone, p_session_data jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_session_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
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

  if v_session_user_id <> auth.uid() then
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
  from jsonb_array_elements(coalesce(p_session_data->'days', '[]'::jsonb)) as day_obj;

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
  from jsonb_array_elements(coalesce(p_session_data->'exercises', '[]'::jsonb)) as exercise_obj
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
  from jsonb_array_elements(coalesce(p_session_data->'sets', '[]'::jsonb)) as set_obj
  join public.session_day_logs sdl
    on sdl.session_id = p_session_id
   and sdl.routine_day_id = (set_obj->>'routine_day_id')::uuid
  join public.session_exercise_logs sel
    on sel.session_day_log_id = sdl.id
   and sel.exercise_id = (set_obj->>'exercise_id')::uuid
   and coalesce(sel.position, 0) = coalesce(nullif(set_obj->>'exercise_position', '')::integer, 0);

  return p_session_id;
exception
  when others then
    raise warning 'Error in end_session_transaction: %', sqlerrm;
    raise;
end;
$function$;

create or replace function public.import_routine(p_routine_name text, p_routine_notes text, p_days jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_routine_id uuid;
  v_day_obj jsonb;
  v_day_id uuid;
  v_exercise_obj jsonb;
  v_rde_id uuid;
  v_set_obj jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.routines (user_id, name, notes, is_active)
  values (auth.uid(), p_routine_name, nullif(p_routine_notes, ''), true)
  returning id into v_routine_id;

  for v_day_obj in select * from jsonb_array_elements(coalesce(p_days, '[]'::jsonb))
  loop
    insert into public.routine_days (
      id,
      routine_id,
      day_type,
      day_number,
      title,
      position
    )
    values (
      coalesce((v_day_obj->>'id')::uuid, gen_random_uuid()),
      v_routine_id,
      v_day_obj->>'day_type',
      nullif(v_day_obj->>'day_number', '')::integer,
      v_day_obj->>'title',
      (v_day_obj->>'position')::integer
    )
    returning id into v_day_id;

    for v_exercise_obj in
      select * from jsonb_array_elements(coalesce(v_day_obj->'exercises', '[]'::jsonb))
    loop
      insert into public.routine_day_exercises (
        id,
        routine_day_id,
        exercise_id,
        position,
        rest_seconds,
        notes,
        measure_unit,
        load_type
      )
      values (
        coalesce((v_exercise_obj->>'id')::uuid, gen_random_uuid()),
        v_day_id,
        (v_exercise_obj->>'exercise_id')::uuid,
        (v_exercise_obj->>'position')::integer,
        nullif(v_exercise_obj->>'rest_seconds', '')::integer,
        nullif(v_exercise_obj->>'notes', ''),
        coalesce(v_exercise_obj->>'measure_unit', 'kg'),
        coalesce(v_exercise_obj->>'load_type', 'external')
      )
      returning id into v_rde_id;

      for v_set_obj in
        select * from jsonb_array_elements(coalesce(v_exercise_obj->'sets', '[]'::jsonb))
      loop
        insert into public.exercise_sets (
          routine_day_exercise_id,
          set_number,
          reps,
          weight,
          duration_minutes,
          duration_seconds,
          notes,
          target_type
        )
        values (
          v_rde_id,
          (v_set_obj->>'set_number')::integer,
          nullif(v_set_obj->>'reps', '')::numeric,
          nullif(v_set_obj->>'weight', '')::numeric,
          nullif(v_set_obj->>'duration_minutes', '')::numeric,
          nullif(v_set_obj->>'duration_seconds', '')::numeric,
          nullif(v_set_obj->>'notes', ''),
          coalesce(v_set_obj->>'target_type', 'fixed_reps')
        );
      end loop;
    end loop;
  end loop;

  return v_routine_id;
exception
  when others then
    raise warning 'Error in import_routine: %', sqlerrm;
    raise;
end;
$function$;;
