create or replace function public.get_exercise_set_progress(
  p_exercise_id uuid,
  p_from timestamp with time zone,
  p_to timestamp with time zone
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
    raise exception 'Invalid exercise set progress range' using errcode = '22023';
  end if;

  with recent_points as (
    select
      rs.id as session_id,
      rs.ended_at as performed_at,
      ssl.set_number,
      ssl.reps,
      ssl.weight
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
      and ssl.load_type = 'external'
      and ssl.weight is not null
      and ssl.weight > 0
    order by rs.ended_at desc, ssl.set_number desc
    limit 600
  )
  select jsonb_build_object(
    'points', coalesce(jsonb_agg(jsonb_build_object(
      'session_id', session_id,
      'performed_at', performed_at,
      'set_number', set_number,
      'reps', reps,
      'weight', weight
    ) order by performed_at, set_number), '[]'::jsonb)
  )
  into v_result
  from recent_points;

  return v_result;
end;
$$;

revoke all on function public.get_exercise_set_progress(uuid, timestamp with time zone, timestamp with time zone) from public;
revoke all on function public.get_exercise_set_progress(uuid, timestamp with time zone, timestamp with time zone) from anon;
grant execute on function public.get_exercise_set_progress(uuid, timestamp with time zone, timestamp with time zone) to authenticated;
