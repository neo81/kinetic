# 📚 SportClub Full Body - Resumen de Archivos Creados

## 📄 Archivos Generados

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `routine_sportclub_step1_exercises.sql` | Insertar 33 ejercicios | ✅ Listo |
| `routine_sportclub_step2_routine.sql` | Crear rutina y días | ✅ Listo |
| `routine_sportclub_full.sql` | Script completo (referencia) | 📖 Referencia |
| `ROUTINE_SPORTCLUB_README.md` | Guía detallada de uso | 📖 Lectura |
| `ROUTINE_SPORTCLUB_SUMMARY.md` | Resumen visual de ejercicios | 📖 Lectura |
| `ROUTINE_SETUP_GUIDE.md` | Guía rápida paso a paso | ✅ Recomendado |
| `MUSCLE_GROUPS_REFERENCE.md` | Códigos de grupos musculares | ✅ Referencia |

---

## 🚀 Cómo Comenzar (5 minutos)

### Paso 1️⃣: Obtener tu UUID
```
Supabase Dashboard > Auth > Users > Copia tu UUID
Ejemplo: 0b0a3cfb-f3b8-488c-abc9-ff06f7c1f7e2
```

### Paso 2️⃣: Ejecutar Step 1 (Ejercicios)
```sql
-- Abre: Supabase > SQL Editor > New Query
-- Copia TODO de: routine_sportclub_step1_exercises.sql
-- Click: RUN
-- Resultado: "PASO 1 COMPLETO: Ejercicios insertados ✓"
```

### Paso 3️⃣: Ejecutar Step 2 (Rutina y Días)
```sql
-- Abre: Supabase > SQL Editor > New Query
-- Copia TODO de: routine_sportclub_step2_routine.sql
-- Reemplaza: 'YOUR_USER_ID' con tu UUID
-- Click: RUN
-- Resultado: ID de la rutina creada (cópialo)
```

### Paso 4️⃣: Crear los Días
```sql
-- Ejecuta la parte 2B del mismo script
-- Reemplaza: 'routine_id_aqui' con el ID del paso anterior
-- Click: RUN
-- Resultado: "PASO 2B COMPLETO: Días creados ✓"
```

### Paso 5️⃣: Agregar Ejercicios (Desde la App)
```
Abre Kinetic > Routines > SportClub Full Body
Selecciona un día > Agregar Ejercicio > Busca y agrega ejercicios
```

---

## 📊 Qué Se Crea

### Rutina Principal
- **Nombre:** SportClub Full Body
- **Descripción:** Rutina de 4 días: 1 CORE + 3 Splits
- **Estado:** Activa

### 5 Días de Entrenamiento
| Día | Tipo | Ejercicios |
|-----|------|-----------|
| CORE | Core | 3 |
| Día 1 | Weekday 1 | 8 (Upper A) |
| Día 2 | Weekday 3 | 7 (Lower) |
| Día 3 | Weekday 5 | 9 (Upper B) |
| Día 4 | Weekday 6 | 6 (Lower B) |

### 33 Ejercicios Nuevos en Catálogo
- 3 CORE
- 8 Upper Body Press & Back
- 7 Lower Body
- 9 Upper Body Rows & Back
- 6 Lower Body Variant

---

## 🎯 Estructura de Datos Insertada

```
Tabla: exercises
├── 33 ejercicios nuevos
├── Con descripciones completas
├── Asociados a grupos musculares correctos
└── Equipamiento especificado

Tabla: routines
├── 1 rutina: SportClub Full Body
├── Para tu usuario
├── Estado: Activa
└── Con notas y descripción

Tabla: routine_days
├── 5 días creados
├── 1 CORE (day_type = 'core')
├── 4 Weekdays (day_number = 1, 3, 5, 6)
└── Títulos descriptivos

Tabla: routine_day_exercises
├── 0 (inicialmente)
├── Se agregan manualmente desde la app
└── O usando scripts adicionales
```

---

## 📖 Documentación Creada

### Para Usuarios Finales
- **ROUTINE_SETUP_GUIDE.md** - Guía paso a paso (recomendado)
- **ROUTINE_SPORTCLUB_SUMMARY.md** - Tabla visual de ejercicios

### Para Desarrolladores/Referencia
- **ROUTINE_SPORTCLUB_README.md** - Guía técnica completa
- **MUSCLE_GROUPS_REFERENCE.md** - Códigos de grupos musculares
- **routine_sportclub_full.sql** - Script monolítico (referencia)

---

## 🔧 Archivos SQL por Fase

### FASE 1: Insertar Ejercicios
```
Archivo: routine_sportclub_step1_exercises.sql
Acción: INSERT INTO exercises
Registros: 33
Cambios: NINGUNO (listo para ejecutar)
```

### FASE 2A: Crear Rutina
```
Archivo: routine_sportclub_step2_routine.sql (Sección A)
Acción: INSERT INTO routines
Registros: 1
Cambios: Reemplazar 'YOUR_USER_ID' con tu UUID
```

### FASE 2B: Crear Días
```
Archivo: routine_sportclub_step2_routine.sql (Sección B)
Acción: INSERT INTO routine_days
Registros: 5
Cambios: Reemplazar 'routine_id_aqui' con ID del paso 2A
```

### FASE 3: Agregar Ejercicios (Manual en App o SQL)
```
Acción: INSERT INTO routine_day_exercises + exercise_sets
Método: Recomendado es usar la App (más intuitivo)
```

---

## ✅ Verificación

### Después de Step 1
```sql
SELECT COUNT(*) as ejercicios 
FROM public.exercises 
WHERE name IN ('Pallof', 'Bicho Muerto (Dead Bug)', 'Sentadillas');
-- Resultado esperado: 3
```

### Después de Step 2A
```sql
SELECT * FROM public.routines 
WHERE name = 'SportClub Full Body';
-- Resultado esperado: 1 fila
```

### Después de Step 2B
```sql
SELECT COUNT(*) as dias 
FROM public.routine_days 
WHERE routine_id = (SELECT id FROM public.routines WHERE name = 'SportClub Full Body');
-- Resultado esperado: 5
```

---

## 🔄 Flujo Completo (Visual)

```
┌─────────────────────────────────────┐
│  1. Obtener UUID del Usuario        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Ejecutar Step 1 (Ejercicios)    │
│     ✓ 33 ejercicios insertados      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Ejecutar Step 2A (Rutina)       │
│     ✓ Rutina creada                 │
│     → Copiar routine_id             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Ejecutar Step 2B (Días)         │
│     ✓ 5 días creados                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. Agregar Ejercicios (App)        │
│     - Día CORE: 3 ejercicios        │
│     - Día 1: 8 ejercicios           │
│     - Día 2: 7 ejercicios           │
│     - Día 3: 9 ejercicios           │
│     - Día 4: 6 ejercicios           │
│     ✓ Rutina completa               │
└─────────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### ❌ Error: null value in column "muscle_group_id"
**Causa:** Script antiguo con códigos incorrectos
**Solución:** ✅ YA CORREGIDO en `routine_sportclub_step1_exercises.sql`

### ❌ Error: 'YOUR_USER_ID' is not a valid UUID
**Causa:** No reemplazaste el placeholder
**Solución:** Reemplaza con tu UUID real (sin comillas extra)

### ❌ Error: duplicate key violates unique constraint
**Causa:** Intentaste insertar ejercicios duplicados
**Solución:** Normal, el script usa `ON CONFLICT DO NOTHING`

### ✅ Todo funcionó!
**Verifica:** Abre Kinetic > Routines > Busca "SportClub Full Body"

---

## 📚 Lectura Adicional

1. **ROUTINE_SETUP_GUIDE.md** - Instrucciones detalladas paso a paso
2. **ROUTINE_SPORTCLUB_SUMMARY.md** - Visualización de la rutina completa
3. **MUSCLE_GROUPS_REFERENCE.md** - Referencia de grupos musculares
4. **ROUTINE_SPORTCLUB_README.md** - Documentación técnica completa

---

## 🎓 Conceptos Clave

### Rutina (routine)
Contenedor principal que agrupa días y ejercicios. Usuario específico.

### Día (routine_day)
Día individual dentro de una rutina (ej: Monday, Tuesday). Puede ser `core` o `weekday`.

### Ejercicio del Día (routine_day_exercise)
Ejercicio específico asignado a un día. Incluye posición, descanso, etc.

### Serie (exercise_set)
Repetición individual de un ejercicio (ej: 12 reps @ 50kg).

### Grupo Muscular (muscle_group)
Categoría de músculos (pectorales, dorsales, cuádriceps, etc).

---

## 📞 Soporte

Si tienes problemas:

1. Revisa **ROUTINE_SETUP_GUIDE.md** - Troubleshooting
2. Verifica tu UUID - Supabase > Auth > Users
3. Usa **MUSCLE_GROUPS_REFERENCE.md** para códigos correctos
4. Revisa los logs de Supabase SQL Editor

---

**Versión:** 1.0
**Fecha:** 2026-04-22
**Estado:** ✅ Completo y Funcional
**Próximo:** Agregar ejercicios a los días desde la app
