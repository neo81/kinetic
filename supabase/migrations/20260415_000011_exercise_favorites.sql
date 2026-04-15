-- Migración: Sistema de favoritos de ejercicios por usuario.

-- 1. Crear tabla de favoritos (relación many-to-many entre user y exercise)
CREATE TABLE IF NOT EXISTS public.exercise_favorites (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);

-- 2. Índice para consultas rápidas por ejercicio (útil si en el futuro mostramos conteo de favs)
CREATE INDEX IF NOT EXISTS exercise_favorites_exercise_id_idx
  ON public.exercise_favorites(exercise_id);

-- 3. Habilitar RLS
ALTER TABLE public.exercise_favorites ENABLE ROW LEVEL SECURITY;

-- 4. Política de LECTURA: cada usuario solo ve sus propios favoritos
DROP POLICY IF EXISTS "favorites_select_own" ON public.exercise_favorites;
CREATE POLICY "favorites_select_own"
ON public.exercise_favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Política de INSERCIÓN: solo puede agregar favoritos a su propia cuenta
DROP POLICY IF EXISTS "favorites_insert_own" ON public.exercise_favorites;
CREATE POLICY "favorites_insert_own"
ON public.exercise_favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 6. Política de BORRADO: solo puede eliminar sus propios favoritos
DROP POLICY IF EXISTS "favorites_delete_own" ON public.exercise_favorites;
CREATE POLICY "favorites_delete_own"
ON public.exercise_favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
