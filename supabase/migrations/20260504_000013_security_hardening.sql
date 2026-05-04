-- Harden exposed write paths so RLS remains meaningful for authenticated clients.

-- weekly_statistics should only be readable and writable by its owner.
DROP POLICY IF EXISTS "users_view_own_weekly_stats" ON public.weekly_statistics;
DROP POLICY IF EXISTS "app_insert_weekly_stats" ON public.weekly_statistics;
DROP POLICY IF EXISTS "app_update_weekly_stats" ON public.weekly_statistics;

CREATE POLICY "users_view_own_weekly_stats"
ON public.weekly_statistics
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_weekly_stats"
ON public.weekly_statistics
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_weekly_stats"
ON public.weekly_statistics
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.end_session_transaction(
  p_session_id uuid,
  p_ended_at timestamptz,
  p_session_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT user_id
  INTO v_session_user_id
  FROM public.routine_sessions
  WHERE id = p_session_id;

  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'Session not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_session_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to end this session'
      USING ERRCODE = '42501';
  END IF;

  -- Make the RPC idempotent for sync retries.
  DELETE FROM public.session_day_logs
  WHERE session_id = p_session_id;

  UPDATE public.routine_sessions
  SET
    status = 'completed',
    ended_at = p_ended_at
  WHERE id = p_session_id;

  INSERT INTO public.session_day_logs (
    session_id,
    routine_day_id,
    started_at,
    ended_at
  )
  SELECT
    p_session_id,
    (day_obj->>'routine_day_id')::uuid,
    NULL,
    p_ended_at
  FROM jsonb_array_elements(COALESCE(p_session_data->'days', '[]'::jsonb)) AS day_obj;

  INSERT INTO public.session_exercise_logs (
    session_day_log_id,
    exercise_id,
    position,
    notes
  )
  SELECT
    sdl.id,
    (exercise_obj->>'exercise_id')::uuid,
    NULLIF(exercise_obj->>'position', '')::integer,
    NULLIF(exercise_obj->>'notes', '')
  FROM jsonb_array_elements(COALESCE(p_session_data->'exercises', '[]'::jsonb)) AS exercise_obj
  JOIN public.session_day_logs sdl
    ON sdl.session_id = p_session_id
   AND sdl.routine_day_id = (exercise_obj->>'routine_day_id')::uuid;

  INSERT INTO public.session_set_logs (
    session_exercise_log_id,
    set_number,
    reps,
    weight,
    duration_minutes,
    duration_seconds,
    completed
  )
  SELECT
    sel.id,
    (set_obj->>'set_number')::integer,
    COALESCE(
      NULLIF(set_obj->>'actual_reps', '')::numeric,
      NULLIF(set_obj->>'planned_reps', '')::numeric
    ),
    COALESCE(
      NULLIF(set_obj->>'actual_weight', '')::numeric,
      NULLIF(set_obj->>'planned_weight', '')::numeric
    ),
    COALESCE(
      NULLIF(set_obj->>'actual_duration_minutes', '')::numeric,
      NULLIF(set_obj->>'planned_duration_minutes', '')::numeric
    ),
    NULLIF(set_obj->>'actual_duration_seconds', '')::numeric,
    true
  FROM jsonb_array_elements(COALESCE(p_session_data->'sets', '[]'::jsonb)) AS set_obj
  JOIN public.session_day_logs sdl
    ON sdl.session_id = p_session_id
   AND sdl.routine_day_id = (set_obj->>'routine_day_id')::uuid
  JOIN public.session_exercise_logs sel
    ON sel.session_day_log_id = sdl.id
   AND sel.exercise_id = (set_obj->>'exercise_id')::uuid
   AND COALESCE(sel.position, 0) = COALESCE(NULLIF(set_obj->>'exercise_position', '')::integer, 0);

  RETURN p_session_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in end_session_transaction: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.end_session_transaction(uuid, timestamptz, jsonb)
TO authenticated;
