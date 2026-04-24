-- ============================================================================
-- STEP 2: CREAR LA RUTINA Y DÍAS
-- ============================================================================
-- Ejecuta SEGUNDO este script
-- IMPORTANTE: Reemplaza 'YOUR_USER_ID' con tu UUID real en la línea 15

-- Primero, crea la rutina
INSERT INTO public.routines (user_id, name, notes, is_active)
VALUES 
  ('YOUR_USER_ID'::uuid, 'SportClub Full Body', 'Rutina de 4 días: 1 CORE + 3 Splits (Upper/Lower/Upper)', true)
RETURNING id;

-- Copia el ID retornado (routine_id) y úsalo en STEP 3
-- Ejemplo de output: 
-- | id |
-- |----|
-- | a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6 |

SELECT 'PASO 2A COMPLETO: Rutina creada ✓' AS status;

-- ============================================================================
-- PASO 2B: Crear los Días de la Rutina
-- ============================================================================
-- REEMPLAZA 'routine_id_aqui' con el ID obtenido arriba (sin las comillas)

INSERT INTO public.routine_days (routine_id, day_type, day_number, title, position)
VALUES 
  ('routine_id_aqui'::uuid, 'core', NULL, 'CORE', 1),
  ('routine_id_aqui'::uuid, 'weekday', 1, 'Día 1 - Upper A (Press & Back)', 2),
  ('routine_id_aqui'::uuid, 'weekday', 3, 'Día 2 - Lower (Piernas)', 3),
  ('routine_id_aqui'::uuid, 'weekday', 5, 'Día 3 - Upper B (Rows & Back)', 4),
  ('routine_id_aqui'::uuid, 'weekday', 6, 'Día 4 - Lower B', 5);

SELECT 'PASO 2B COMPLETO: Días creados ✓' AS status;

-- Verifica que los días se crearon correctamente:
-- SELECT id, day_type, day_number, title FROM public.routine_days 
-- WHERE routine_id = 'routine_id_aqui'::uuid 
-- ORDER BY position;
