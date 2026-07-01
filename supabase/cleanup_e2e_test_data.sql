-- Limpieza de datos E2E/test en Kinectic.
--
-- Uso recomendado en Supabase SQL Editor:
-- 1. Ejecutar primero la seccion PREVIEW para revisar candidatos.
-- 2. Si los resultados son correctos, ejecutar la seccion DELETE.
--
-- Este script NO borra usuarios auth.
-- Borra:
-- - sesiones ligadas a rutinas E2E de usuarios test;
-- - rutinas E2E de usuarios test y sus dependencias por cascade;
-- - ejercicios custom de usuarios test que queden sin referencias.
-- - estadisticas semanales y rate limits generados para usuarios test.
--
-- Usuarios test contemplados:
-- test@mail.com, test2@mail.com, test3@mail.com, test4@mail.com, test5@mail.com
-- y cualquier email que cumpla test<numero>@mail.com.

-- ============================================================================
-- PREVIEW
-- ============================================================================

with test_users as (
  select id, email
  from auth.users
  where lower(email) ~ '^test[0-9]*@mail\.com$'
),
e2e_routines as (
  select r.id, r.user_id, r.name
  from public.routines r
  join test_users u on u.id = r.user_id
  where r.name ilike 'E2E %'
     or r.name in (
       'E2E Rutina Test',
       'E2E Rutina Usuario 2'
     )
),
e2e_sessions as (
  select rs.id, rs.user_id, rs.routine_id, rs.status
  from public.routine_sessions rs
  join test_users u on u.id = rs.user_id
  where rs.routine_id in (select id from e2e_routines)
),
candidate_exercises as (
  select e.id, e.user_id, e.name
  from public.exercises e
  join test_users u on u.id = e.user_id
  where e.user_id is not null
),
candidate_orphan_exercises_after_e2e_delete as (
  select e.id, e.user_id, e.name
  from candidate_exercises e
  where not exists (
    select 1
    from public.routine_day_exercises rde
    join public.routine_days rd on rd.id = rde.routine_day_id
    where rde.exercise_id = e.id
      and rd.routine_id not in (select id from e2e_routines)
  )
  and not exists (
    select 1
    from public.session_exercise_logs sel
    join public.session_day_logs sdl on sdl.id = sel.session_day_log_id
    join public.routine_sessions rs on rs.id = sdl.session_id
    where sel.exercise_id = e.id
      and rs.id not in (select id from e2e_sessions)
  )
)
select 'test_users' as item, count(*) as total from test_users
union all
select 'e2e_routines', count(*) from e2e_routines
union all
select 'e2e_sessions', count(*) from e2e_sessions
union all
select 'custom_test_exercises_orphan_after_delete', count(*) from candidate_orphan_exercises_after_e2e_delete;

with test_users as (
  select id, email
  from auth.users
  where lower(email) ~ '^test[0-9]*@mail\.com$'
)
select 'weekly_statistics' as item, count(*) as total
from public.weekly_statistics ws
join test_users u on u.id = ws.user_id
union all
select 'function_rate_limits', count(*)
from public.function_rate_limits frl
join test_users u on u.id = frl.user_id
union all
select 'profiles_kept', count(*)
from public.profiles p
join test_users u on u.id = p.id
union all
select 'user_preferences_kept', count(*)
from public.user_preferences up
join test_users u on u.id = up.user_id;

with test_users as (
  select id, email
  from auth.users
  where lower(email) ~ '^test[0-9]*@mail\.com$'
),
e2e_routines as (
  select r.id, r.user_id, r.name, r.created_at, r.updated_at
  from public.routines r
  join test_users u on u.id = r.user_id
  where r.name ilike 'E2E %'
     or r.name in (
       'E2E Rutina Test',
       'E2E Rutina Usuario 2'
     )
)
select u.email, r.name, r.id, r.created_at, r.updated_at
from e2e_routines r
join test_users u on u.id = r.user_id
order by u.email, r.name;

with test_users as (
  select id, email
  from auth.users
  where lower(email) ~ '^test[0-9]*@mail\.com$'
),
e2e_routines as (
  select r.id
  from public.routines r
  join test_users u on u.id = r.user_id
  where r.name ilike 'E2E %'
     or r.name in (
       'E2E Rutina Test',
       'E2E Rutina Usuario 2'
     )
),
e2e_sessions as (
  select rs.id
  from public.routine_sessions rs
  join test_users u on u.id = rs.user_id
  where rs.routine_id in (select id from e2e_routines)
),
candidate_orphan_exercises_after_e2e_delete as (
  select e.id, e.user_id, e.name, e.created_at
  from public.exercises e
  join test_users u on u.id = e.user_id
  where e.user_id is not null
    and not exists (
      select 1
      from public.routine_day_exercises rde
      join public.routine_days rd on rd.id = rde.routine_day_id
      where rde.exercise_id = e.id
        and rd.routine_id not in (select id from e2e_routines)
    )
    and not exists (
      select 1
      from public.session_exercise_logs sel
      join public.session_day_logs sdl on sdl.id = sel.session_day_log_id
      join public.routine_sessions rs on rs.id = sdl.session_id
      where sel.exercise_id = e.id
        and rs.id not in (select id from e2e_sessions)
    )
)
select u.email, e.name, e.id, e.created_at
from candidate_orphan_exercises_after_e2e_delete e
join test_users u on u.id = e.user_id
order by u.email, e.name;

-- ============================================================================
-- DELETE
-- ============================================================================

begin;

create temp table cleanup_test_users on commit drop as
select id, email
from auth.users
where lower(email) ~ '^test[0-9]*@mail\.com$';

create temp table cleanup_e2e_routines on commit drop as
select r.id, r.user_id, r.name
from public.routines r
join cleanup_test_users u on u.id = r.user_id
where r.name ilike 'E2E %'
   or r.name in (
     'E2E Rutina Test',
     'E2E Rutina Usuario 2'
   );

create temp table cleanup_e2e_sessions on commit drop as
select rs.id
from public.routine_sessions rs
join cleanup_test_users u on u.id = rs.user_id
where rs.routine_id in (select id from cleanup_e2e_routines);

create temp table cleanup_weekly_statistics on commit drop as
select ws.id
from public.weekly_statistics ws
join cleanup_test_users u on u.id = ws.user_id;

create temp table cleanup_function_rate_limits on commit drop as
select frl.user_id
from public.function_rate_limits frl
join cleanup_test_users u on u.id = frl.user_id;

delete from public.routine_sessions
where id in (select id from cleanup_e2e_sessions);

delete from public.routines
where id in (select id from cleanup_e2e_routines);

delete from public.weekly_statistics
where id in (select id from cleanup_weekly_statistics);

delete from public.function_rate_limits
where user_id in (select user_id from cleanup_function_rate_limits);

create temp table cleanup_orphan_test_exercises on commit drop as
select e.id, e.user_id, e.name
from public.exercises e
join cleanup_test_users u on u.id = e.user_id
where e.user_id is not null
  and not exists (
    select 1
    from public.routine_day_exercises rde
    where rde.exercise_id = e.id
  )
  and not exists (
    select 1
    from public.session_exercise_logs sel
    where sel.exercise_id = e.id
  );

delete from public.exercises
where id in (select id from cleanup_orphan_test_exercises);

select 'deleted_e2e_sessions' as item, count(*) as total from cleanup_e2e_sessions
union all
select 'deleted_e2e_routines', count(*) from cleanup_e2e_routines
union all
select 'deleted_orphan_test_exercises', count(*) from cleanup_orphan_test_exercises
union all
select 'deleted_weekly_statistics', count(*) from cleanup_weekly_statistics
union all
select 'deleted_function_rate_limits', count(*) from cleanup_function_rate_limits;

commit;

-- OPCIONAL, ejecutar solo si queres eliminar tambien los usuarios test:
-- delete from auth.users
-- where lower(email) ~ '^test[0-9]*@mail\.com$';
--
-- Al borrar auth.users, Supabase cascada a profiles/user_preferences y otros datos
-- dependientes de esos usuarios. No esta incluido por defecto porque elimina cuentas.
