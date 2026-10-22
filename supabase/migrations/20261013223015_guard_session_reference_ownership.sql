-- Validate references before any privileged snapshot trigger can read them.
-- No backfill or rewrite of historical rows. PK lookups keep work per row bounded.
create or replace function public.guard_session_reference_ownership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid;
  v_routine uuid;
  v_day uuid;
  v_instance uuid;
  v_exercise uuid;
begin
  if tg_table_name = 'routine_sessions' then
    if new.routine_id is not null and not exists (
      select 1 from public.routines r
      where r.id = new.routine_id and r.user_id = new.user_id
    ) then
      raise exception 'Invalid session reference' using errcode = '42501';
    end if;
  elsif tg_table_name = 'session_day_logs' then
    select s.user_id, s.routine_id into v_owner, v_routine
    from public.routine_sessions s where s.id = new.session_id;
    if not found then
      raise exception 'Invalid session reference' using errcode = '42501';
    end if;
    if new.routine_day_id is not null and not exists (
      select 1 from public.routine_days d
      join public.routines r on r.id = d.routine_id
      where d.id = new.routine_day_id and r.user_id = v_owner
        and (v_routine is null or r.id = v_routine)
    ) then
      raise exception 'Invalid session reference' using errcode = '42501';
    end if;
  elsif tg_table_name = 'session_exercise_logs' then
    select s.user_id, l.routine_day_id into v_owner, v_day
    from public.session_day_logs l
    join public.routine_sessions s on s.id = l.session_id
    where l.id = new.session_day_log_id;
    if not found then
      raise exception 'Invalid session reference' using errcode = '42501';
    end if;
    if new.exercise_id is not null and not exists (
      select 1 from public.exercises e where e.id = new.exercise_id
        and (e.user_id is null or e.user_id = v_owner)
    ) then
      raise exception 'Invalid session reference' using errcode = '42501';
    end if;
    if new.routine_day_exercise_id is not null and not exists (
      select 1 from public.routine_day_exercises i
      join public.routine_days d on d.id = i.routine_day_id
      join public.routines r on r.id = d.routine_id
      where i.id = new.routine_day_exercise_id and r.user_id = v_owner
        and (v_day is null or i.routine_day_id = v_day)
        and (new.exercise_id is null or i.exercise_id = new.exercise_id)
    ) then
      raise exception 'Invalid session reference' using errcode = '42501';
    end if;
  elsif tg_table_name = 'session_set_logs' then
    select s.user_id, l.routine_day_id, e.routine_day_exercise_id, e.exercise_id
    into v_owner, v_day, v_instance, v_exercise
    from public.session_exercise_logs e
    join public.session_day_logs l on l.id = e.session_day_log_id
    join public.routine_sessions s on s.id = l.session_id
    where e.id = new.session_exercise_log_id;
    if not found then
      raise exception 'Invalid session reference' using errcode = '42501';
    end if;
    if v_instance is not null and not exists (
      select 1 from public.routine_day_exercises i
      join public.routine_days d on d.id = i.routine_day_id
      join public.routines r on r.id = d.routine_id
      where i.id = v_instance and r.user_id = v_owner
        and (v_day is null or i.routine_day_id = v_day)
        and (v_exercise is null or i.exercise_id = v_exercise)
    ) then
      raise exception 'Invalid session reference' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_session_reference_ownership() from public, anon, authenticated;

-- Alphabetical ordering puts guards before capture_* triggers. Include parent
-- changes and explicit instance changes, not only the original snapshot columns.
create trigger a_guard_session_references
before insert or update of routine_id, user_id on public.routine_sessions
for each row execute function public.guard_session_reference_ownership();
create trigger a_guard_session_references
before insert or update of session_id, routine_day_id on public.session_day_logs
for each row execute function public.guard_session_reference_ownership();
create trigger a_guard_session_references
before insert or update of session_day_log_id, exercise_id, routine_day_exercise_id, position
on public.session_exercise_logs
for each row execute function public.guard_session_reference_ownership();
create trigger a_guard_session_references
before insert or update of session_exercise_log_id on public.session_set_logs
for each row execute function public.guard_session_reference_ownership();

-- Snapshots need no elevated privileges: authenticated callers already have
-- read access to their own plan; the completion service retains its own role.
alter function public.capture_routine_session_snapshot() security invoker;
alter function public.capture_session_day_snapshot() security invoker;
alter function public.capture_session_exercise_snapshot() security invoker;
alter function public.capture_session_set_plan() security invoker;
