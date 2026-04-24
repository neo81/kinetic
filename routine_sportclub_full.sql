-- ============================================================================
-- RUTINA COMPLETA: "SportClub Full Body" - 4 Días (1 Core + 3 Splits)
-- ============================================================================
-- Este script inserta una rutina completa con todos los ejercicios, días y series.
-- Nota: Reemplaza 'YOUR_USER_ID' con el UUID del usuario
-- ============================================================================

-- Variable de usuario (REEMPLAZAR CON EL UUID REAL)
\set user_id '12345678-1234-5678-1234-567812345678'

-- ============================================================================
-- 1. INSERTAR EJERCICIOS (Global/Catálogo)
-- ============================================================================

-- CORE EXERCISES
INSERT INTO public.exercises (name, description, muscle_group_id, equipment, is_active)
VALUES 
  ('Pallof', 'Ejercicio anti-rotación que fortalece el core y oblicuos', 
   (SELECT id FROM public.muscle_groups WHERE code = 'core'), 'Cable', true),
  ('Bicho Muerto (Dead Bug)', 'Ejercicio de estabilización abdominal en posición supina', 
   (SELECT id FROM public.muscle_groups WHERE code = 'core'), 'Peso corporal', true),
  ('Plancha Isométrica', 'Ejercicio estático que fortalece el core anterior', 
   (SELECT id FROM public.muscle_groups WHERE code = 'core'), 'Peso corporal', true)
ON CONFLICT DO NOTHING;

-- UPPER BODY - PECHO, ESPALDA, HOMBROS, BRAZOS
INSERT INTO public.exercises (name, description, muscle_group_id, equipment, is_active)
VALUES 
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
   (SELECT id FROM public.muscle_groups WHERE code = 'other'), 'Cable', true)
ON CONFLICT DO NOTHING;

-- LOWER BODY
INSERT INTO public.exercises (name, description, muscle_group_id, equipment, is_active)
VALUES 
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
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. CREAR RUTINA PRINCIPAL
-- ============================================================================

INSERT INTO public.routines (user_id, name, notes, is_active)
VALUES 
  (:user_id::uuid, 'SportClub Full Body', 'Rutina de 4 días: 1 CORE + 3 Splits (Upper/Lower/Upper)', true)
RETURNING id AS routine_id \gset

-- ============================================================================
-- 3. CREAR DÍAS DE RUTINA (DÍA CORE + DÍAS 1-4)
-- ============================================================================

-- DÍA CORE
INSERT INTO public.routine_days (routine_id, day_type, day_number, title, position)
VALUES (:routine_id::uuid, 'core', NULL, 'CORE', 1)
RETURNING id AS core_day_id \gset

-- DÍA 1 (Monday - Upper A: Press & Back)
INSERT INTO public.routine_days (routine_id, day_type, day_number, title, position)
VALUES (:routine_id::uuid, 'weekday', 1, 'Día 1 - Upper A (Press & Back)', 2)
RETURNING id AS day1_id \gset

-- DÍA 2 (Wednesday - Lower)
INSERT INTO public.routine_days (routine_id, day_type, day_number, title, position)
VALUES (:routine_id::uuid, 'weekday', 3, 'Día 2 - Lower (Piernas)', 3)
RETURNING id AS day2_id \gset

-- DÍA 3 (Friday - Upper B: Rows & Posterior)
INSERT INTO public.routine_days (routine_id, day_type, day_number, title, position)
VALUES (:routine_id::uuid, 'weekday', 5, 'Día 3 - Upper B (Rows & Back)', 4)
RETURNING id AS day3_id \gset

-- DÍA 4 (Saturday - Lower B)
INSERT INTO public.routine_days (routine_id, day_type, day_number, title, position)
VALUES (:routine_id::uuid, 'weekday', 6, 'Día 4 - Lower B', 5)
RETURNING id AS day4_id \gset

-- ============================================================================
-- 4. INSERTAR EJERCICIOS POR DÍA - CORE
-- ============================================================================

-- CORE - Exercise 1: Pallof
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :core_day_id::uuid, id, 1, 60, 'sec' FROM public.exercises WHERE name = 'Pallof'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, duration_seconds, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 30, 'Por lado'),
  (:ex_id::uuid, 2, 12, 30, 'Por lado'),
  (:ex_id::uuid, 3, 12, 30, 'Por lado');

-- CORE - Exercise 2: Bicho Muerto
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :core_day_id::uuid, id, 2, 45, 'sec' FROM public.exercises WHERE name = 'Bicho Muerto (Dead Bug)'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, duration_seconds, notes)
VALUES 
  (:ex_id::uuid, 1, 15, 0, NULL),
  (:ex_id::uuid, 2, 15, 0, NULL),
  (:ex_id::uuid, 3, 15, 0, NULL);

-- CORE - Exercise 3: Plancha Isométrica
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :core_day_id::uuid, id, 3, 60, 'sec' FROM public.exercises WHERE name = 'Plancha Isométrica'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, duration_seconds, notes)
VALUES 
  (:ex_id::uuid, 1, NULL, 60, NULL),
  (:ex_id::uuid, 2, NULL, 60, NULL),
  (:ex_id::uuid, 3, NULL, 45, NULL);

-- ============================================================================
-- 5. INSERTAR EJERCICIOS POR DÍA - DÍA 1 (Upper A)
-- ============================================================================

-- Day 1 - Exercise 1: Press Inclinado con Mancuernas
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day1_id::uuid, id, 1, 90, 'kg' FROM public.exercises WHERE name = 'Press Inclinado con Mancuernas'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 20, 'Calentamiento'),
  (:ex_id::uuid, 2, 10, 25, NULL),
  (:ex_id::uuid, 3, 8, 30, NULL);

-- Day 1 - Exercise 2: Press Plano con Barra
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day1_id::uuid, id, 2, 120, 'kg' FROM public.exercises WHERE name = 'Press Plano con Barra'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 8, 60, NULL),
  (:ex_id::uuid, 2, 8, 60, NULL),
  (:ex_id::uuid, 3, 6, 70, NULL);

-- Day 1 - Exercise 3: Remo Gironda
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day1_id::uuid, id, 3, 90, 'kg' FROM public.exercises WHERE name = 'Remo Gironda'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 8, 80, NULL),
  (:ex_id::uuid, 2, 8, 80, NULL),
  (:ex_id::uuid, 3, 6, 90, NULL);

-- Day 1 - Exercise 4: Dorsalera
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day1_id::uuid, id, 4, 60, 'kg' FROM public.exercises WHERE name = 'Dorsalera'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 10, 70, NULL),
  (:ex_id::uuid, 2, 10, 75, NULL),
  (:ex_id::uuid, 3, 8, 80, NULL);

-- Day 1 - Exercise 5: Press Militar con Mancuernas
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day1_id::uuid, id, 5, 75, 'kg' FROM public.exercises WHERE name = 'Press Militar con Mancuernas'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 10, 15, NULL),
  (:ex_id::uuid, 2, 10, 15, NULL),
  (:ex_id::uuid, 3, 8, 18, NULL);

-- Day 1 - Exercise 6: Press Francés con Mancuernas
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day1_id::uuid, id, 6, 60, 'kg' FROM public.exercises WHERE name = 'Press Francés con Mancuernas'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 12, NULL),
  (:ex_id::uuid, 2, 12, 12, NULL),
  (:ex_id::uuid, 3, 10, 14, NULL);

-- Day 1 - Exercise 7: Vuelos Laterales
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day1_id::uuid, id, 7, 45, 'kg' FROM public.exercises WHERE name = 'Vuelos Laterales'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 8, NULL),
  (:ex_id::uuid, 2, 12, 8, NULL),
  (:ex_id::uuid, 3, 10, 10, NULL);

-- Day 1 - Exercise 8: Curl de Bíceps
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day1_id::uuid, id, 8, 45, 'kg' FROM public.exercises WHERE name = 'Curl de Bíceps'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 14, NULL),
  (:ex_id::uuid, 2, 12, 14, NULL),
  (:ex_id::uuid, 3, 10, 16, NULL);

-- ============================================================================
-- 6. INSERTAR EJERCICIOS POR DÍA - DÍA 2 (Lower)
-- ============================================================================

-- Day 2 - Exercise 1: Sentadillas
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day2_id::uuid, id, 1, 120, 'kg' FROM public.exercises WHERE name = 'Sentadillas'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 10, 80, NULL),
  (:ex_id::uuid, 2, 8, 100, NULL),
  (:ex_id::uuid, 3, 6, 110, NULL);

-- Day 2 - Exercise 2: Estocadas
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day2_id::uuid, id, 2, 75, 'kg' FROM public.exercises WHERE name = 'Estocadas'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 10, 16, 'Por pierna'),
  (:ex_id::uuid, 2, 10, 18, 'Por pierna'),
  (:ex_id::uuid, 3, 8, 20, 'Por pierna');

-- Day 2 - Exercise 3: Sillón Isquiotibiales
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day2_id::uuid, id, 3, 60, 'kg' FROM public.exercises WHERE name = 'Sillón Isquiotibiales (Leg Curl)'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 50, NULL),
  (:ex_id::uuid, 2, 10, 60, NULL),
  (:ex_id::uuid, 3, 10, 60, NULL);

-- Day 2 - Exercise 4: Sillón Cuádriceps
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day2_id::uuid, id, 4, 60, 'kg' FROM public.exercises WHERE name = 'Sillón Cuádriceps (Leg Extension)'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 60, NULL),
  (:ex_id::uuid, 2, 10, 70, NULL),
  (:ex_id::uuid, 3, 10, 70, NULL);

-- Day 2 - Exercise 5: Camilla Isquiotibiales
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day2_id::uuid, id, 5, 45, 'kg' FROM public.exercises WHERE name = 'Camilla Isquiotibiales (Hamstring Curl)'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 40, NULL),
  (:ex_id::uuid, 2, 10, 50, NULL),
  (:ex_id::uuid, 3, 10, 50, NULL);

-- Day 2 - Exercise 6: Aductores en Máquina
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day2_id::uuid, id, 6, 45, 'kg' FROM public.exercises WHERE name = 'Aductores en Máquina'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 15, 60, NULL),
  (:ex_id::uuid, 2, 12, 70, NULL),
  (:ex_id::uuid, 3, 12, 70, NULL);

-- Day 2 - Exercise 7: Extensión de Gemelos
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day2_id::uuid, id, 7, 45, 'kg' FROM public.exercises WHERE name = 'Extensión de Gemelos'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 15, 100, NULL),
  (:ex_id::uuid, 2, 12, 120, NULL),
  (:ex_id::uuid, 3, 12, 120, NULL);

-- ============================================================================
-- 7. INSERTAR EJERCICIOS POR DÍA - DÍA 3 (Upper B: Rows & Back)
-- ============================================================================

-- Day 3 - Exercise 1: Dominadas
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 1, 120, 'kg' FROM public.exercises WHERE name = 'Dominadas'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 8, 0, NULL),
  (:ex_id::uuid, 2, 8, 0, NULL),
  (:ex_id::uuid, 3, 6, 0, NULL);

-- Day 3 - Exercise 2: Press Inclinado con Mancuernas
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 2, 90, 'kg' FROM public.exercises WHERE name = 'Press Inclinado con Mancuernas'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 10, 22, NULL),
  (:ex_id::uuid, 2, 10, 24, NULL),
  (:ex_id::uuid, 3, 8, 26, NULL);

-- Day 3 - Exercise 3: Remo Pendlay en Máquina
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 3, 90, 'kg' FROM public.exercises WHERE name = 'Remo Pendlay en Máquina'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 10, 80, NULL),
  (:ex_id::uuid, 2, 10, 90, NULL),
  (:ex_id::uuid, 3, 8, 100, NULL);

-- Day 3 - Exercise 4: Mariposa
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 4, 60, 'kg' FROM public.exercises WHERE name = 'Mariposa (Pec Deck)'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 50, NULL),
  (:ex_id::uuid, 2, 12, 60, NULL),
  (:ex_id::uuid, 3, 10, 70, NULL);

-- Day 3 - Exercise 5: Remo Gironda
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 5, 90, 'kg' FROM public.exercises WHERE name = 'Remo Gironda'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 8, 85, NULL),
  (:ex_id::uuid, 2, 8, 90, NULL),
  (:ex_id::uuid, 3, 6, 100, NULL);

-- Day 3 - Exercise 6: Vuelos Laterales
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 6, 45, 'kg' FROM public.exercises WHERE name = 'Vuelos Laterales'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 9, NULL),
  (:ex_id::uuid, 2, 12, 10, NULL),
  (:ex_id::uuid, 3, 10, 11, NULL);

-- Day 3 - Exercise 7: Curl Martillo con Mancuernas
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 7, 45, 'kg' FROM public.exercises WHERE name = 'Curl Martillo con Mancuernas'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 16, NULL),
  (:ex_id::uuid, 2, 12, 18, NULL),
  (:ex_id::uuid, 3, 10, 20, NULL);

-- Day 3 - Exercise 8: Tríceps en Polea
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 8, 45, 'kg' FROM public.exercises WHERE name = 'Tríceps en Polea'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 25, NULL),
  (:ex_id::uuid, 2, 12, 25, NULL),
  (:ex_id::uuid, 3, 10, 30, NULL);

-- Day 3 - Exercise 9: Posteriores en Máquina
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day3_id::uuid, id, 9, 45, 'kg' FROM public.exercises WHERE name = 'Posteriores en Máquina'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 60, NULL),
  (:ex_id::uuid, 2, 12, 70, NULL),
  (:ex_id::uuid, 3, 10, 80, NULL);

-- ============================================================================
-- 8. INSERTAR EJERCICIOS POR DÍA - DÍA 4 (Lower B)
-- ============================================================================

-- Day 4 - Exercise 1: Camilla Isquiotibiales
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day4_id::uuid, id, 1, 60, 'kg' FROM public.exercises WHERE name = 'Camilla Isquiotibiales (Hamstring Curl)'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 45, NULL),
  (:ex_id::uuid, 2, 10, 55, NULL),
  (:ex_id::uuid, 3, 10, 55, NULL);

-- Day 4 - Exercise 2: Prensa
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day4_id::uuid, id, 2, 120, 'kg' FROM public.exercises WHERE name = 'Prensa (Leg Press)'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 140, NULL),
  (:ex_id::uuid, 2, 10, 160, NULL),
  (:ex_id::uuid, 3, 8, 180, NULL);

-- Day 4 - Exercise 3: Sentadilla Sumo
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day4_id::uuid, id, 3, 90, 'kg' FROM public.exercises WHERE name = 'Sentadilla Sumo'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 60, NULL),
  (:ex_id::uuid, 2, 10, 70, NULL),
  (:ex_id::uuid, 3, 8, 80, NULL);

-- Day 4 - Exercise 4: Sillón Cuádriceps
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day4_id::uuid, id, 4, 60, 'kg' FROM public.exercises WHERE name = 'Sillón Cuádriceps (Leg Extension)'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 12, 65, NULL),
  (:ex_id::uuid, 2, 10, 75, NULL),
  (:ex_id::uuid, 3, 10, 75, NULL);

-- Day 4 - Exercise 5: Aductor en Máquina
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day4_id::uuid, id, 5, 45, 'kg' FROM public.exercises WHERE name = 'Aductor en Máquina'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 15, 65, NULL),
  (:ex_id::uuid, 2, 12, 75, NULL),
  (:ex_id::uuid, 3, 12, 75, NULL);

-- Day 4 - Exercise 6: Extensión de Gemelos
INSERT INTO public.routine_day_exercises (routine_day_id, exercise_id, position, rest_seconds, measure_unit)
SELECT :day4_id::uuid, id, 6, 45, 'kg' FROM public.exercises WHERE name = 'Extensión de Gemelos'
RETURNING id AS ex_id \gset

INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight, notes)
VALUES 
  (:ex_id::uuid, 1, 15, 110, NULL),
  (:ex_id::uuid, 2, 12, 130, NULL),
  (:ex_id::uuid, 3, 12, 130, NULL);

-- ============================================================================
-- 9. VERIFICACIÓN FINAL
-- ============================================================================

-- Mostrar resumen de la rutina creada
SELECT 
  r.name AS routine_name,
  COUNT(DISTINCT rd.id) AS total_days,
  COUNT(DISTINCT rde.id) AS total_exercises,
  COUNT(es.id) AS total_sets
FROM public.routines r
LEFT JOIN public.routine_days rd ON r.id = rd.routine_id
LEFT JOIN public.routine_day_exercises rde ON rd.id = rde.routine_day_id
LEFT JOIN public.exercise_sets es ON rde.id = es.routine_day_exercise_id
WHERE r.id = :routine_id::uuid
GROUP BY r.id, r.name;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Reemplazar 'YOUR_USER_ID' con el UUID real del usuario
-- 2. Los pesos, series y reps son genéricos y deben editarse en la aplicación
-- 3. Todos los ejercicios se insertan como ejercicios globales (sin user_id)
-- 4. La rutina se crea activa (is_active = true)
-- ============================================================================
