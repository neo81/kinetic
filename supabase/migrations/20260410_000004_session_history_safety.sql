-- Migración para prevenir borrado en cascada del historial de sesiones

-- 1. routine_sessions.routine_id (Se vuelve nullable, SET NULL)
ALTER TABLE public.routine_sessions ALTER COLUMN routine_id DROP NOT NULL;
ALTER TABLE public.routine_sessions 
  DROP CONSTRAINT IF EXISTS routine_sessions_routine_id_fkey,
  ADD CONSTRAINT routine_sessions_routine_id_fkey 
  FOREIGN KEY (routine_id) REFERENCES public.routines(id) ON DELETE SET NULL;

-- 2. session_day_logs.routine_day_id (Se vuelve nullable, SET NULL)
ALTER TABLE public.session_day_logs ALTER COLUMN routine_day_id DROP NOT NULL;
ALTER TABLE public.session_day_logs
  DROP CONSTRAINT IF EXISTS session_day_logs_routine_day_id_fkey,
  ADD CONSTRAINT session_day_logs_routine_day_id_fkey
  FOREIGN KEY (routine_day_id) REFERENCES public.routine_days(id) ON DELETE SET NULL;

-- 3. session_exercise_logs.exercise_id (Se vuelve nullable, SET NULL)
ALTER TABLE public.session_exercise_logs ALTER COLUMN exercise_id DROP NOT NULL;
ALTER TABLE public.session_exercise_logs
  DROP CONSTRAINT IF EXISTS session_exercise_logs_exercise_id_fkey,
  ADD CONSTRAINT session_exercise_logs_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE SET NULL;

-- Nota: session_day_logs depende de session_id (ON DELETE CASCADE)
-- session_exercise_logs depende de session_day_log_id (ON DELETE CASCADE)
-- session_set_logs depende de session_exercise_log_id (ON DELETE CASCADE)
-- ^ Esos los dejamos CASCADE porque si se borra la sesión entera (intencionalmente), sí deben borrarse las sub-partes correspondientes.
