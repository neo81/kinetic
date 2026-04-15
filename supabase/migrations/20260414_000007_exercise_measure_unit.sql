-- Add measure_unit column to routine_day_exercises
alter table public.routine_day_exercises
add column if not exists measure_unit text check (measure_unit in ('kg', 'min', 'sec')) default 'kg';
