# Historia del Proyecto Kinetic

Este archivo consolida la documentacion historica que antes estaba repartida en multiples `.md`.
No reemplaza a `README.md` ni al dump tecnico de Supabase.

## Referencias actuales

- `README.md`: presentacion e instrucciones generales del proyecto. No fue modificado durante esta limpieza.
- `ROADMAP.md`: plan funcional y fases del producto.
- `supabase/remote_schema_2026-06-02.sql`: foto limpia oficial del schema remoto `public`, generada con Supabase CLI.

## 2026-04 - Rutina SportClub y grupos musculares

Se trabajo una rutina "SportClub Full Body" con una estructura de 5 dias:

- Core: 3 ejercicios.
- Upper A: pecho y espalda, 8 ejercicios.
- Lower: piernas, 7 ejercicios.
- Upper B: espalda y brazos, 9 ejercicios.
- Lower B: piernas, 6 ejercicios.

Durante esa etapa se crearon scripts manuales `.sql` para insertar ejercicios, rutina y dias. Esos scripts quedaron obsoletos cuando el estado real de Supabase paso a ser la fuente de verdad. Los `.sql` historicos fueron borrados despues de generar `supabase/remote_schema_2026-06-02.sql`.

Puntos utiles que quedaron de esa etapa:

- La tabla `muscle_groups` usa codigos de grupos musculares como `chest`, `back`, `quads`, `hamstrings`, `glutes`, `biceps`, `triceps`, `shoulders`, `abs`, entre otros segun el schema remoto.
- La rutina SportClub fue documentada como referencia de entrenamiento, pero ya no debe usarse como procedimiento de migracion.
- Cualquier carga futura debe apoyarse en el schema remoto vigente y no en scripts antiguos.

## 2026-05 - Sincronizacion robusta e iOS PWA

Se investigo un incidente donde sesiones de entrenamiento no se guardaban correctamente en iOS PWA, especialmente con sesiones largas, red intermitente o timeouts de Edge Function.

Causas identificadas:

- iOS PWA puede tener timeouts mas agresivos y comportamiento distinto a desktop.
- El cierre de sesion podia fallar antes de dejar un item recuperable en la cola local.
- El boton de resincronizacion podia desaparecer aunque hubiese errores o items pendientes.
- La Edge Function podia devolver errores genericos de red por CORS, timeouts o payloads grandes.

Cambios implementados:

- `src/services/sessionCompletion/invokeEndSession.ts`
  - Retry automatico.
  - Validacion de payload antes de invocar la Edge Function.
  - Logging de tamanio de payload.

- `src/app/useAppState.ts`
  - Encolado garantizado de `session_end` ante fallos.
  - Fallback con payload minimo si el payload completo no puede persistirse.
  - Limpieza de sesion local solo despues de guardar directo o encolar correctamente.

- `supabase/functions/end-session/index.ts`
  - Timeout controlado para la RPC `end_session_transaction`.
  - Logging del tamanio recibido.
  - Manejo de errores mas explicito.

- `supabase/functions/_shared/cors.ts`
  - CORS mas robusto para origen nulo y contexto standalone de iOS PWA.
  - `Access-Control-Max-Age` agregado para mejorar comportamiento de preflight.

- Componentes de sincronizacion:
  - `SyncStatusManager`
  - `useSyncStatus`
  - `SyncStatusIndicator`
  - `SyncDiagnosticsPanel`

Resultado esperado:

- Sesiones largas o con conexion intermitente no se pierden.
- El usuario puede ver pendientes, errores y reintentar sincronizacion manual.
- El sistema reintenta en background cuando la red vuelve.

## 2026-05 - Correcciones visuales iOS PWA

Se corrigieron problemas visuales del panel de sincronizacion en pantallas moviles:

- Textos pegados cuando habia varios estados simultaneos.
- Mensajes de error sin separacion clara.
- Botones que no envolvian correctamente en iPhone.
- Detalles por tipo poco legibles.
- Badge de sincronizacion del header con bajo contraste o mal ajuste.

Los cambios fueron principalmente en:

- `src/components/SyncDiagnosticsPanel.tsx`
- `src/components/SyncStatusIndicator.tsx`

El objetivo fue mantener tap targets y layout estable en iOS PWA sin cambiar la logica de sincronizacion.

## 2026-06 - Limpieza de Supabase y archivos historicos

Se confirmo que las migraciones locales `.sql` no reflejaban la version final del proyecto remoto en Supabase.

Acciones realizadas:

- Se genero un dump limpio con Supabase CLI:
  - `supabase/remote_schema_2026-06-02.sql`
- Se verifico que el dump contiene:
  - 16 tablas.
  - 5 funciones.
  - 34 policies.
  - RLS habilitado.
  - Indices, funciones, policies y triggers.
- Se borro el contenido viejo de `supabase/migrations`.
- Se borraron scripts `.sql` historicos del raiz.
- Se limpiaron temporales:
  - `dist/`
  - `tmp/`
  - `supabase/.temp/`
  - `tmp_settings.txt`
  - `report_fetchUserGoals.txt`
- Se actualizo `.gitignore` para incluir:
  - `tmp/`
  - `supabase/.temp/`

Notas de seguridad observadas en el snapshot remoto:

- Todas las tablas publicas detectadas tienen RLS habilitado.
- Algunas policies usan rol `public`; conviene revisarlas si el modelo de acceso cambia.
- Existen funciones `security definer` en schema `public`, especialmente `end_session_transaction`, `handle_new_user` e `import_routine`. Conviene evaluar moverlas a un schema no expuesto si se hace una pasada de hardening.

## 2026-06 / 2026-07 - Mejoras de ejercicios, PWA y pruebas

Se incorporaron mejoras funcionales y de calidad sobre el flujo de rutinas, ejercicios y experiencia PWA.

Cambios principales:

- Perfil:
  - Se agrego altura y peso del usuario.
  - La imagen de perfil se muestra tanto en header como dentro de Perfil, con fallback si falla la carga.
  - El logout con Google fuerza cierre global y el login vuelve a pedir seleccion de cuenta.

- Ejercicios y rutinas:
  - Se agrego soporte para `load_type` (`external` / `bodyweight`) en ejercicios dentro de rutinas.
  - Se agrego soporte para `target_type` (`fixed_reps` / `failure`) en series.
  - Las series al fallo guardan repeticiones planificadas como `null`, pero el registro de sesion permite capturar las repeticiones reales.
  - Durante una sesion activa, los sets ya realizados pueden reabrirse para editar valores o borrar el registro si se cargaron por error.
  - Para peso corporal se guarda snapshot del peso del perfil en la sesion, evitando recalcular sesiones viejas.
  - El editor ya no activa peso corporal por defecto al cargar un ejercicio nuevo; solo conserva `bodyweight` si el ejercicio ya estaba guardado asi.
  - Se corrigio que valores `null` aparecieran como texto dentro de inputs al editar series.
  - Se corrigio la creacion de nuevas rutinas para que no herede automaticamente dias y ejercicios de la ultima rutina seleccionada.
  - El footer `RUTINAS` abre la lista completa de rutinas, igual que `VER TODAS`; el detalle queda reservado para una rutina elegida o continuada desde el dashboard.

- Biblioteca de ejercicios:
  - Se agrego busqueda global de ejercicios fuera de un grupo muscular.
  - Los resultados globales informan el grupo muscular correspondiente.
  - El acceso `MOTOR` desde el footer queda como visor/biblioteca consultiva.
  - Al abrir desde una rutina, el selector mantiene el flujo de carga de series.
  - El listado en modo visor muestra una tarjeta de detalle con imagen, grupo, equipo y descripcion, con scroll propio.

- Selector muscular e imagenes:
  - Se generaron imagenes representativas por grupo muscular en formato WebP.
  - El selector frontal/posterior precarga imagenes para reducir parpadeos.
  - El boton volver respeta mejor el contexto de navegacion y la vista activa.
  - Se corrigio el regreso desde la vista posterior para no volver siempre a frente.

- PWA y rendimiento movil:
  - Se suavizaron transiciones para evitar pantallazos negros en iOS/Android PWA.
  - Se reviso rendimiento en Android de gama media, evitando degradar imagenes WebP que ya se veian correctamente.
  - Se regeneraron iconos PWA, favicon y Apple Touch desde la imagen base corregida.
  - Se ajusto la grilla del editor de series en PWA/mobile para que los botones `REPS` y `FALLO` no se superpongan en pantallas angostas.
  - Se corrigio el avatar del header para mantener formato circular estable y evitar deformacion por compresion del layout en pantallas angostas.

- Supabase y datos:
  - Se actualizo el schema remoto para soportar altura, peso, tipo de carga, series al fallo y snapshot de peso corporal.
  - Se actualizaron las funciones remotas `end_session_transaction` e `import_routine` para preservar los nuevos campos.
  - Se limpiaron datos de prueba generados por E2E/load tests y se prepararon scripts conservadores de limpieza.
  - Se agregaron ejercicios faltantes a la biblioteca global, entre ellos variantes de triceps, face pull, posteriores en maquina y curl inclinado.
  - Se ampliaron los ejercicios globales de Core/Oblicuos tomando como referencia Muscle & Strength y MuscleWiki: sit-ups, crunches con variantes, elevaciones de piernas/rodillas, dragon flag, vacuum abdominal, variantes Pallof, mountain climber rotacional y toques alternos de talon, entre otros. `Toques Alternos de Talon (Alternating Heel Touch)` quedo disponible tanto en Oblicuos como en Core.

- Pruebas:
  - Se agrego estructura inicial de pruebas E2E con Playwright.
  - Se agregaron smoke/load tests con k6.
  - Se hicieron pruebas multiusuario con rutinas grandes, incluyendo finalizacion de sesiones y revision de historial.
  - El historial permite expandir sesiones completadas para ver dias, ejercicios, sets y valores registrados.
  - `npm run lint` ejecuta `tsc --noEmit`; `npm run build` puede requerir permisos elevados en Windows/OneDrive por restricciones de esbuild.

## 2026-07 - Sesiones CORE, orden de ejercicios y actualizacion tecnica

Se ajusto el inicio y desarrollo de las sesiones para que ningun dia se seleccione o abra automaticamente.

- Sesiones:
  - Una sesion solo se inicia desde un dia de semana; el dia CORE no inicia sesiones por si mismo.
  - CORE queda habilitado como parte opcional de la sesion una vez elegido el dia principal.
  - El usuario puede comenzar por los ejercicios de CORE, alternar entre acordeones y volver al dia principal.
  - CORE solo se contabiliza si se completa al menos uno de sus ejercicios. Si se omite por completo o solo se saltean sus ejercicios, no forma parte de la sesion completada.

- Rutinas y ejercicios:
  - Se agrego ordenamiento vertical mediante drag and drop con un asa lateral.
  - El orden se persiste en Supabase y se verifica despues de guardarlo.
  - Se corrigio la interpretacion de la posicion de destino para que el orden visual coincida con el orden persistido.
  - Se corrigio el guardado de series al editar un ejercicio despues de reordenarlo, evitando inserciones duplicadas.

- Supabase:
  - Se vinculo el proyecto local con el proyecto remoto Kinetic.
  - Se incorporaron las migraciones locales recuperadas y la funcion RPC para reordenar ejercicios.
  - Se actualizaron los tipos generados de la base de datos.

- Entorno y dependencias:
  - Node y la declaracion de Volta quedaron alineados en la version `24.18.0`.
  - Se actualizaron las dependencias compatibles dentro de sus ramas actuales, incluyendo React, Supabase JS, Tailwind, Playwright y Vitest.
  - Se retiro Artillery porque sus dependencias transitivas no tenian una correccion de seguridad compatible; k6 permanece como herramienta de pruebas de carga.
  - `npm audit` quedo sin vulnerabilidades conocidas.

- Calidad:
  - Vitest y Playwright quedaron separados para evitar que las pruebas E2E se ejecuten como unitarias.
  - La linea base quedo en 84 pruebas unitarias aprobadas, TypeScript sin errores, build de produccion correcto y 6 pruebas E2E detectadas por Playwright.

## Documentos consolidados

Este archivo reemplaza la informacion historica de:

- `HOTFIX_iOS_SESSION_QUEUEING.md`
- `HOTFIX_SUMMARY.md`
- `iOS_PWA_TESTING_GUIDE.md`
- `MEMORIA_EDGE_FUNCTION_iOS_PWA_2026-05-06.md`
- `MUSCLE_GROUPS_REFERENCE.md`
- `ROUTINE_SETUP_GUIDE.md`
- `ROUTINE_SPORTCLUB_COMPLETE_GUIDE.md`
- `ROUTINE_SPORTCLUB_README.md`
- `ROUTINE_SPORTCLUB_STATUS.md`
- `ROUTINE_SPORTCLUB_SUMMARY.md`
- `SOLUCION_iOS_PWA_RESUMEN.md`
- `SYNC_FIXES_SUMMARY.md`
- `TECHNICAL_CHANGES_iOS_PWA.md`
- `UI_FIXES_iOS_PWA.md`
- `UI_IMPROVEMENTS_SUMMARY.md`
- `src/components/SYNC_INTEGRATION_GUIDE.md`
- `supabase/REMOTE_SCHEMA_SNAPSHOT_2026-06-02.md`
