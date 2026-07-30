-- Restrict exercise reads to the intended audience.
-- The legacy exercises_read_public policy used USING (true), which made every
-- exercise visible and overrode the ownership checks of the other permissive
-- SELECT policies.
drop policy if exists "exercises_read_public" on public.exercises;
drop policy if exists "Ejercicios publicos visibles por todos" on public.exercises;
drop policy if exists "Ejercicios publicos y propios son visibles" on public.exercises;

create policy "Ejercicios publicos visibles por anonimos"
on public.exercises
for select
to anon
using (user_id is null);

create policy "Ejercicios publicos y propios son visibles"
on public.exercises
for select
to authenticated
using (
  user_id is null
  or user_id = (select auth.uid())
);
