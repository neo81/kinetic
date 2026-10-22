-- Always roll back fixtures. Uses two existing profile
-- IDs without reading personal fields or changing profiles or existing routines.
begin;
set local statement_timeout = '25s';
set local kinetic.test_guards = 'on';
create temporary table security_results (checks integer, completion_ms numeric);
do $$
declare
  a uuid; b uuid; muscle uuid;
  ra uuid := gen_random_uuid(); rb uuid := gen_random_uuid();
  da uuid := gen_random_uuid(); db uuid := gen_random_uuid();
  ea uuid := gen_random_uuid(); eb uuid := gen_random_uuid();
  ia uuid := gen_random_uuid(); ib uuid := gen_random_uuid();
  sa uuid := gen_random_uuid(); sb uuid := gen_random_uuid();
  la uuid := gen_random_uuid(); lb uuid := gen_random_uuid();
  xa uuid := gen_random_uuid(); xb uuid := gen_random_uuid();
  command text; checks integer := 0; payload jsonb;
  started timestamptz; elapsed numeric; result_name text;
begin
  select id into a from public.profiles order by id limit 1;
  select id into b from public.profiles where id <> a order by id limit 1;
  select id into muscle from public.muscle_groups limit 1;
  if a is null or b is null or muscle is null then raise exception 'Fixtures need two profiles and a muscle group'; end if;
  insert into public.routines(id,user_id,name) values (ra,a,'Security transactional A'),(rb,b,'Security transactional B');
  insert into public.routine_days(id,routine_id,day_type,day_number,position,title)
    values (da,ra,'weekday',1,1,'A'),(db,rb,'weekday',1,1,'B');
  insert into public.exercises(id,user_id,name,muscle_group_id)
    values (ea,a,'Security transient A',muscle),(eb,b,'Security transient B',muscle);
  insert into public.routine_day_exercises(id,routine_day_id,exercise_id,position)
    values (ia,da,ea,1),(ib,db,eb,1);
  insert into public.exercise_sets(routine_day_exercise_id,set_number,reps,weight)
    select ia,n,10,20 from generate_series(1,120) n;
  insert into public.routine_sessions(id,user_id,routine_id,status)
    values (sb,b,rb,'in_progress');
  insert into public.session_day_logs(id,session_id,routine_day_id) values (lb,sb,db);
  insert into public.session_exercise_logs(id,session_day_log_id,exercise_id,position) values (xb,lb,eb,1);

  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  insert into public.routine_sessions(id,user_id,routine_id,status) values (sa,a,ra,'in_progress');
  insert into public.session_day_logs(id,session_id,routine_day_id) values (la,sa,da);
  insert into public.session_exercise_logs(id,session_day_log_id,exercise_id,position) values (xa,la,ea,1);
  insert into public.session_set_logs(session_exercise_log_id,set_number,reps,weight) values (xa,1,10,20);
  if not exists (select 1 from public.session_set_logs where session_exercise_log_id=xa and planned_weight=20) then
    raise exception 'Own plan snapshot missing';
  end if;
  checks := checks+1;
  if current_setting('kinetic.test_guards',true) = 'on' then
    foreach command in array array[
      format('insert into public.routine_sessions(user_id,routine_id) values (%L,%L)',a,rb),
      format('update public.routine_sessions set routine_id=%L where id=%L',rb,sa),
      format('insert into public.session_day_logs(session_id,routine_day_id) values (%L,%L)',sa,db),
      format('update public.session_day_logs set routine_day_id=%L where id=%L',db,la),
      format('update public.session_day_logs set session_id=%L where id=%L',sb,la),
      format('insert into public.session_exercise_logs(session_day_log_id,exercise_id,position) values (%L,%L,1)',la,eb),
      format('update public.session_exercise_logs set routine_day_exercise_id=%L where id=%L',ib,xa),
      format('update public.session_exercise_logs set session_day_log_id=%L where id=%L',lb,xa),
      format('insert into public.session_set_logs(session_exercise_log_id,set_number) values (%L,2)',xb)
    ] loop
      begin
        execute command;
        raise exception 'Cross-user write unexpectedly accepted';
      exception when insufficient_privilege then checks := checks+1;
      end;
    end loop;
  end if;

  execute 'reset role';
  select jsonb_build_object(
    'days',jsonb_build_array(jsonb_build_object('routine_day_id',da)),
    'exercises',jsonb_build_array(jsonb_build_object('routine_day_id',da,'exercise_id',ea,'position',1)),
    'sets',(select jsonb_agg(jsonb_build_object('routine_day_id',da,'exercise_id',ea,
      'exercise_position',1,'routine_day_exercise_id',ia,'set_number',n,
      'actual_reps',10,'actual_weight',20,'planned_weight',20)) from generate_series(1,120) n)
  ) into payload;
  execute 'set local role service_role';
  started := clock_timestamp();
  perform public.end_session_transaction_service(sa,a,now(),payload);
  elapsed := extract(epoch from clock_timestamp()-started)*1000;
  if (select count(*) from public.session_set_logs l join public.session_exercise_logs e on e.id=l.session_exercise_log_id
      join public.session_day_logs d on d.id=e.session_day_log_id where d.session_id=sa) <> 120 then
    raise exception 'Completion lost sets';
  end if;
  checks := checks+1;
  -- A repeated offline sync must still work.
  perform public.end_session_transaction_service(sa,a,now(),payload);
  checks := checks+1;
  if current_setting('kinetic.test_guards',true) = 'on' then
    begin
      perform public.end_session_transaction_service(sa,a,now(),jsonb_build_object(
        'days',jsonb_build_array(jsonb_build_object('routine_day_id',db))));
      raise exception 'Service accepted a foreign day';
    exception when insufficient_privilege then checks := checks+1;
    end;
  end if;
  if (select count(*) from public.session_set_logs l join public.session_exercise_logs e on e.id=l.session_exercise_log_id
      join public.session_day_logs d on d.id=e.session_day_log_id where d.session_id=sa) <> 120 then
    raise exception 'Rejected completion damaged history';
  end if;
  checks := checks+1;
  -- Deleting a plan keeps the completed history and nulls foreign keys.
  execute 'set local role authenticated';
  delete from public.routines where id=ra;
  select routine_name_snapshot into result_name from public.routine_sessions where id=sa and routine_id is null;
  if result_name is distinct from 'Security transactional A' then raise exception 'History snapshot lost on delete'; end if;
  checks := checks+1;
  execute 'reset role';
  insert into security_results values (checks,elapsed);
end;
$$;
select * from security_results;
rollback;
