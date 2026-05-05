# Guía de Testing para iOS PWA - Sincronización de Sesiones

## Problemas Solucionados

### 1. Imágenes Rotas en Login ✅
**Estado**: SOLUCIONADO
- Actualizado CSP en `vercel.json` para permitir:
  - Google profile images: `https://lh3.googleusercontent.com`
  - Google favicon: `https://www.google.com`
  - Supabase storage: `https://*.supabase.co`

### 2. Sesiones Largas No Se Guardan en iOS PWA ✅
**Estado**: SOLUCIONADO CON MEJORAS ROBUSTAS

## Cambios Realizados

### A. invokeEndSession.ts (Retry Automático)
**Problema Original**: Timeout de 55s en iOS PWA
**Soluciones**:
- ✅ Timeout aumentado a 65s
- ✅ Retry automático: 3 intentos con delays (1s, 3s, 5s)
- ✅ Detección inteligente de errores retryables
- ✅ Logging detallado por intento
- ✅ Validación de payload antes de enviar

### B. useAppState.ts - endSession() (Encolado Garantizado)
**Problema Original**: Sin retry cuando fallaba la cola
**Soluciones**:
- ✅ Retry múltiple para encolar (3 intentos con 500ms delays)
- ✅ Garantía: Si falla directo, SIEMPRE se encola
- ✅ Mejor manejo de localStorage failures
- ✅ Usuarios notificados del estado

### C. supabase/functions/end-session (Optimización de RPC)
**Problema Original**: RPC lenta en iOS PWA
**Soluciones**:
- ✅ Timeout en RPC call (30s máximo)
- ✅ Mejor error handling
- ✅ CORS headers correctos
- ✅ Logging mejorado

## Plan de Testing

### Test 1: Validar Retry Automático
1. Abre la app en iOS PWA
2. Desactiva Internet (Airplane Mode)
3. Inicia sesión y comienza un ejercicio
4. Mantén la app en foreground (~30s)
5. Reactiva Internet
6. Finaliza la sesión normalmente
7. **Resultado Esperado**: Sesión se sincroniza automáticamente sin errores

### Test 2: Validar Encolado Garantizado
1. Abre la app en iOS PWA
2. Inicia una sesión corta (2-3 ejercicios)
3. Abre Settings y mira el panel "Sincronización"
4. Finaliza sesión mientras ves el panel
5. **Resultado Esperado**: 
   - Panel muestra "✓ Completado" o "⏱️ En cola"
   - No muestra error rojo

### Test 3: Long Session (90 minutos, 15+ ejercicios)
1. Abre la app en iOS PWA
2. Conectado a WiFi confiable
3. Inicia sesión larga
4. Realiza 15+ ejercicios variados (60-90 minutos)
5. Abre Settings periodicamente (cada ~20 min) para ver status
6. Finaliza sesión normalmente
7. **Resultado Esperado**:
   - Sesión se guarda correctamente
   - Panel muestra "✓ Completado"
   - Datos aparecen en History en minutos

### Test 4: Validar Diagnostics Panel
1. En Settings, sección "Sincronización":
   - ✅ Debe mostrar estado actual
   - ✅ Debe mostrar últimos errores (si los hay)
   - ✅ Botón "Resincronizar Ahora" funciona
   - ✅ Botón "Descargar Diagnóstico" exporta JSON

### Test 5: Network Issues Recovery
1. Abre la app en iOS PWA
2. Inicia sesión
3. Realiza 3-4 ejercicios
4. Desactiva WiFi, activa Airplane Mode (10 segundos)
5. Desactiva Airplane Mode, reactiva WiFi
6. Continúa entrenando
7. Finaliza sesión
8. **Resultado Esperado**:
   - Sesión se sincroniza sin problemas
   - Panel muestra "⏱️ Reintentando..." durante recovery

## Monitoring

### Revisar en Console/Logs
```
[endSession] Attempting direct invoke of end-session function
[invokeEndSession] Attempt 1/4 - invoking end-session (XXX.XXKB)
[invokeEndSession] ✓ Successfully ended session...
```

### Revisar en Settings → Sincronización
- Badge en header muestra estado (✓/⏱️/⚠️)
- Panel detallado muestra:
  - Estado: "Completado" o "Pendiente" o "Error"
  - Últimos errores (si hay)
  - Intentos restantes

## Rollback (Si es Necesario)

Si algo falla durante testing:
```bash
git checkout src/services/sessionCompletion/invokeEndSession.ts
git checkout src/app/useAppState.ts
git checkout supabase/functions/end-session/index.ts
npm run build
```

## Información Técnica

### Errores Retryables Detectados
- "Failed to send" - Problema de conexión temporal
- "timeout" - Servidor lento
- "NetworkError" - Error de red
- "503" - Servidor no disponible
- "429" - Rate limiting

### Tiempos de Retry
- 1er intento fallido: espera 1s
- 2do intento fallido: espera 3s
- 3er intento fallido: espera 5s
- 4to intento: error final, se encola

### Tamaños de Payload Típicos
- Sesión pequeña (3-5 ejercicios): ~10-30 KB
- Sesión mediana (5-10 ejercicios): ~30-100 KB
- Sesión larga (10+ ejercicios): ~100-300 KB

## Notas para el Equipo

1. **iOS PWA vs Desktop**: iOS tiene timeouts más cortos, conexión intermitente
2. **localStorage en iOS PWA**: ~5-10 MB disponibles, puede llenarse
3. **Background Mode**: iOS puede pausar la app después de ~30s
4. **WiFi vs Cellular**: La app debe funcionar en ambas condiciones

## Próximos Pasos (Si Sigue Fallando)

Si después de estos cambios sigue fallando en iOS PWA:
1. Revisa los logs remotos en `app_logs` de Supabase
2. Implementar chunking de payload (dividir en partes más pequeñas)
3. Implementar Web Workers para no bloquear main thread
4. Revisar CORS headers en Edge Function para iOS Safari
