-- Reconciles session-history constraints after the safety/cascade migrations.
-- Final intended state:
-- 1. Deleting a routine deletes its sessions/history.
-- 2. Deleting a routine day or exercise does not invalidate existing session logs.

ALTER TABLE public.routine_sessions
  ALTER COLUMN routine_id SET NOT NULL;

ALTER TABLE public.routine_sessions
  DROP CONSTRAINT IF EXISTS routine_sessions_routine_id_fkey,
  ADD CONSTRAINT routine_sessions_routine_id_fkey
    FOREIGN KEY (routine_id) REFERENCES public.routines(id)
    ON DELETE CASCADE;

ALTER TABLE public.session_day_logs
  ALTER COLUMN routine_day_id DROP NOT NULL;

ALTER TABLE public.session_day_logs
  DROP CONSTRAINT IF EXISTS session_day_logs_routine_day_id_fkey,
  ADD CONSTRAINT session_day_logs_routine_day_id_fkey
    FOREIGN KEY (routine_day_id) REFERENCES public.routine_days(id)
    ON DELETE SET NULL;

ALTER TABLE public.session_exercise_logs
  ALTER COLUMN exercise_id DROP NOT NULL;

ALTER TABLE public.session_exercise_logs
  DROP CONSTRAINT IF EXISTS session_exercise_logs_exercise_id_fkey,
  ADD CONSTRAINT session_exercise_logs_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES public.exercises(id)
    ON DELETE SET NULL;
