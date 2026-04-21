-- Align end_session_transaction with the current production schema.
-- The live DB stores a single executed value per set in the legacy columns
-- (reps / weight / duration_minutes / duration_seconds / completed).

CREATE OR REPLACE FUNCTION public.end_session_transaction(
  p_session_id uuid,
  p_ended_at timestamptz,
  p_session_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
