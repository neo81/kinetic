# Memoria técnica - Edge Function iOS PWA (2026-05-06)

## Contexto
Incidente: al finalizar sesión de rutina en iOS PWA, la app mostraba:

`Failed to send a request to the Edge Function`

En browser de PC sí funcionaba.

## Diagnóstico
- El payload JSON de `session_end` era válido en estructura.
- El mensaje "after 4 attempts" provenía de reintentos internos de `invokeEndSession` (no del contador global de cola).
- La causa principal de no sincronización era CORS en la Edge Function compartida.

## Causa raíz
En `supabase/functions/_shared/cors.ts`, la respuesta CORS podía usar un `Access-Control-Allow-Origin` no compatible con el `origin` real en iOS PWA (standalone), provocando bloqueo CORS y error de red genérico del cliente.

## Cambios implementados

### 1) CORS robusto
Archivo: `supabase/functions/_shared/cors.ts`
- Soporte para modo estricto con `ALLOWED_ORIGINS`.
- Si no hay `ALLOWED_ORIGINS`, se refleja `origin` dinámicamente.
- Manejo de `origin` nulo para contexto iOS standalone.
- Header agregado: `Access-Control-Max-Age: 86400`.

### 2) Observabilidad de función
Archivo: `supabase/functions/end-session/index.ts`
- Log de entrada por request con método, origin y user-agent.

### 3) Claridad de errores en cliente/cola
Archivos:
- `src/services/sessionCompletion/invokeEndSession.ts`
- `src/services/syncQueue/setupSyncHandlers.ts`
- `src/services/syncQueue/retryStrategy.ts`

Mejoras:
- Mensajes distinguen intentos internos vs intentos de cola.
- Handler de cola agrega prefijo `[queue attempt X]`.
- Corrección de condición de retry para evitar reintentos extra.

## Configuración aplicada
- Dominio producción: `https://kineticvolt.vercel.app`
- `ALLOWED_ORIGINS`:
  - `https://kineticvolt.vercel.app,http://localhost:3000,http://127.0.0.1:3000`

## Resultado
✅ Confirmado por validación funcional: sincronización con Supabase operativa en iOS PWA.

## Comandos útiles
```bash
supabase secrets set ALLOWED_ORIGINS="https://kineticvolt.vercel.app,http://localhost:3000,http://127.0.0.1:3000"
supabase functions deploy end-session
```

