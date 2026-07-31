delete from public.exercises
where user_id is null
  and name in (
    'Press E2E Test',
    'Remo E2E Multiusuario'
  );
