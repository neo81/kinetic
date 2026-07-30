-- Cache auth.uid() once per statement and avoid evaluating ownership policies
-- for anonymous requests that cannot satisfy them.
alter policy "routines_manage_own"
on public.routines
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "routine_days_manage_own"
on public.routine_days
to authenticated
using (
  exists (
    select 1
    from public.routines
    where routines.id = routine_days.routine_id
      and routines.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.routines
    where routines.id = routine_days.routine_id
      and routines.user_id = (select auth.uid())
  )
);

alter policy "routine_day_exercises_manage_own"
on public.routine_day_exercises
to authenticated
using (
  exists (
    select 1
    from public.routine_days
    join public.routines on routines.id = routine_days.routine_id
    where routine_days.id = routine_day_exercises.routine_day_id
      and routines.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.routine_days
    join public.routines on routines.id = routine_days.routine_id
    where routine_days.id = routine_day_exercises.routine_day_id
      and routines.user_id = (select auth.uid())
  )
);

alter policy "exercise_sets_manage_own"
on public.exercise_sets
to authenticated
using (
  exists (
    select 1
    from public.routine_day_exercises
    join public.routine_days
      on routine_days.id = routine_day_exercises.routine_day_id
    join public.routines
      on routines.id = routine_days.routine_id
    where routine_day_exercises.id = exercise_sets.routine_day_exercise_id
      and routines.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.routine_day_exercises
    join public.routine_days
      on routine_days.id = routine_day_exercises.routine_day_id
    join public.routines
      on routines.id = routine_days.routine_id
    where routine_day_exercises.id = exercise_sets.routine_day_exercise_id
      and routines.user_id = (select auth.uid())
  )
);

alter policy "routine_sessions_manage_own"
on public.routine_sessions
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "session_day_logs_manage_own"
on public.session_day_logs
to authenticated
using (
  exists (
    select 1
    from public.routine_sessions
    where routine_sessions.id = session_day_logs.session_id
      and routine_sessions.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.routine_sessions
    where routine_sessions.id = session_day_logs.session_id
      and routine_sessions.user_id = (select auth.uid())
  )
);

alter policy "session_exercise_logs_manage_own"
on public.session_exercise_logs
to authenticated
using (
  exists (
    select 1
    from public.session_day_logs
    join public.routine_sessions
      on routine_sessions.id = session_day_logs.session_id
    where session_day_logs.id = session_exercise_logs.session_day_log_id
      and routine_sessions.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.session_day_logs
    join public.routine_sessions
      on routine_sessions.id = session_day_logs.session_id
    where session_day_logs.id = session_exercise_logs.session_day_log_id
      and routine_sessions.user_id = (select auth.uid())
  )
);

alter policy "session_set_logs_manage_own"
on public.session_set_logs
to authenticated
using (
  exists (
    select 1
    from public.session_exercise_logs
    join public.session_day_logs
      on session_day_logs.id = session_exercise_logs.session_day_log_id
    join public.routine_sessions
      on routine_sessions.id = session_day_logs.session_id
    where session_exercise_logs.id = session_set_logs.session_exercise_log_id
      and routine_sessions.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.session_exercise_logs
    join public.session_day_logs
      on session_day_logs.id = session_exercise_logs.session_day_log_id
    join public.routine_sessions
      on routine_sessions.id = session_day_logs.session_id
    where session_exercise_logs.id = session_set_logs.session_exercise_log_id
      and routine_sessions.user_id = (select auth.uid())
  )
);

alter policy "profiles_insert_own"
on public.profiles
to authenticated
with check ((select auth.uid()) = id);

alter policy "profiles_select_own"
on public.profiles
to authenticated
using ((select auth.uid()) = id);

alter policy "profiles_update_own"
on public.profiles
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

alter policy "Usuarios pueden crear sus propios ejercicios"
on public.exercises
to authenticated
with check (user_id = (select auth.uid()));

alter policy "Usuarios pueden actualizar sus propios ejercicios"
on public.exercises
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter policy "Usuarios pueden borrar sus propios ejercicios"
on public.exercises
to authenticated
using (user_id = (select auth.uid()));

alter policy "favorites_select_own"
on public.exercise_favorites
to authenticated
using (user_id = (select auth.uid()));

alter policy "favorites_insert_own"
on public.exercise_favorites
to authenticated
with check (user_id = (select auth.uid()));

alter policy "favorites_delete_own"
on public.exercise_favorites
to authenticated
using (user_id = (select auth.uid()));

alter policy "users_view_own_goals"
on public.user_goals
to authenticated
using (user_id = (select auth.uid()));

alter policy "users_insert_own_goals"
on public.user_goals
to authenticated
with check (user_id = (select auth.uid()));

alter policy "users_update_own_goals"
on public.user_goals
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter policy "Users can view their own preferences"
on public.user_preferences
to authenticated
using ((select auth.uid()) = user_id);

alter policy "Users can insert their own preferences"
on public.user_preferences
to authenticated
with check ((select auth.uid()) = user_id);

alter policy "Users can update their own preferences"
on public.user_preferences
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "users_view_own_weekly_stats"
on public.weekly_statistics
to authenticated
using (user_id = (select auth.uid()));

alter policy "users_insert_own_weekly_stats"
on public.weekly_statistics
to authenticated
with check (user_id = (select auth.uid()));

alter policy "users_update_own_weekly_stats"
on public.weekly_statistics
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter policy "rate_limits_select_own"
on public.function_rate_limits
to authenticated
using (user_id = (select auth.uid()));

alter policy "rate_limits_insert_own"
on public.function_rate_limits
to authenticated
with check (user_id = (select auth.uid()));

alter policy "rate_limits_update_own"
on public.function_rate_limits
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter policy "rate_limits_delete_own"
on public.function_rate_limits
to authenticated
using (user_id = (select auth.uid()));

-- Index the referencing side of foreign keys used by joins and cascades.
create index if not exists exercises_user_id_idx
  on public.exercises (user_id);

create index if not exists routine_day_exercises_exercise_id_idx
  on public.routine_day_exercises (exercise_id);

create index if not exists routine_sessions_routine_id_idx
  on public.routine_sessions (routine_id);

create index if not exists session_day_logs_routine_day_id_idx
  on public.session_day_logs (routine_day_id);

create index if not exists session_exercise_logs_exercise_id_idx
  on public.session_exercise_logs (exercise_id);

-- Keep the indexes owned by UNIQUE constraints and remove their identical
-- standalone predecessors.
drop index if exists public.muscle_groups_code_idx;
drop index if exists public.profiles_username_idx;
