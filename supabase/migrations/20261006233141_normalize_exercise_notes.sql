-- Keep one editable note per exercise instance in a routine. Historical
-- session_exercise_logs.notes remains untouched as the session snapshot.
with legacy_notes as (
  select distinct on (routine_day_exercise_id)
    routine_day_exercise_id,
    nullif(btrim(notes), '') as notes
  from public.exercise_sets
  where nullif(btrim(notes), '') is not null
  order by routine_day_exercise_id, set_number
)
update public.routine_day_exercises as routine_exercise
set notes = legacy_notes.notes
from legacy_notes
where routine_exercise.id = legacy_notes.routine_day_exercise_id
  and nullif(btrim(routine_exercise.notes), '') is null;

-- The legacy service-role import RPC is kept compatible, but series no longer
-- receive duplicated notes. Client imports use normal RLS-protected inserts.
create or replace function public.import_routine(
  p_routine_name text,
  p_routine_notes text,
  p_days jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
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

  for v_day_obj in
    select * from jsonb_array_elements(coalesce(p_days, '[]'::jsonb))
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
          target_type
        )
        values (
          v_rde_id,
          (v_set_obj->>'set_number')::integer,
          nullif(v_set_obj->>'reps', '')::numeric,
          nullif(v_set_obj->>'weight', '')::numeric,
          nullif(v_set_obj->>'duration_minutes', '')::numeric,
          nullif(v_set_obj->>'duration_seconds', '')::numeric,
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
$function$;

revoke execute on function public.import_routine(text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.import_routine(text, text, jsonb)
  to service_role;

alter table public.exercise_sets
  drop column notes;
