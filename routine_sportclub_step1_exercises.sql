-- ============================================================================
-- STEP 1: INSERTAR TODOS LOS EJERCICIOS
-- ============================================================================
-- Ejecuta PRIMERO este script
-- No necesita cambios, simplemente copia y ejecuta en Supabase SQL Editor
-- 
-- Códigos de grupos musculares disponibles:
-- FRENTE: hombros, pectorales, biceps, abdomen, oblicuos, antebrazo, abductores, aductores, cuadriceps
-- ESPALDA: trapecio, triceps, dorsales, lumbares, gluteos, isquiotibiales, pantorrillas

INSERT INTO public.exercises (name, description, muscle_group_id, equipment, is_active)
VALUES 
  -- CORE EXERCISES (Abdomen y Oblicuos)
  ('Pallof', 'Ejercicio anti-rotación que fortalece el core y oblicuos', 
   (SELECT id FROM public.muscle_groups WHERE code = 'oblicuos'), 'Cable', true),
  ('Bicho Muerto (Dead Bug)', 'Ejercicio de estabilización abdominal en posición supina', 
   (SELECT id FROM public.muscle_groups WHERE code = 'abdomen'), 'Peso corporal', true),
  ('Plancha Isométrica', 'Ejercicio estático que fortalece el core anterior', 
   (SELECT id FROM public.muscle_groups WHERE code = 'abdomen'), 'Peso corporal', true),
  
  -- UPPER BODY - PECHO
  ('Press Inclinado con Mancuernas', 'Variante del press que enfatiza el pecho superior y hombros anteriores', 
   (SELECT id FROM public.muscle_groups WHERE code = 'pectorales'), 'Mancuernas', true),
  ('Press Plano con Barra', 'Ejercicio fundamental para desarrollo de pecho', 
   (SELECT id FROM public.muscle_groups WHERE code = 'pectorales'), 'Barra', true),
  ('Mariposa (Pec Deck)', 'Ejercicio de aislamiento para pecho', 
   (SELECT id FROM public.muscle_groups WHERE code = 'pectorales'), 'Máquina', true),

  -- UPPER BODY - ESPALDA
  ('Remo Gironda', 'Variante de remo que enfatiza la espalda media y lats', 
   (SELECT id FROM public.muscle_groups WHERE code = 'dorsales'), 'Barra', true),
  ('Dorsalera', 'Ejercicio de jalón que trabaja el dorsal ancho y espalda', 
   (SELECT id FROM public.muscle_groups WHERE code = 'dorsales'), 'Máquina', true),
  ('Dominadas', 'Ejercicio fundamental para espalda y bíceps', 
   (SELECT id FROM public.muscle_groups WHERE code = 'dorsales'), 'Barra', true),
  ('Remo Pendlay en Máquina', 'Variante de remo en máquina para espalda media', 
   (SELECT id FROM public.muscle_groups WHERE code = 'dorsales'), 'Máquina', true),

  -- UPPER BODY - HOMBROS
  ('Press Militar con Mancuernas', 'Ejercicio de presión de pie que trabaja hombros anteriores', 
   (SELECT id FROM public.muscle_groups WHERE code = 'hombros'), 'Mancuernas', true),
  ('Vuelos Laterales', 'Ejercicio de aislamiento para deltoides lateral', 
   (SELECT id FROM public.muscle_groups WHERE code = 'hombros'), 'Mancuernas', true),

  -- UPPER BODY - BRAZOS
  ('Curl de Bíceps', 'Ejercicio de aislamiento para bíceps', 
   (SELECT id FROM public.muscle_groups WHERE code = 'biceps'), 'Mancuernas', true),
  ('Press Francés con Mancuernas', 'Ejercicio de aislamiento para tríceps', 
   (SELECT id FROM public.muscle_groups WHERE code = 'triceps'), 'Mancuernas', true),
  ('Curl Martillo con Mancuernas', 'Ejercicio de bíceps que enfatiza braquial anterior', 
   (SELECT id FROM public.muscle_groups WHERE code = 'biceps'), 'Mancuernas', true),
  ('Tríceps en Polea', 'Ejercicio de aislamiento para tríceps con cable', 
   (SELECT id FROM public.muscle_groups WHERE code = 'triceps'), 'Cable', true),

  -- LOWER BODY - PIERNAS ANTERIORES
  ('Sentadillas', 'Ejercicio fundamental para piernas', 
   (SELECT id FROM public.muscle_groups WHERE code = 'cuadriceps'), 'Barra', true),
  ('Estocadas', 'Ejercicio unilateral para cuádriceps y glúteos', 
   (SELECT id FROM public.muscle_groups WHERE code = 'cuadriceps'), 'Mancuernas', true),
  ('Sillón Cuádriceps (Leg Extension)', 'Ejercicio de aislamiento para cuádriceps', 
   (SELECT id FROM public.muscle_groups WHERE code = 'cuadriceps'), 'Máquina', true),
  ('Prensa (Leg Press)', 'Ejercicio fundamental para piernas en máquina', 
   (SELECT id FROM public.muscle_groups WHERE code = 'cuadriceps'), 'Máquina', true),

  -- LOWER BODY - PIERNAS POSTERIORES
  ('Sillón Isquiotibiales (Leg Curl)', 'Ejercicio de aislamiento para isquiotibiales', 
   (SELECT id FROM public.muscle_groups WHERE code = 'isquiotibiales'), 'Máquina', true),
  ('Camilla Isquiotibiales (Hamstring Curl)', 'Variante de curl de isquiotibiales en camilla', 
   (SELECT id FROM public.muscle_groups WHERE code = 'isquiotibiales'), 'Máquina', true),
  ('Sentadilla Sumo', 'Variante de sentadilla que enfatiza aductores y glúteos', 
   (SELECT id FROM public.muscle_groups WHERE code = 'gluteos'), 'Barra', true),
  ('Posteriores en Máquina', 'Ejercicio que trabaja glúteos y caderas posteriores', 
   (SELECT id FROM public.muscle_groups WHERE code = 'gluteos'), 'Máquina', true),

  -- LOWER BODY - ACCESORIOS
  ('Aductores en Máquina', 'Ejercicio de aislamiento para aductores (piernas internas)', 
   (SELECT id FROM public.muscle_groups WHERE code = 'aductores'), 'Máquina', true),
  ('Aductor en Máquina', 'Ejercicio específico para aductores', 
   (SELECT id FROM public.muscle_groups WHERE code = 'aductores'), 'Máquina', true),
  ('Extensión de Gemelos', 'Ejercicio de aislamiento para gemelos', 
   (SELECT id FROM public.muscle_groups WHERE code = 'pantorrillas'), 'Máquina', true)
ON CONFLICT DO NOTHING;

SELECT 'PASO 1 COMPLETO: Ejercicios insertados ✓' AS status;
