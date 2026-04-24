-- ============================================================================
-- RUTINA COMPLETA: "SportClub Full Body" - 4 Días (1 Core + 3 Splits)
-- ============================================================================
-- VERSIÓN SUPABASE - Compatible con SQL Editor
-- 
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia TODO este archivo
-- 3. En la línea 11, reemplaza 'YOUR_USER_ID' con tu UUID real
-- 4. Ejecuta el script completo
-- ============================================================================

-- ⚙️ CONFIGURACIÓN: REEMPLAZA TU UUID AQUÍ
-- Obtén tu UUID desde: Auth > Users en Supabase, o desde la app (DevTools)
-- Ejemplo: '0b0a3cfb-f3b8-488c-abc9-ff06f7c1f7e2'

WITH config AS (
  SELECT '0b0a3cfb-f3b8-488c-abc9-ff06f7c1f7e2'::uuid AS user_id
),

-- ============================================================================
-- 1. INSERTAR EJERCICIOS (Global/Catálogo)
-- ============================================================================

inserted_exercises AS (
  INSERT INTO public.exercises (name, description, muscle_group_id, equipment, is_active)
  VALUES 
    -- CORE EXERCISES
    ('Pallof', 'Ejercicio anti-rotación que fortalece el core y oblicuos', 
     (SELECT id FROM public.muscle_groups WHERE code = 'core'), 'Cable', true),
    ('Bicho Muerto (Dead Bug)', 'Ejercicio de estabilización abdominal en posición supina', 
     (SELECT id FROM public.muscle_groups WHERE code = 'core'), 'Peso corporal', true),
    ('Plancha Isométrica', 'Ejercicio estático que fortalece el core anterior', 
     (SELECT id FROM public.muscle_groups WHERE code = 'core'), 'Peso corporal', true),
    
    -- UPPER BODY
    ('Press Inclinado con Mancuernas', 'Variante del press que enfatiza el pecho superior y hombros anteriores', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Mancuernas', true),
    ('Press Plano con Barra', 'Ejercicio fundamental para desarrollo de pecho', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Barra', true),
    ('Remo Gironda', 'Variante de remo que enfatiza la espalda media y lats', 
     (SELECT id FROM public.muscle_groups WHERE code = 'back'), 'Barra', true),
    ('Dorsalera', 'Ejercicio de jalón que trabaja el dorsal ancho y espalda', 
     (SELECT id FROM public.muscle_groups WHERE code = 'back'), 'Máquina', true),
    ('Press Militar con Mancuernas', 'Ejercicio de presión de pie que trabaja hombros anteriores', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Mancuernas', true),
    ('Press Francés con Mancuernas', 'Ejercicio de aislamiento para tríceps', 
     (SELECT id FROM public.muscle_groups WHERE code = 'other'), 'Mancuernas', true),
    ('Vuelos Laterales', 'Ejercicio de aislamiento para deltoides lateral', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Mancuernas', true),
    ('Curl de Bíceps', 'Ejercicio de aislamiento para bíceps', 
     (SELECT id FROM public.muscle_groups WHERE code = 'other'), 'Mancuernas', true),
    ('Dominadas', 'Ejercicio fundamental para espalda y bíceps', 
     (SELECT id FROM public.muscle_groups WHERE code = 'back'), 'Barra', true),
    ('Remo Pendlay en Máquina', 'Variante de remo en máquina para espalda media', 
     (SELECT id FROM public.muscle_groups WHERE code = 'back'), 'Máquina', true),
    ('Mariposa (Pec Deck)', 'Ejercicio de aislamiento para pecho', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Máquina', true),
    ('Curl Martillo con Mancuernas', 'Ejercicio de bíceps que enfatiza braquial anterior', 
     (SELECT id FROM public.muscle_groups WHERE code = 'other'), 'Mancuernas', true),
    ('Tríceps en Polea', 'Ejercicio de aislamiento para tríceps con cable', 
     (SELECT id FROM public.muscle_groups WHERE code = 'other'), 'Cable', true),
    
    -- LOWER BODY
    ('Sentadillas', 'Ejercicio fundamental para piernas', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Barra', true),
    ('Estocadas', 'Ejercicio unilateral para cuádriceps y glúteos', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Mancuernas', true),
    ('Sillón Isquiotibiales (Leg Curl)', 'Ejercicio de aislamiento para isquiotibiales', 
     (SELECT id FROM public.muscle_groups WHERE code = 'back'), 'Máquina', true),
    ('Sillón Cuádriceps (Leg Extension)', 'Ejercicio de aislamiento para cuádriceps', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Máquina', true),
    ('Camilla Isquiotibiales (Hamstring Curl)', 'Variante de curl de isquiotibiales en camilla', 
     (SELECT id FROM public.muscle_groups WHERE code = 'back'), 'Máquina', true),
    ('Aductores en Máquina', 'Ejercicio de aislamiento para aductores (piernas internas)', 
     (SELECT id FROM public.muscle_groups WHERE code = 'other'), 'Máquina', true),
    ('Extensión de Gemelos', 'Ejercicio de aislamiento para gemelos', 
     (SELECT id FROM public.muscle_groups WHERE code = 'other'), 'Máquina', true),
    ('Prensa (Leg Press)', 'Ejercicio fundamental para piernas en máquina', 
     (SELECT id FROM public.muscle_groups WHERE code = 'front'), 'Máquina', true),
    ('Sentadilla Sumo', 'Variante de sentadilla que enfatiza aductores y glúteos', 
     (SELECT id FROM public.muscle_groups WHERE code = 'back'), 'Barra', true),
    ('Aductor en Máquina', 'Ejercicio específico para aductores', 
     (SELECT id FROM public.muscle_groups WHERE code = 'other'), 'Máquina', true),
    ('Posteriores en Máquina', 'Ejercicio que trabaja glúteos y caderas posteriores', 
     (SELECT id FROM public.muscle_groups WHERE code = 'back'), 'Máquina', true)
  ON CONFLICT DO NOTHING
  RETURNING id, name
)

-- ============================================================================
-- 2. CREAR RUTINA PRINCIPAL
-- ============================================================================

INSERT INTO public.routines (user_id, name, notes, is_active)
SELECT 
  config.user_id,
  'SportClub Full Body',
  'Rutina de 4 días: 1 CORE + 3 Splits (Upper/Lower/Upper)',
  true
FROM config;

-- Nota: A partir de aquí necesitamos la rutina_id creada arriba
-- Para continuar, ejecuta las secciones por separado o ajusta según tu necesidad

-- Fin de la sección de ejercicios
SELECT 'Ejercicios insertados exitosamente' AS status;

-- ============================================================================
-- 3. OBTENER LA RUTINA CREADA
-- ============================================================================
-- Una vez ejecutada la sección anterior, ejecuta esto para obtener el routine_id:

-- SELECT id, name, created_at FROM public.routines 
-- WHERE name = 'SportClub Full Body'
-- ORDER BY created_at DESC 
-- LIMIT 1;

-- Luego copia el ID y úsalo en las secciones siguientes reemplazando 'routine_id_aqui'
