# 🚀 Guía Rápida: Insertar Rutina SportClub en la BD

## ⚡ Resumen Ultra-Rápido

**3 pasos simples:**
1. Ejecuta `routine_sportclub_step1_exercises.sql` (sin cambios)
2. Ejecuta `routine_sportclub_step2_routine.sql` (reemplaza USER_ID y routine_id_aqui)
3. Usa la app para agregar ejercicios a los días (o ejecuta script manual)

**Tiempo total:** ~5 minutos

---

## 📋 Paso 1: Obtener tu UUID de Usuario

### Opción A: Desde Supabase Dashboard (Recomendado)
1. Abre [Supabase](https://app.supabase.com/)
2. Ve a **Auth > Users**
3. Copia el UUID del usuario (primera columna)
4. Ej: `0b0a3cfb-f3b8-488c-abc9-ff06f7c1f7e2`

### Opción B: Desde la App Kinetic
1. Abre DevTools (F12)
2. Ve a **Console**
3. Ejecuta:
   ```javascript
   localStorage.getItem('user_id')
   ```
4. Copia el resultado

### Opción C: Desde SQL en Supabase
```sql
SELECT id, full_name, username FROM public.profiles LIMIT 5;
```
Copia el `id` de tu usuario.

---

## 🛠️ Paso 2: Ejecutar Scripts en Supabase

### ⚠️ IMPORTANTE - Corrección del Script

Si recibiste este error:
```
ERROR: null value in column "muscle_group_id" violates not-null constraint
```

**✅ YA ESTÁ CORREGIDO.** El archivo `routine_sportclub_step1_exercises.sql` ha sido actualizado con los códigos correctos de grupos musculares.

Los códigos utilizados ahora son:
- `pectorales`, `hombros`, `biceps`, `triceps` (Upper Body)
- `cuadriceps`, `isquiotibiales`, `gluteos`, `pantorrillas` (Lower Body)
- `abdomen`, `oblicuos` (Core)
- `dorsales`, `aductores` (Complementarios)

Ver `MUSCLE_GROUPS_REFERENCE.md` para lista completa.

### Step 1: Insertar Ejercicios

1. Abre [Supabase Dashboard](https://app.supabase.com/)
2. Ve a tu proyecto Kinetic
3. Click en **SQL Editor** (lado izquierdo)
4. Click en **New Query**
5. **Copia TODO el contenido** de `routine_sportclub_step1_exercises.sql`
6. **Pega** en el editor
7. Click en **RUN** (arriba a la derecha)
8. Deberías ver: `PASO 1 COMPLETO: Ejercicios insertados ✓`

✅ **Paso 1 listo!**

---

### Step 2A: Crear Rutina

1. **Nueva Query** en SQL Editor
2. **Copia TODO** de `routine_sportclub_step2_routine.sql`
3. **Pega** en el editor
4. **Línea 15:** Reemplaza `'YOUR_USER_ID'` con tu UUID
   - Ejemplo: `'0b0a3cfb-f3b8-488c-abc9-ff06f7c1f7e2'::uuid`
5. Click en **RUN**
6. **IMPORTANTE:** Copia el ID que aparece en la respuesta
   - Parecerá una tabla con una columna `id`
   - Ej: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
7. Guarda ese ID (lo necesitarás en Step 2B)

✅ **Rutina creada!**

---

### Step 2B: Crear Días de la Rutina

1. **Nueva Query** en SQL Editor
2. **Copia TODO** de `routine_sportclub_step2_routine.sql` (la parte 2B)
3. **Pega** en el editor
4. **Reemplaza `'routine_id_aqui'`** con el ID del Step 2A
   - Ejemplo: `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid`
5. Click en **RUN**
6. Deberías ver: `PASO 2B COMPLETO: Días creados ✓`

✅ **Días creados!**

---

## 🎮 Paso 3: Agregar Ejercicios a los Días (OPCIÓN A - Fácil)

### Desde la App Kinetic (Recomendado)

1. **Abre Kinetic** en tu navegador
2. **Ve a Routines**
3. **Click en "SportClub Full Body"**
4. **Selecciona un día** (ej: CORE, Día 1, etc.)
5. **Click en "Agregar Ejercicio"**
6. **Busca y selecciona** los ejercicios (están en el catálogo)
7. **Configura:**
   - Series
   - Reps/Pesos
   - Descanso
8. **Guarda**
9. **Repite** para todos los días

**Esto es lo ideal porque personaliza todo en la UI.**

---

## 🔧 Paso 3B: Agregar Ejercicios a los Días (OPCIÓN B - Automático)

Si quieres saltarte la UI y agregar todo automáticamente, necesitarías:

1. Los IDs de cada day (`routine_days.id`)
2. Los IDs de cada exercise (`exercises.id`)
3. Un script SQL que inserte `routine_day_exercises` y `exercise_sets`

**Eso es más complejo, así que recomendamos la OPCIÓN A.**

---

## ✅ Verificación

### Verifica que todo está bien

**Query 1: Rutina Creada**
```sql
SELECT id, name, is_active FROM public.routines 
WHERE name = 'SportClub Full Body' LIMIT 1;
```
Resultado: Debe mostrar la rutina con `is_active = true`

**Query 2: Días Creados**
```sql
SELECT day_type, day_number, title, position 
FROM public.routine_days 
WHERE routine_id = (SELECT id FROM public.routines WHERE name = 'SportClub Full Body' LIMIT 1)
ORDER BY position;
```
Resultado: Debe mostrar 5 días (CORE + 4 días)

**Query 3: Ejercicios en Catálogo**
```sql
SELECT COUNT(*) as total_exercises FROM public.exercises 
WHERE name IN ('Pallof', 'Bicho Muerto (Dead Bug)', 'Sentadillas', 'Dominadas');
```
Resultado: Debe mostrar 4 (al menos)

---

## 📚 Estructura de la Rutina (Recordatorio)

```
SportClub Full Body
├── CORE (3 ejercicios)
│   ├── Pallof
│   ├── Bicho Muerto
│   └── Plancha Isométrica
├── Día 1 - Upper A (8 ejercicios)
├── Día 2 - Lower (7 ejercicios)
├── Día 3 - Upper B (9 ejercicios)
└── Día 4 - Lower B (6 ejercicios)
```

Ver `ROUTINE_SPORTCLUB_SUMMARY.md` para detalles completos.

---

## ⚠️ Problemas Comunes

### ❌ "Syntax error near 'YOUR_USER_ID'"
**Solución:** Reemplazaste el placeholder pero dejaste las comillas.
```sql
-- ❌ Incorrecto
'YOUR_USER_ID'::uuid

-- ✅ Correcto
'0b0a3cfb-f3b8-488c-abc9-ff06f7c1f7e2'::uuid
```

### ❌ "user_id not found"
**Solución:** El UUID no existe. Verifica que es un usuario real en Supabase Auth.

### ❌ "Duplicate key value violates unique constraint"
**Solución:** Los ejercicios ya existen. Es normal (ON CONFLICT DO NOTHING lo maneja).

### ❌ "relation 'muscle_groups' does not exist"
**Solución:** Ejecuta PRIMERO el script de migraciones de Kinetic.

---

## 🚀 Próximos Pasos

### Opción 1: Editar en la App (Recomendado)
1. Abre Kinetic
2. Ve a Routines > SportClub Full Body
3. Personaliza ejercicios, pesos y series

### Opción 2: Exportar y Compartir
1. Una vez listos los datos, puedes exportar como JSON/CSV
2. Comparte la rutina con otros usuarios

### Opción 3: Crear Variantes
1. Copia la rutina
2. Crea nuevas variantes (ej: "SportClub Full Body v2")
3. Ajusta según feedback

---

## 📊 Referencia Rápida

| Archivo | Propósito | Cambios Necesarios |
|---------|-----------|-------------------|
| `routine_sportclub_step1_exercises.sql` | Insertar 33 ejercicios | ❌ Ninguno |
| `routine_sportclub_step2_routine.sql` | Crear rutina y días | ✅ USER_ID y routine_id_aqui |
| `routine_sportclub_full.sql` | Script completo (referencia) | ✅ USER_ID |
| `ROUTINE_SPORTCLUB_README.md` | Instrucciones detalladas | 📖 Lectura |
| `ROUTINE_SPORTCLUB_SUMMARY.md` | Resumen visual | 📖 Lectura |

---

## 💡 Tips Finales

1. **Guarda los IDs:** Copia y pega el routine_id en un editor de texto para referencia futura
2. **Usa copiar/pegar:** Evita errores de tipeo manual
3. **Verifica cada paso:** No asumas que funcionó, revisa la respuesta
4. **Pregunta si hay dudas:** Este proceso es sensible a detalles

---

**Versión:** 1.0  
**Fecha:** 2026-04-22  
**Compatibilidad:** Supabase + Kinetic v5.0+
