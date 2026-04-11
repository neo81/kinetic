-- Migration to setup ON DELETE CASCADE for routine_sessions
-- The user requested that if a routine is deleted, its entire history is deleted too.

ALTER TABLE public.routine_sessions 
  DROP CONSTRAINT IF EXISTS routine_sessions_routine_id_fkey,
  ADD CONSTRAINT routine_sessions_routine_id_fkey 
    FOREIGN KEY (routine_id) REFERENCES public.routines(id) 
    ON DELETE CASCADE;

-- Also reset routine_day_id in session_day_logs to ON DELETE CASCADE
-- because if they delete a routine day, they want its history gone if they delete the whole routine.
-- Wait, if they only delete a DAY, maybe they want to keep the session history?
-- The user said "Si se elimina una rutina completa tiene que eliminarse todo el historial."
-- Cascading from routine to routine_sessions will automatically cascade to session_day_logs because session_day_logs has ON DELETE CASCADE to session_id!
