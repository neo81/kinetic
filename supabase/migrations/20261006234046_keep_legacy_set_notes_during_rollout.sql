-- Transitional compatibility for already-installed PWA bundles. Those bundles
-- still select exercise_sets.notes until the new service worker activates.
-- The new application neither reads nor writes this column; the canonical note
-- is public.routine_day_exercises.notes.
alter table public.exercise_sets
  add column notes text;

comment on column public.exercise_sets.notes is
  'Deprecated rollout compatibility only. Canonical notes live in routine_day_exercises.notes.';
