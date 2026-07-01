# Backup limpio Supabase - 2026-06-30

Proyecto: `Kinetic`
Project ID: `inbfezuypeneqjjusuug`
Schema de backup creado en Supabase: `backup_clean_20260630`

## Alcance

Backup logico dentro de Supabase con tablas copiadas desde `public`, excluyendo:

- usuarios `auth.users` cuyo email cumple `^test[0-9]*@mail\.com$`
- rutinas E2E/test
- sesiones y logs de sesiones E2E/test
- estadisticas y rate limits de usuarios test

No incluye tokens/sesiones de `auth`. Incluye `auth_users_snapshot` con `id`, `email` y fechas basicas de usuarios reales para trazabilidad.

## Conteos

| Tabla | Filas |
| --- | ---: |
| auth_users_snapshot | 4 |
| exercise_favorites | 1 |
| exercise_sets | 42 |
| exercises | 93 |
| function_rate_limits | 1 |
| muscle_groups | 17 |
| profiles | 4 |
| routine_day_exercises | 13 |
| routine_days | 4 |
| routine_sessions | 36 |
| routines | 2 |
| session_day_logs | 14 |
| session_exercise_logs | 42 |
| session_set_logs | 135 |
| user_goals | 0 |
| user_preferences | 4 |
| weekly_statistics | 3 |

## Validacion anti-test

Las verificaciones en `backup_clean_20260630` devolvieron `0` para:

- emails test en `auth_users_snapshot`
- nombres de rutina `E2E`
- `user_id` test en `exercises`
- `user_id` test en `routine_sessions`
- `user_id` test en `weekly_statistics`
- `user_id` test en `function_rate_limits`
- nombres `Ejercicio Carga U...`, `Ejercicio Finalizacion U...`, `Ejercicio Test...` o `E2E...` en `exercises`

## Ajuste posterior

Luego de crear el backup se detectaron 90 ejercicios globales de test en `Pectorales` con nombres como `Ejercicio Carga U1 D1 E2`.
Fueron eliminados tanto de `public.exercises` como del schema `backup_clean_20260630`.
