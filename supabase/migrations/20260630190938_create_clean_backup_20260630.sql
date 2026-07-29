create schema if not exists backup_clean_20260630;

create temp table _backup_test_users on commit drop as
select id
from auth.users
where lower(email) ~ '^test[0-9]*@mail\.com$';

create temp table _backup_e2e_routines on commit drop as
select r.id
from public.routines r
join _backup_test_users u on u.id = r.user_id
where r.name ilike 'E2E %'
   or r.name in ('E2E Rutina Test', 'E2E Rutina Usuario 2');

create temp table _backup_clean_users on commit drop as
select id
from auth.users
where id not in (select id from _backup_test_users);

create table backup_clean_20260630.auth_users_snapshot as
select id, email, created_at, updated_at, last_sign_in_at, email_confirmed_at
from auth.users
where id in (select id from _backup_clean_users);

create table backup_clean_20260630.muscle_groups as
select * from public.muscle_groups;

create table backup_clean_20260630.profiles as
select p.*
from public.profiles p
where p.id in (select id from _backup_clean_users);

create table backup_clean_20260630.user_preferences as
select up.*
from public.user_preferences up
where up.user_id in (select id from _backup_clean_users);

create table backup_clean_20260630.user_goals as
select ug.*
from public.user_goals ug
where ug.user_id in (select id from _backup_clean_users);

create table backup_clean_20260630.weekly_statistics as
select ws.*
from public.weekly_statistics ws
where ws.user_id in (select id from _backup_clean_users);

create table backup_clean_20260630.function_rate_limits as
select frl.*
from public.function_rate_limits frl
where frl.user_id in (select id from _backup_clean_users);

create table backup_clean_20260630.exercises as
select e.*
from public.exercises e
where e.user_id is null
   or e.user_id in (select id from _backup_clean_users);

create table backup_clean_20260630.routines as
select r.*
from public.routines r
where r.user_id in (select id from _backup_clean_users)
  and r.id not in (select id from _backup_e2e_routines);

create table backup_clean_20260630.routine_days as
select rd.*
from public.routine_days rd
where rd.routine_id in (select id from backup_clean_20260630.routines);

create table backup_clean_20260630.routine_day_exercises as
select rde.*
from public.routine_day_exercises rde
where rde.routine_day_id in (select id from backup_clean_20260630.routine_days)
  and rde.exercise_id in (select id from backup_clean_20260630.exercises);

create table backup_clean_20260630.exercise_sets as
select es.*
from public.exercise_sets es
where es.routine_day_exercise_id in (select id from backup_clean_20260630.routine_day_exercises);

create table backup_clean_20260630.exercise_favorites as
select ef.*
from public.exercise_favorites ef
where ef.user_id in (select id from _backup_clean_users)
  and ef.exercise_id in (select id from backup_clean_20260630.exercises);

create table backup_clean_20260630.routine_sessions as
select rs.*
from public.routine_sessions rs
where rs.user_id in (select id from _backup_clean_users)
  and (rs.routine_id is null or rs.routine_id in (select id from backup_clean_20260630.routines));

create table backup_clean_20260630.session_day_logs as
select sdl.*
from public.session_day_logs sdl
where sdl.session_id in (select id from backup_clean_20260630.routine_sessions);

create table backup_clean_20260630.session_exercise_logs as
select sel.*
from public.session_exercise_logs sel
where sel.session_day_log_id in (select id from backup_clean_20260630.session_day_logs)
  and (sel.exercise_id is null or sel.exercise_id in (select id from backup_clean_20260630.exercises));

create table backup_clean_20260630.session_set_logs as
select ssl.*
from public.session_set_logs ssl
where ssl.session_exercise_log_id in (select id from backup_clean_20260630.session_exercise_logs);

create table backup_clean_20260630.backup_metadata as
select
  now() as created_at,
  'inbfezuypeneqjjusuug'::text as project_id,
  'Kinetic'::text as project_name,
  'backup_clean_20260630'::text as backup_schema,
  'Excluye auth.users test*@mail.com y datos E2E asociados'::text as notes;

create table backup_clean_20260630.backup_counts as
select 'auth_users_snapshot' as table_name, count(*)::bigint as total from backup_clean_20260630.auth_users_snapshot
union all select 'muscle_groups', count(*) from backup_clean_20260630.muscle_groups
union all select 'profiles', count(*) from backup_clean_20260630.profiles
union all select 'user_preferences', count(*) from backup_clean_20260630.user_preferences
union all select 'user_goals', count(*) from backup_clean_20260630.user_goals
union all select 'weekly_statistics', count(*) from backup_clean_20260630.weekly_statistics
union all select 'function_rate_limits', count(*) from backup_clean_20260630.function_rate_limits
union all select 'exercises', count(*) from backup_clean_20260630.exercises
union all select 'exercise_favorites', count(*) from backup_clean_20260630.exercise_favorites
union all select 'routines', count(*) from backup_clean_20260630.routines
union all select 'routine_days', count(*) from backup_clean_20260630.routine_days
union all select 'routine_day_exercises', count(*) from backup_clean_20260630.routine_day_exercises
union all select 'exercise_sets', count(*) from backup_clean_20260630.exercise_sets
union all select 'routine_sessions', count(*) from backup_clean_20260630.routine_sessions
union all select 'session_day_logs', count(*) from backup_clean_20260630.session_day_logs
union all select 'session_exercise_logs', count(*) from backup_clean_20260630.session_exercise_logs
union all select 'session_set_logs', count(*) from backup_clean_20260630.session_set_logs;;
