-- Create atomic transaction RPC for ending a session
-- This ensures all session data is inserted in a single transaction
-- preventing orphaned records if the app crashes mid-operation

CREATE OR REPLACE FUNCTION end_session_transaction(
  p_session_id uuid,
  p_ended_at timestamptz,
  p_session_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  -- Update routine_sessions (main session record)
  UPDATE routine_sessions
  SET status = 'completed', ended_at = p_ended_at
  WHERE id = p_session_id;

  -- Insert session_day_logs for each day in the session
  INSERT INTO session_day_logs (session_id, routine_day_id, completed_at)
  SELECT
    p_session_id,
    (day_obj->>'routine_day_id')::uuid,
    now()
  FROM jsonb_array_elements(p_session_data->'days') AS day_obj;

  -- Insert session_exercise_logs for each exercise in the session
  INSERT INTO session_exercise_logs (session_day_log_id, exercise_id, completed_at)
  SELECT
    sdl.id,
    (ex_obj->>'exercise_id')::uuid,
    now()
  FROM jsonb_array_elements(p_session_data->'exercises') AS ex_obj
  CROSS JOIN session_day_logs sdl
  WHERE sdl.session_id = p_session_id
  AND (ex_obj->>'day_log_id')::uuid = sdl.id;

  -- Insert session_set_logs for each set with performance data
  INSERT INTO session_set_logs (session_exercise_log_id, set_number, planned_reps, planned_weight, planned_duration_minutes, actual_reps, actual_weight, actual_duration_minutes, actual_duration_seconds)
  SELECT
    sel.id,
    (set_obj->>'set_number')::int,
    (set_obj->>'planned_reps')::int,
    (set_obj->>'planned_weight')::numeric,
    (set_obj->>'planned_duration_minutes')::int,
    CASE WHEN (set_obj->>'actual_reps') IS NOT NULL THEN (set_obj->>'actual_reps')::int ELSE (set_obj->>'planned_reps')::int END,
    CASE WHEN (set_obj->>'actual_weight') IS NOT NULL THEN (set_obj->>'actual_weight')::numeric ELSE (set_obj->>'planned_weight')::numeric END,
    CASE WHEN (set_obj->>'actual_duration_minutes') IS NOT NULL THEN (set_obj->>'actual_duration_minutes')::int ELSE (set_obj->>'planned_duration_minutes')::int END,
    (set_obj->>'actual_duration_seconds')::int
  FROM jsonb_array_elements(p_session_data->'sets') AS set_obj
  CROSS JOIN session_exercise_logs sel
  WHERE sel.session_id = p_session_id;

  v_result_id := p_session_id;

  RETURN v_result_id;

EXCEPTION WHEN OTHERS THEN
  -- Log the error and re-raise
  RAISE WARNING 'Error in end_session_transaction: %', SQLERRM;
  RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION end_session_transaction(uuid, timestamptz, jsonb)
TO authenticated;
