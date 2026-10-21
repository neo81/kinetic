begin;
set local statement_timeout = '20s';
do $test$
declare
 u uuid; m bigint; r uuid := gen_random_uuid(); d uuid := gen_random_uuid();
 e uuid := gen_random_uuid(); i uuid := gen_random_uuid(); s uuid;
 w numeric; payload jsonb;
begin
 select id into u from public.profiles limit 1;
 select id into m from public.muscle_groups limit 1;
 insert into public.routines(id,user_id,name) values(r,u,'Transactional weight test');
 insert into public.routine_days(id,routine_id,day_type,day_number,position,title) values(d,r,'weekday',1,1,'Test');
 insert into public.exercises(id,user_id,name,muscle_group_id) values(e,u,'Transactional weight test',m);
 insert into public.routine_day_exercises(id,routine_day_id,exercise_id,position,measure_unit,load_type) values(i,d,e,1,'kg','external');
 insert into public.exercise_sets(routine_day_exercise_id,set_number,reps,weight) select i,n,12,20 from generate_series(1,3) n;
 foreach w in array array[15,25]::numeric[] loop
   update public.exercise_sets set weight=20 where routine_day_exercise_id=i;
   s := gen_random_uuid();
   insert into public.routine_sessions(id,user_id,routine_id,status) values(s,u,r,'in_progress');
   select jsonb_build_object(
     'days',jsonb_build_array(jsonb_build_object('routine_day_id',d)),
     'exercises',jsonb_build_array(jsonb_build_object('routine_day_id',d,'exercise_id',e,'position',1)),
     'sets',(select jsonb_agg(jsonb_build_object('routine_day_id',d,'exercise_id',e,'exercise_position',1,'routine_day_exercise_id',i,'set_number',n,'actual_reps',8,'actual_weight',w,'planned_weight',20,'load_type','external')) from generate_series(1,3) n)
   ) into payload;
   perform public.end_session_transaction_service(s,u,now(),payload);
   if (select count(*) from public.exercise_sets where routine_day_exercise_id=i and weight=w) <> 3 then raise exception 'Weight update failed: %',w; end if;
   perform public.end_session_transaction_service(s,u,now(),payload);
   if (select count(*) from public.exercise_sets where routine_day_exercise_id=i and weight=w) <> 3 then raise exception 'Retry failed'; end if;
 end loop;
end;
$test$;

select 'increase, decrease and retry passed' as result;
rollback;
