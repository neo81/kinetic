-- Migration: 20260506_000015_routine_import_rpc.sql
-- Agrega la función RPC import_routine para importación atómica de rutinas.
-- Esta función es una alternativa al enfoque multi-roundtrip del frontend y
-- garantiza consistencia total mediante una transacción única.
--
-- Uso (opcional): el frontend puede llamar a esta RPC en lugar de hacer
-- múltiples inserciones individuales. La implementación actual en el frontend
-- ya hace las inserciones directamente; esta RPC queda disponible para futuras
-- optimizaciones o para exportar/importar desde herramientas externas.

CREATE OR REPLACE FUNCTION public.import_routine(
  p_routine_name   text,
  p_routine_notes  text,
  p_days           jsonb   -- Array de días con ejercicios y series
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_routine_id         uuid;
  v_day_obj            jsonb;
  v_day_id             uuid;
  v_exercise_obj       jsonb;
  v_rde_id             uuid;
  v_set_obj            jsonb;
BEGIN
  -- Verificar autenticación
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- 1. Insertar la rutina
  INSERT INTO public.routines (user_id, name, notes, is_active)
  VALUES (auth.uid(), p_routine_name, NULLIF(p_routine_notes, ''), true)
  RETURNING id INTO v_routine_id;

  -- 2. Iterar sobre los días
  FOR v_day_obj IN SELECT * FROM jsonb_array_elements(COALESCE(p_days, '[]'::jsonb))
  LOOP
    INSERT INTO public.routine_days (
      id,
      routine_id,
      day_type,
      day_number,
      title,
      position
    )
    VALUES (
      COALESCE((v_day_obj->>'id')::uuid, gen_random_uuid()),
      v_routine_id,
      v_day_obj->>'day_type',
      NULLIF(v_day_obj->>'day_number', '')::integer,
      v_day_obj->>'title',
      (v_day_obj->>'position')::integer
    )
    RETURNING id INTO v_day_id;

    -- 3. Iterar sobre los ejercicios del día
    FOR v_exercise_obj IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_day_obj->'exercises', '[]'::jsonb))
    LOOP
      INSERT INTO public.routine_day_exercises (
        id,
        routine_day_id,
        exercise_id,
        position,
        rest_seconds,
        notes,
        measure_unit
      )
      VALUES (
        COALESCE((v_exercise_obj->>'id')::uuid, gen_random_uuid()),
        v_day_id,
        (v_exercise_obj->>'exercise_id')::uuid,
        (v_exercise_obj->>'position')::integer,
        NULLIF(v_exercise_obj->>'rest_seconds', '')::integer,
        NULLIF(v_exercise_obj->>'notes', ''),
        COALESCE(v_exercise_obj->>'measure_unit', 'kg')
      )
      RETURNING id INTO v_rde_id;

      -- 4. Insertar series
      FOR v_set_obj IN
        SELECT * FROM jsonb_array_elements(COALESCE(v_exercise_obj->'sets', '[]'::jsonb))
      LOOP
        INSERT INTO public.exercise_sets (
          routine_day_exercise_id,
          set_number,
          reps,
          weight,
          duration_minutes,
          duration_seconds,
          notes
        )
        VALUES (
          v_rde_id,
          (v_set_obj->>'set_number')::integer,
          NULLIF(v_set_obj->>'reps', '')::numeric,
          NULLIF(v_set_obj->>'weight', '')::numeric,
          NULLIF(v_set_obj->>'duration_minutes', '')::numeric,
          NULLIF(v_set_obj->>'duration_seconds', '')::numeric,
          NULLIF(v_set_obj->>'notes', '')
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_routine_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in import_routine: %', SQLERRM;
    RAISE;
END;
$$;

-- Otorgar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.import_routine(text, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.import_routine IS
  'Importa una rutina completa (días + ejercicios + series) de forma atómica. '
  'El llamador debe resolver los exercise_id antes de invocar esta función. '
  'Todos los IDs de la jerarquía (routine_days, routine_day_exercises, exercise_sets) '
  'son generados freshly por la función si no se proveen.';
