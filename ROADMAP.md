# Kinetic App - Roadmap

Roadmap del desarrollo de la aplicación de fitness "Kinetic". Cada fase construye valor incrementalmente.

---

## 🟢 Fase 1: Estabilización (COMPLETADA)
**Status:** ✅ Done  
**Objetivo:** Asegurar login/logout seguro con Google OAuth y base de autenticación sólida.

**Alcance:**
- Google OAuth integration
- Session management
- Profile creation on first login
- Basic navigation flow

**Resultado esperado:** Usuarios pueden autenticarse de forma segura y la app maneja sesiones correctamente.

---

## 🟢 Fase 2: Dashboard Redesignado con Contexto y Objetivos (COMPLETADA)
**Status:** ✅ Done  
**Objetivo:** Rediseñar el dashboard para mostrar métricas con contexto, eliminar redundancia y agregar objetivos personalizables.

**Alcance:**
- Eliminar 5 cards redundantes
- Crear single herocard con 3 métricas esenciales (volumen, ejercicios, duración)
- Agregar trend indicators (vs semana anterior)
- Crear tabla `user_goals` y `weekly_statistics` en Supabase
- Implementar UI de customización de objetivos semanales en Settings
- Repository functions para cálculos de estadísticas y comparativas

**Resultado esperado:** Dashboard muestra contexto claro (objetivo vs logro, tendencias vs semana anterior). Usuarios pueden personalizar metas semanales.

---

## 🟢 Fase 3: Sync y Offline Robusto (COMPLETADA)
**Status:** ✅ Done  
**Objetivo:** Robustecer sincronización con Supabase y mejorar manejo offline. La app debe tolerar mala conexión sin perder datos.

**Alcance:**
- Cola de pendientes con reintentos exponenciales
- Conflicto resolution para sincronización
- Manejo de estado offline más robusto
- Session persistence en caso de fallo de conexión
- Validación de integridad de datos antes de sincronizar
- Indicadores visuales claros de state de sync (syncing, synced, pending, error)
- Backfill de datos históricos a `weekly_statistics`

**Resultado esperado:** ✅ La app tolera mala conexión sin perder sesiones ni dejar estados inconsistentes. Sessions reales son resistentes al offline.

**Implementado:**
- ✅ SyncQueue system con persistencia en localStorage
- ✅ Retry logic con exponential backoff (500ms → 2min cap, ±10% jitter)
- ✅ Error classification (transient vs permanent)
- ✅ SyncStateManager para state tracking (idle, syncing, pending, error, degraded)
- ✅ Comprehensive test suite (76 tests) validando persistencia, reintentos y escenarios offline
- ✅ Handler-based processing architecture
- ✅ Priority-based queue (high priority sessions first)

---

## 🟢 Fase 4: Biblioteca de Ejercicios Avanzada (COMPLETADA)
**Status:** ✅ Done  
**Objetivo:** Completar y robustecer el módulo de ejercicios. Catálogo escalable y mantenible.

**Alcance:**
- Borrado de ejercicios desde UI (soft delete)
- Sistema de favoritos con persistencia
- Filtros avanzados (por músculo, equipo, dificultad, etc.)
- Búsqueda full-text en ejercicios
- Validaciones mejoradas (nombres, descripciones, formatos)
- Distinción clara entre catálogo global y ejercicios personalizados
- Permisos de ownership (usuario solo puede editar sus ejercicios)
- Importar ejercicios del catálogo global

**Resultado esperado:** Biblioteca usable, escalable y sin ambigüedad de ownership. Usuarios pueden descubrir, crear, guardar favoritos y organizar ejercicios.

**Implementado:**
- ✅ Soft delete desde UI con modal de confirmación
- ✅ Sistema de favoritos (`exercise_favorites` en Supabase) con toggle optimista
- ✅ Panel de filtros expandible: equipamiento / fuente (global vs custom) / solo favoritos
- ✅ Búsqueda con limpieza de resultados y mensajes contextuales
- ✅ Validaciones: mínimo 3 chars, máximo 60, detección de duplicados en DB
- ✅ Ownership claro: badge Custom + acciones de edición/borrado solo en ejercicios propios

---

## 🔵 Fase 5: Perfil y Preferencias Avanzadas (PENDIENTE)
**Status:** ⏳ Pending  
**Objetivo:** Pulir y completar experiencia de perfil de usuario. Mejor UX y personalización.

**Alcance:**
- Validación amigable de username duplicado (live feedback)
- Avatar editable (upload + crop)
- Mejor feedback visual para guardado/error
- Historial de cambios de perfil
- Preferencias adicionales (idioma, tema, unidades)
- Integración de perfil en más pantallas (header, inicio de sesión)
- Bio mejorada con validación
- Fitness level / goals personales

**Resultado esperado:** Perfil más pulido, personalizado y con UX amigable. Usuarios sienten la app como propia.

---

## 🔵 Fase 6: Analytics & Estadísticas Avanzadas (PENDIENTE)
**Status:** ⏳ Pending  
**Objetivo:** Agregar insights profundos sobre progreso. Visualizaciones que motiven y guíen al usuario.

**Alcance:**
- Gráficos de progreso temporal (volumen, ejercicios, duración por mes/trimestre)
- Análisis de ejercicios favoritos y menos usados
- Comparativa mes a mes / trimestre a trimestre
- Identificación de músculo groups más trabajados
- Proyecciones de progreso (si continúo así, alcanzaré la meta en X semanas)
- Heatmap de actividad semanal
- Exportar reportes (PDF/CSV)
- Best session histórico

**Resultado esperado:** Usuarios entienden su progreso a nivel profundo. Datos motivan y guían decisiones.

---

## 🔵 Fase 7: Social & Compartir Entrenamientos (PENDIENTE)
**Status:** ⏳ Pending  
**Objetivo:** Agregar capacidad de compartir y colaborar. Comunidad y motivación.

**Alcance:**
- Compartir rutinas con amigos (link o código de invitación)
- Copiar rutinas de otros usuarios
- Leaderboards (amigos, comunidad)
- Desafíos semanales (challenge accepted/completed)
- Comments y feedback en sesiones compartidas
- Perfil público opcional con estadísticas visibles
- "Siguiendo" a otros usuarios para ver su progreso
- Activity feed colaborativo

**Resultado esperado:** Usuarios pueden compartir entrenamientos, competir con amigos y mantenerse motivados.

---

## 🔵 Fase 8: Mobile App (PENDIENTE)
**Status:** ⏳ Pending  
**Objetivo:** Versión nativa para iOS/Android. Mejor UX móvil y offline.

**Alcance:**
- React Native o Flutter como framework
- Sincronización con backend Supabase compartido
- Push notifications para recordatorios de entrenamientos
- Integración con sensores (acelerómetro, etc.)
- Instalable desde App Store / Google Play
- Offline-first architecture para móvil
- Biometrics (face ID / fingerprint) para login

**Resultado esperado:** App nativa disponible en iOS y Android. Mejor experiencia móvil y datos sincronizados continuamente.

---

## 🟡 Fase 9: Calidad de Producción (PENDIENTE)
**Status:** ⏳ Pending  
**Objetivo:** Madurez, robustez y mantenibilidad. Preparar para escalar.

**Alcance:**
- Test suite completo (unitarios + integración + E2E)
- Coverage > 80%
- Observabilidad (logging, tracing, error reporting)
- Performance profiling y optimizaciones
- Security audit
- UX endurecido ante errores edge-cases
- Documentación técnica y de usuario
- CI/CD pipeline mejorado
- Monitoring de uptime y performance
- Backup strategy

**Resultado esperado:** Producto maduro, mantenible, seguro. Preparado para producción enterprise y escala.

---

## 📊 Timeline Estimado

```
Q1 2026:
  ├─ Fase 1 ✅
  └─ Fase 2 ✅

Q2 2026:
  ├─ Fase 3
  ├─ Fase 4
  └─ Fase 5

Q3 2026:
  ├─ Fase 6
  └─ Fase 7

Q4 2026:
  ├─ Fase 8 (inicio)
  └─ Fase 9 (inicio)

Q1 2027:
  └─ Fase 8 + Fase 9 (conclusión)
```

---

## 🎯 Próximo Paso

**Fase 5: Perfil y Preferencias Avanzadas** es la siguiente prioridad.

**Por qué:**
- El perfil de usuario es la identidad central de la app. Mejor UX y personalización aumentan retención.
- Validación de username duplicado y avatar editable son puntos de fricción evidentes.
- Preferencias (idioma, unidades, tema) habilitan personalización real.

**Setup recomendado:**
1. Validación live de username duplicado (feedback en tiempo real)
2. Avatar editable (upload + crop)
3. Mejor feedback visual para guardado/error en Settings
4. Preferencias adicionales (tema oscuro/claro, unidades kg/lb)
5. Integración del perfil en más pantallas (header con avatar)

---

## 📝 Notas

- Cada fase entrega valor independiente.
- No todos los features son bloqueadores desde día 1.
- Prioridad puede ajustarse según feedback de usuarios.
- Fase 9 (Calidad) se puede iniciar en paralelo a partir de Fase 5.
