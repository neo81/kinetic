-- Migración para añadir soporte de ejercicios personalizados por usuario.

-- 1. Añadimos la columna user_id, con índice y llave foránea hacia auth.users
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Habilitamos la Seguridad por Nivel de Filas (RLS) en la tabla exercises
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- 3. Borramos políticas anteriores en caso de que existieran para evitar conflictos
DROP POLICY IF EXISTS "Ejercicios publicos y propios son visibles" ON public.exercises;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios ejercicios" ON public.exercises;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios ejercicios" ON public.exercises;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus propios ejercicios" ON public.exercises;

-- 4. Política de LECTURA: Un usuario puede ver los globales (user_id IS NULL) o los creados por él mismo.
CREATE POLICY "Ejercicios publicos y propios son visibles" 
ON public.exercises
FOR SELECT 
TO authenticated 
USING (user_id IS NULL OR user_id = auth.uid());

-- 4.1. Permitir que usuarios anónimos o deslogueados vean los globales temporalmente (opcional pero seguro)
CREATE POLICY "Ejercicios publicos visibles por todos" 
ON public.exercises
FOR SELECT 
TO public 
USING (user_id IS NULL);

-- 5. Política de CREACIÓN: Los usuarios solo pueden crear un ejercicio asociándolo permanentemente a su id.
CREATE POLICY "Usuarios pueden crear sus propios ejercicios" 
ON public.exercises
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- 6. Política de EDICIÓN: Solo pueden modificar el ejercicio si ellos son los dueños.
CREATE POLICY "Usuarios pueden actualizar sus propios ejercicios" 
ON public.exercises
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- 7. Política de BORRADO: Solo pueden borrar el ejercicio si ellos son los dueños.
CREATE POLICY "Usuarios pueden borrar sus propios ejercicios" 
ON public.exercises
FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());
