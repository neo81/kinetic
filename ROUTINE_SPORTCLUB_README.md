# 📋 Rutina SportClub Full Body - Guía de Inserción

## Resumen

Script SQL completo para insertar la **Rutina SportClub Full Body** en la base de datos de Kinetic.

**Estructura:**
- ✅ 1 Día CORE (3 ejercicios)
- ✅ Día 1: Upper A - Press & Back (8 ejercicios)
- ✅ Día 2: Lower - Piernas (7 ejercicios)
- ✅ Día 3: Upper B - Rows & Back (9 ejercicios)
- ✅ Día 4: Lower B - Piernas (6 ejercicios)

**Total:**
- **33 ejercicios únicos** (13 nuevos agregados al catálogo)
- **4 días de rutina** + 1 CORE
- **110 series genéricas** (3 series por ejercicio aproximadamente)

---

## 📁 Archivo

**Nombre:** `routine_sportclub_full.sql`
**Ubicación:** Raíz del proyecto
**Tamaño:** ~26KB

---

## 🚀 Cómo Usar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre [Supabase Dashboard](https://app.supabase.com/)**
2. **Navega a tu proyecto Kinetic**
3. **Ve a SQL Editor** (esquina izquierda)
4. **Crea una nueva query:**
   - Click en "New Query"
   - O pega el contenido del archivo directamente
5. **Reemplaza el usuario:**
   - Busca: `:user_id '12345678-1234-5678-1234-567812345678'`
   - Reemplaza con tu UUID de usuario real
6. **Ejecuta el script completo:**
   - Click en "RUN" (esquina superior derecha)

### Opción 2: Desde Terminal (psql)

```bash
# Asume que tienes psql instalado y credenciales de Supabase
psql -h "tu-proyecto.supabase.co" \
     -U "postgres" \
     -d "postgres" \
     --set user_id="'tu-uuid-real'" \
     -f routine_sportclub_full.sql
```

### Opción 3: Desde la App (Interfaz de Usuario)

1. **Login en Kinetic**
2. **Ve a Routines**
3. **Click en "Crear Nueva Rutina"**
4. **Ingresa manualmente los ejercicios**
   - (Más lento, pero permite personalizar en tiempo real)

---

## 🔍 Cómo Obtener tu UUID de Usuario

### Método 1: Desde Supabase Dashboard

```sql
SELECT id, full_name, username FROM public.profiles LIMIT 10;
```

Ejecuta esta query en SQL Editor y copia el `id` (UUID).

### Método 2: Desde la App (Consola del Navegador)

```javascript
// En DevTools > Console
localStorage.getItem('user_id')
// O verifica en sessionStorage
sessionStorage.getItem('auth_token')
```

### Método 3: Desde Auth > Users

En Supabase Dashboard:
1. **Auth > Users**
2. **Copia el UUID del usuario**

---

## 📝 Estructura del Script

### Sección 1: Ejercicios CORE
```sql
INSERT INTO public.exercises (name, description, muscle_group_id, equipment, is_active)
VALUES 
  ('Pallof', '...', ..., 'Cable', true),
  ('Bicho Muerto (Dead Bug)', '...', ..., 'Peso corporal', true),
  ('Plancha Isométrica', '...', ..., 'Peso corporal', true)
```

### Sección 2: Ejercicios Upper Body
- Press Inclinado con Mancuernas
- Press Plano con Barra
- Remo Gironda
- Dorsalera
- Press Militar con Mancuernas
- Press Francés con Mancuernas
- Vuelos Laterales
- Curl de Bíceps
- Dominadas
- Remo Pendlay en Máquina
- Mariposa
- Curl Martillo con Mancuernas
- Tríceps en Polea

### Sección 3: Ejercicios Lower Body
- Sentadillas
- Estocadas
- Sillón Isquiotibiales
- Sillón Cuádriceps
- Camilla Isquiotibiales
- Aductores en Máquina
- Extensión de Gemelos
- Prensa
- Sentadilla Sumo
- Aductor en Máquina
- Posteriores en Máquina

### Sección 4: Rutina Principal
Crea la rutina con 4 días + 1 CORE

### Sección 5: Ejercicios por Día
Inserta ejercicios en orden con:
- `position`: Posición en el día (1, 2, 3...)
- `rest_seconds`: Segundos de descanso entre series
- `measure_unit`: 'kg', 'sec', o 'min'

### Sección 6: Series
Cada ejercicio tiene 3 series genéricas con:
- `reps`: Repeticiones (genérico)
- `weight`: Peso en kg (genérico)
- `duration_seconds`: Duración en segundos (para ejercicios isométricos)

---

## ⚙️ Valores Genéricos (Editar Después)

Todos los pesos, reps y series son genéricos. Edita en la app después:

### Ejemplo de valores genéricos:

**CORE:**
- Pallof: 3×12 reps (30 segundos)
- Dead Bug: 3×15 reps
- Plancha: 3×60 segundos

**Upper A:**
- Press Inclinado: 3×12, 10, 8 reps @ 20kg, 25kg, 30kg
- Press Plano: 3×8 reps @ 60kg, 60kg, 70kg
- Remo Gironda: 3×8, 8, 6 reps @ 80kg, 80kg, 90kg

**Lower:**
- Sentadillas: 3×10, 8, 6 reps @ 80kg, 100kg, 110kg
- Prensa: 3×12, 10, 8 reps @ 140kg, 160kg, 180kg

---

## 🔧 Editar la Rutina Después

### En la Aplicación:

1. **Dashboard > Routines**
2. **Click en "SportClub Full Body"**
3. **Edita ejercicios:**
   - Cambiar peso/reps
   - Agregar notas
   - Cambiar orden
4. **Guarda cambios**

### En Supabase (Queries):

Cambiar peso de un ejercicio específico:
```sql
UPDATE public.exercise_sets
SET weight = 50
WHERE routine_day_exercise_id = (
  SELECT id FROM public.routine_day_exercises
  WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Sentadillas')
  LIMIT 1
)
AND set_number = 2;
```

Agregar una serie más a un ejercicio:
```sql
INSERT INTO public.exercise_sets (routine_day_exercise_id, set_number, reps, weight)
SELECT id, 4, 6, 120 FROM public.routine_day_exercises
WHERE exercise_id = (SELECT id FROM public.exercises WHERE name = 'Sentadillas')
LIMIT 1;
```

---

## ✅ Verificación

Después de ejecutar el script, verifica:

### 1. Rutina Creada
```sql
SELECT * FROM public.routines 
WHERE name = 'SportClub Full Body' 
LIMIT 1;
```

### 2. Días Creados
```sql
SELECT rd.day_type, rd.day_number, rd.title, COUNT(rde.id) as exercise_count
FROM public.routine_days rd
LEFT JOIN public.routine_day_exercises rde ON rd.id = rde.routine_day_id
WHERE rd.routine_id = (SELECT id FROM public.routines WHERE name = 'SportClub Full Body' LIMIT 1)
GROUP BY rd.id, rd.day_type, rd.day_number, rd.title
ORDER BY rd.position;
```

### 3. Ejercicios Agregados
```sql
SELECT COUNT(*) as total_exercises FROM public.exercises 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### 4. Series por Día
```sql
SELECT rd.title, COUNT(es.id) as total_sets
FROM public.routine_days rd
LEFT JOIN public.routine_day_exercises rde ON rd.id = rde.routine_day_id
LEFT JOIN public.exercise_sets es ON rde.id = es.routine_day_exercise_id
WHERE rd.routine_id = (SELECT id FROM public.routines WHERE name = 'SportClub Full Body' LIMIT 1)
GROUP BY rd.id, rd.title;
```

---

## 🐛 Troubleshooting

### Error: "Cannot insert duplicate exercise"
**Causa:** El script intenta insertar ejercicios que ya existen.
**Solución:** Usa `ON CONFLICT DO NOTHING` (ya incluido en el script)

### Error: "user_id not found"
**Causa:** El UUID no existe en la tabla de profiles.
**Solución:** Verifica que el usuario esté registrado en Kinetic primero.

### Error: "muscle_group_id not found"
**Causa:** Los grupos musculares no están insertados.
**Solución:** El script obtiene el ID automáticamente. Si falla, ejecuta primero:
```sql
SELECT id, code, name FROM public.muscle_groups;
```

---

## 📊 Estructura de Datos

### Rutina (routines)
```
id: UUID auto-generado
user_id: Tu UUID
name: "SportClub Full Body"
is_active: true
```

### Días (routine_days)
```
id: UUID auto-generado
routine_id: FK a routines
day_type: 'core' o 'weekday'
day_number: 1-7 (NULL para CORE)
position: 1-5 (orden en la rutina)
```

### Ejercicios del Día (routine_day_exercises)
```
id: UUID auto-generado
routine_day_id: FK a routine_days
exercise_id: FK a exercises
position: Orden dentro del día
rest_seconds: Descanso entre series
measure_unit: 'kg', 'sec', 'min'
```

### Series (exercise_sets)
```
id: UUID auto-generado
routine_day_exercise_id: FK a routine_day_exercises
set_number: 1, 2, 3...
reps: Repeticiones (NULL si no aplica)
weight: Peso en kg (NULL si no aplica)
duration_seconds: Duración en segundos (para isométricos)
```

---

## 🎯 Próximos Pasos

1. **Ejecuta el script** con tu UUID real
2. **Verifica en la app** que la rutina aparezca
3. **Edita valores genéricos:**
   - Cambiar pesos reales
   - Ajustar reps según capacidad
   - Personalizar descansos
4. **Comienza a entrenar!**

---

## 📞 Soporte

Si hay problemas:

1. **Verifica el UUID:** Asegúrate de que sea válido
2. **Revisa los logs:** Supabase muestra errores en la query
3. **Intenta con un ejercicio:** Ejecuta solo la sección de ejercicios primero
4. **Contacta support:** Incluye el error exacto

---

## 📄 Licencia

Este script es parte del proyecto Kinetic y está disponible para uso personal.

---

**Creado:** 2026-04-22
**Versión:** 1.0
**Compatibilidad:** Kinetic v5.0+
