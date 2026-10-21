-- Preserve the deployed function and change only the uniform-load comparison.
do $migration$
declare
  definition text;
  old_condition constant text := 'and min(recorded.actual_weight) > max(planned.weight)';
  new_condition constant text := 'and min(recorded.actual_weight) <> max(planned.weight)';
begin
  select pg_get_functiondef('public.end_session_transaction_service(uuid,uuid,timestamptz,jsonb)'::regprocedure)
    into definition;
  if strpos(definition, old_condition) = 0 then
    raise exception 'Expected weight comparison missing; inspect the deployed function before proceeding';
  end if;
  execute replace(definition, old_condition, new_condition);
end;
$migration$;
