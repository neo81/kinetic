create or replace function public.reorder_routine_day_exercises(
  p_routine_day_id uuid,
  p_ordered_exercise_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expected_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.routine_days as rd
    join public.routines as r on r.id = rd.routine_id
    where rd.id = p_routine_day_id
      and r.user_id = (select auth.uid())
  ) then
    raise exception 'Routine day not found';
  end if;

  select count(*)
  into v_expected_count
  from public.routine_day_exercises
  where routine_day_id = p_routine_day_id;

  if cardinality(p_ordered_exercise_ids) <> v_expected_count
    or (
      select count(distinct requested_id.exercise_id)
      from unnest(p_ordered_exercise_ids) as requested_id(exercise_id)
    ) <> v_expected_count
    or exists (
      select 1
      from unnest(p_ordered_exercise_ids) as requested_id(exercise_id)
      where not exists (
        select 1
        from public.routine_day_exercises as rde
        where rde.routine_day_id = p_routine_day_id
          and rde.id = requested_id.exercise_id
      )
    )
  then
    raise exception 'Exercise order does not match routine day';
  end if;

  with temporary_positions as (
    select
      id,
      row_number() over (order by position, id) as temporary_position
    from public.routine_day_exercises
    where routine_day_id = p_routine_day_id
  )
  update public.routine_day_exercises as rde
  set position = (-1000000 - temporary_positions.temporary_position)::integer
  from temporary_positions
  where rde.id = temporary_positions.id;

  update public.routine_day_exercises as rde
  set position = requested.position::integer
  from unnest(p_ordered_exercise_ids) with ordinality as requested(id, position)
  where rde.routine_day_id = p_routine_day_id
    and rde.id = requested.id;
end;
$$;

revoke execute on function public.reorder_routine_day_exercises(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_routine_day_exercises(uuid, uuid[]) to authenticated;
