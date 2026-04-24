# 🔧 Referencia: Códigos de Grupos Musculares

## Códigos Disponibles en Kinetic

Estos son los códigos correctos que debes usar en los scripts SQL.

### 🟦 Frente (Front)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `hombros` | Hombros | Deltoides anterior, lateral, posterior |
| `pectorales` | Pectorales | Pecho mayor y menor |
| `biceps` | Bíceps | Brazo anterior, flexores |
| `abdomen` | Abdomen | Recto abdominal |
| `oblicuos` | Oblicuos | Abdominales laterales |
| `antebrazo` | Antebrazo | Flexores de muñeca y antebrazos |
| `abductores` | Abductores | Separadores de cadera (laterales) |
| `aductores` | Aductores | Aductores de cadera (internos) |
| `cuadriceps` | Cuádriceps | Pierna anterior |

### 🟫 Espalda (Back)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `trapecio` | Trapecio | Espalda superior |
| `triceps` | Tríceps | Brazo posterior |
| `dorsales` | Dorsales | Dorsal ancho, espalda media |
| `lumbares` | Lumbares | Espalda baja |
| `gluteos` | Glúteos | Glúteo mayor, medio, menor |
| `isquiotibiales` | Isquiotibiales | Pierna posterior |
| `pantorrillas` | Pantorrillas | Gemelos |

---

## 📋 Ejercicios SportClub by Grupo

### CORE (3 ejercicios)
```sql
SELECT 
  'Pallof' => 'oblicuos',
  'Bicho Muerto (Dead Bug)' => 'abdomen',
  'Plancha Isométrica' => 'abdomen'
```

### Upper A - Pecho & Espalda (8 ejercicios)
```sql
SELECT 
  'Press Inclinado con Mancuernas' => 'pectorales',
  'Press Plano con Barra' => 'pectorales',
  'Remo Gironda' => 'dorsales',
  'Dorsalera' => 'dorsales',
  'Press Militar con Mancuernas' => 'hombros',
  'Press Francés con Mancuernas' => 'triceps',
  'Vuelos Laterales' => 'hombros',
  'Curl de Bíceps' => 'biceps'
```

### Lower - Piernas (7 ejercicios)
```sql
SELECT 
  'Sentadillas' => 'cuadriceps',
  'Estocadas' => 'cuadriceps',
  'Sillón Isquiotibiales (Leg Curl)' => 'isquiotibiales',
  'Sillón Cuádriceps (Leg Extension)' => 'cuadriceps',
  'Camilla Isquiotibiales (Hamstring Curl)' => 'isquiotibiales',
  'Aductores en Máquina' => 'aductores',
  'Extensión de Gemelos' => 'pantorrillas'
```

### Upper B - Espalda & Brazos (9 ejercicios)
```sql
SELECT 
  'Dominadas' => 'dorsales',
  'Press Inclinado con Mancuernas' => 'pectorales',
  'Remo Pendlay en Máquina' => 'dorsales',
  'Mariposa (Pec Deck)' => 'pectorales',
  'Remo Gironda' => 'dorsales',
  'Vuelos Laterales' => 'hombros',
  'Curl Martillo con Mancuernas' => 'biceps',
  'Tríceps en Polea' => 'triceps',
  'Posteriores en Máquina' => 'gluteos'
```

### Lower B - Piernas (6 ejercicios)
```sql
SELECT 
  'Camilla Isquiotibiales (Hamstring Curl)' => 'isquiotibiales',
  'Prensa (Leg Press)' => 'cuadriceps',
  'Sentadilla Sumo' => 'gluteos',
  'Sillón Cuádriceps (Leg Extension)' => 'cuadriceps',
  'Aductor en Máquina' => 'aductores',
  'Extensión de Gemelos' => 'pantorrillas'
```

---

## ✅ Script Corregido

El archivo `routine_sportclub_step1_exercises.sql` ya usa los códigos correctos:

```sql
INSERT INTO public.exercises (name, description, muscle_group_id, equipment, is_active)
VALUES 
  ('Pallof', '...', (SELECT id FROM public.muscle_groups WHERE code = 'oblicuos'), 'Cable', true),
  ('Press Inclinado con Mancuernas', '...', (SELECT id FROM public.muscle_groups WHERE code = 'pectorales'), 'Mancuernas', true),
  -- etc...
```

**Ya está listo para ejecutar sin cambios.**

---

## 🚀 Próximos Pasos

1. **Ejecuta STEP 1:** `routine_sportclub_step1_exercises.sql` (sin cambios)
2. **Ejecuta STEP 2A:** `routine_sportclub_step2_routine.sql` (con tu USER_ID)
3. **Ejecuta STEP 2B:** `routine_sportclub_step2_routine.sql` (con routine_id_aqui)

---

## 📚 Referencia SQL Completa

### Consultar todos los grupos musculares
```sql
SELECT id, code, name, body_side, sort_order 
FROM public.muscle_groups 
ORDER BY sort_order;
```

### Consultar ejercicios por grupo
```sql
SELECT e.name, mg.code, mg.name 
FROM public.exercises e
JOIN public.muscle_groups mg ON e.muscle_group_id = mg.id
WHERE mg.code = 'pectorales'
ORDER BY e.name;
```

### Ver qué códigos faltan
```sql
SELECT DISTINCT code FROM public.muscle_groups;
```

---

**Versión:** 1.0  
**Fecha:** 2026-04-22  
**Estado:** ✅ Actualizado con códigos correctos
