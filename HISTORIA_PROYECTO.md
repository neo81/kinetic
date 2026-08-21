# Historia del Proyecto Kinetic

Este archivo consolida la documentacion historica que antes estaba repartida en multiples `.md`.
No reemplaza a `README.md` ni al dump tecnico de Supabase.

## Referencias actuales

- `README.md`: presentacion, requisitos e instrucciones generales del proyecto.
- `ROADMAP.md`: plan funcional y fases del producto.
- `supabase/migrations/`: fuente versionada de los cambios actuales de base de datos.
- `supabase/remote_schema_2026-06-02.sql`: snapshot historico del schema remoto, previo a las migraciones posteriores.

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
  - Timeout controlado para la RPC transaccional de cierre de sesion.
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

Notas de seguridad observadas en el snapshot remoto en ese momento:

- Todas las tablas publicas detectadas tienen RLS habilitado.
- Algunas policies usaban rol `public`.
- Existian funciones `security definer` ejecutables desde roles expuestos.
- Estas observaciones fueron corregidas en la pasada de hardening de julio de 2026 documentada mas abajo.

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
  - El historial de novedades y su estado de lectura pasaron de `localStorage` a Supabase.
  - Se agregaron las tablas `app_releases`, `app_release_notes` y `user_release_reads`, con permisos minimos y RLS por usuario.
  - Configuracion ofrece un acceso permanente al historial y el aviso automatico muestra todas las versiones pendientes.

- Entorno y dependencias:
  - Node y la declaracion de Volta quedaron alineados en la version `24.18.0`.
  - Se actualizaron las dependencias compatibles dentro de sus ramas actuales, incluyendo React, Supabase JS, Tailwind, Playwright y Vitest.
  - Se retiro Artillery porque sus dependencias transitivas no tenian una correccion de seguridad compatible; k6 permanece como herramienta de pruebas de carga.
  - `npm audit` quedo sin vulnerabilidades conocidas.

- Calidad:
  - Vitest y Playwright quedaron separados para evitar que las pruebas E2E se ejecuten como unitarias.
  - La linea base quedo en 84 pruebas unitarias aprobadas, TypeScript sin errores, build de produccion correcto y 6 pruebas E2E detectadas por Playwright.

## 2026-07 - Persistencia de novedades y hardening de Supabase

Se completo una revision controlada de seguridad, sincronizacion y rendimiento sobre el proyecto remoto.

- Novedades:
  - El historial de versiones, las notas y el estado de lectura se persisten en `app_releases`, `app_release_notes` y `user_release_reads`.
  - El dialogo conserva el aviso de versiones pendientes y ofrece acceso permanente al historial.
  - Este bloque de hardening no se publico como novedad visible porque no modifica funcionalidad para el usuario.

- Sincronizacion y cierre de sesiones:
  - La Edge Function ahora inspecciona el campo `error` devuelto por la RPC; un fallo de PostgREST ya no puede interpretarse como guardado exitoso.
  - `syncQueue` conserva el cierre pendiente cuando la transaccion remota falla.
  - La transaccion final se ejecuta mediante `end_session_transaction_service`, accesible solo para `service_role`.
  - La Edge Function valida primero el JWT, pasa el usuario validado y la RPC comprueba que sea propietario de la sesion.
  - Se retiro la RPC heredada `end_session_transaction`, que era `security definer` y estaba expuesta a `authenticated`.

- RLS y funciones:
  - Se elimino la policy `exercises_read_public` con `using (true)`, que podia ampliar la lectura de ejercicios personalizados.
  - La lectura de ejercicios quedo separada entre catalogo publico para `anon` y catalogo publico mas ejercicios propios para `authenticated`.
  - Las policies privadas quedaron limitadas explicitamente a `authenticated`.
  - Las llamadas a `auth.uid()` dentro de RLS usan `(select auth.uid())` para evitar reevaluarlas por cada fila.
  - Las funciones de triggers dejaron de ser ejecutables por `anon` y `authenticated`.
  - Las funciones revisadas usan un `search_path` fijo y vacio.
  - La RPC heredada `import_routine` quedo disponible solo para `service_role`; la importacion actual usa operaciones normales protegidas por RLS.

- Indices:
  - Se agregaron indices para las claves foraneas señaladas por el asesor de Supabase.
  - Se eliminaron los indices independientes duplicados de `muscle_groups.code` y `profiles.username`, conservando los asociados a restricciones `unique`.
  - Los avisos restantes de tablas sin clave primaria pertenecen al schema historico `backup_clean_20260630`.

- Rutinas:
  - El editor espera la confirmacion del guardado antes de navegar y bloquea dobles envios mientras muestra `Guardando`.
  - El listado de rutinas permite nombres multilínea y evita recortes de la tipografia italica.

- Verificacion:
  - Se probaron lecturas y escrituras RLS con identidades controladas y transacciones revertidas.
  - Se verificaron los permisos de las funciones y el rechazo de solicitudes no autenticadas.
  - La Edge Function `end-session` quedo desplegada en su version 4.
  - La linea base permanece en 84 pruebas aprobadas, TypeScript sin errores y build de produccion correcto.
  - El unico aviso de seguridad restante es la proteccion contra contraseñas filtradas, disponible solo en planes Supabase Pro o superiores.

## 2026-07 - Catalogo, busqueda y lectura de series durante la sesion

Se mejoro la biblioteca de ejercicios y la lectura del progreso sin alterar la configuracion de las rutinas ni la finalizacion de las series.

- Catalogo de ejercicios:
  - Se agregaron variantes de remo con pecho apoyado con mancuernas, barra T y maquina.
  - Se agregaron variantes de curl de biceps en polea con barra recta, cuerda y asa unilateral.
  - Se agregaron variantes de pullover en polea alta, con mancuerna y en maquina.
  - Se eliminaron `Press E2E Test` y `Remo E2E Multiusuario` despues de comprobar que no estaban referenciados por rutinas, sesiones ni favoritos.

- Motor de ejercicios:
  - Los resultados de busqueda se reorganizaron para PWA y pantallas angostas, evitando recortes en nombres y desalineaciones entre grupo y equipamiento.
  - Al elegir un resultado global se conserva su identificador y se abre automaticamente la ficha del ejercicio exacto dentro de su grupo muscular.

- Sesion activa:
  - Las series registradas muestran el valor realizado y el planificado con una jerarquia visual diferenciada.
  - Las series registradas y pendientes comparten una estructura vertical unificada, legible tanto con valores numericos como con objetivos al fallo y peso corporal.
  - Al iniciar una sesion, la vista se reposiciona en el encabezado del dia activo despues de que se estabiliza el contenido del acordeon, aunque previamente se estuviera revisando una serie intermedia o final.
  - La mejora es exclusivamente visual: no modifica la rutina guardada, los datos capturados ni las reglas de finalizacion de ejercicios y sesiones.

- Idioma y formatos:
  - Se establecio `es-419` como configuracion regional unica para la interfaz en español latinoamericano.
  - Se centralizaron los formatos de fechas, horas y numeros, eliminando las referencias directas a `es-AR` y `es-ES`.
  - Se normalizaron textos visibles a español neutral, incluyendo el uso de `serie` en lugar de `set`, tildes y mensajes sin voseo.
  - El documento HTML, el manifiesto PWA, las novedades locales y las novedades persistidas en Supabase quedaron alineados con la misma configuracion regional.
  - Se incorporo un contexto global de idioma con diccionarios tipados para `es-419` y `en`.
  - El selector de Configuracion cambia inmediatamente la parte traducida, actualiza el idioma del documento y conserva la preferencia en `localStorage`.
  - La preferencia se sincroniza con `user_preferences.language`; los valores heredados `es` se normalizaron a `es-419` y los nuevos usuarios reciben ese valor por defecto.
  - Las RLS existentes mantienen cada preferencia limitada a su propietario.
  - La primera cobertura incluye navegacion compartida, Configuracion, perfil, avatar, contenedor de novedades, avisos y diagnosticos de sincronizacion, junto con fechas, horas y numeros dependientes del idioma activo.
  - La validacion de nombre de usuario expone codigos estables y la interfaz traduce el mensaje sin cambiar las reglas ni los datos guardados.
  - El flujo de gestion de rutinas ya localiza el listado, creacion, edicion, dias, ordenamiento, confirmaciones y configuracion de series; los nombres propios guardados por el usuario permanecen intactos.
  - La sesion activa ya localiza el detalle, seleccion de dias, temporizadores, agrupaciones, series planificadas y registradas, omisiones, confirmaciones y finalizacion sin alterar la logica de CORE ni los datos de entrenamiento.
  - Los avisos globales de inicio, cancelacion, cola, error y guardado de una sesion ahora se generan con el idioma activo; Historial tambien localiza titulo, estados, metricas y detalle de series.
  - Motor ya localiza buscador, mapa muscular, resultados, filtros, favoritos, detalle y administracion de ejercicios personalizados; los valores internos de filtros y Supabase permanecen estables.
  - El catalogo de Supabase ahora admite `name_en` y `description_en` opcionales sin reemplazar el contenido canonico en espanol. Motor presenta el contenido segun el idioma activo, busca por ambos nombres y usa fallback al original para traducciones pendientes y ejercicios personalizados.
  - Los 142 ejercicios globales activos cuentan con nombre ingles; Motor, el editor de rutinas, la sesion activa y el Historial usan la presentacion localizada sin reemplazar el nombre canonico.
  - Las 54 entradas de abdomen, core y oblicuos cuentan con descripciones tecnicas revisadas en espanol e ingles: incluyen posicion inicial, ejecucion, control y errores basicos a evitar.
  - Se aplico el mismo criterio tecnico y bilingue a 29 ejercicios de pectorales, hombros y triceps, reemplazando tambien las descripciones genericas que solo indicaban el musculo trabajado.
  - Dorsales, biceps, trapecio y antebrazos suman otras 29 descripciones tecnicas bilingues, incluyendo las variantes de polea, remo con pecho apoyado y pullover que ya existian pero requerian uniformar su nivel de detalle.
  - El bloque final incorpora 30 registros de cuadriceps, isquiotibiales, gluteos, abductores, aductores, pantorrillas y lumbares. Con esta revision, los 142 ejercicios globales activos disponen de nombre y descripcion tecnica completos en espanol e ingles.
  - Historial deriva `Dia/Day N` desde `day_type` y `day_number`, por lo que las sesiones ya registradas cambian de idioma visualmente sin reescribir datos historicos.
  - Las dos versiones publicadas y sus ocho novedades disponen de titulo y descripcion en ingles, tanto en Supabase como en el respaldo local. El dialogo selecciona el idioma activo y conserva fallback al contenido canonico en espanol para publicaciones futuras incompletas.
  - Login, registro y Dashboard responden ahora al idioma activo. Los avisos de autenticacion, conexion, guardado local y operaciones sobre rutinas usan mensajes bilingues controlados en lugar de textos incrustados o errores tecnicos del servidor.
  - El catalogo local de respaldo incorpora nombres ingleses para sus 28 ejercicios y localiza grupos musculares y equipamiento. El cambio es solo de presentacion: IDs y nombres canonicos en espanol permanecen estables para no afectar rutinas ni sincronizacion.
  - La auditoria final localiza la pastilla de entrenamiento activo, estados vacios del Historial, tiempos de error y todo el flujo de importacion. Las advertencias de importacion usan codigos bilingues y conservan literalmente los nombres personalizados de rutinas, dias y ejercicios.
  - El selector de idioma cambia toda la interfaz en un unico paso visual. La sincronizacion con Supabase ya no muestra una fase intermedia ni revierte la preferencia local si la conexion remota falla; cambiar las traducciones tampoco reinicia la suscripcion de autenticacion ni vuelve a cargar temporalmente la preferencia remota anterior.
  - La confirmacion de importacion de rutinas ahora se presenta como un dialogo compacto y centrado, siempre por encima de la navegacion inferior, con el nombre importado y una accion visible para continuar.
  - La edicion de dias conserva el ordenamiento vertical mediante el asa de arrastre y elimina las flechas redundantes. Los nombres de ejercicios pueden ocupar varias lineas tanto en la lista del dia como en el editor, evitando confundir variantes con nombres similares.
  - Las sesiones activas muestran su tiempo real transcurrido en formato `HH:MM:SS` mediante una pastilla compacta y persistente, tanto dentro de la rutina como al navegar por otras secciones. El cronometro manual permanece independiente. Iniciar y finalizar usan el color primario, mientras que cancelar adopta el color secundario con menor jerarquia visual.
  - El reloj de descanso incorpora una rueda tactil independiente para minutos y segundos y hasta ocho tiempos personalizados sincronizados en `user_preferences`, presentados en una grilla de cuatro columnas y dos filas. No se crean presets por defecto y el conteo se basa en la hora real de finalizacion para recuperarse correctamente al volver a la PWA.
  - Ajustar manualmente la rueda del descanso hasta `00:00` o cancelar ya no activa la alarma; el aviso sonoro y visual queda reservado para una cuenta iniciada que realmente finaliza. Durante la cuenta se ocultan la rueda y los controles de ajuste para evitar cambios accidentales.
  - Pausar y reanudar conserva la fraccion exacta del segundo en curso, evitando que la cuenta agregue hasta un segundo o parezca demorarse al continuar.
  - El sonido de fin de descanso prepara y conserva el contexto de audio desde la pulsacion de Iniciar o Reanudar para cumplir las restricciones de reproduccion de Safari/iOS. El destello final aumenta su intensidad y duracion para resultar visible durante el entrenamiento.
  - La alerta sonora usa un patron de alarma alternado, mas intenso y prolongado que los tres tonos breves originales, con entrada y salida suavizadas para evitar golpes abruptos de volumen.
  - La navegacion inferior adopta una superficie compacta Liquid Glass comun a navegador y PWA, separada del gesto inferior del sistema mediante el area segura del dispositivo. Reune cinco accesos mediante iconos de inicio, rutinas, busqueda, historial y el avatar del perfil, todos con etiquetas accesibles. En reposo la lente conserva su forma ovalada dentro del contenedor y el toque directo mantiene solo el desplazamiento horizontal. El aumento queda reservado al arrastre manual, que termina con un asentamiento progresivo. La superficie aproxima la refraccion mediante transparencia, desenfoque moderado, saturacion y reflejos opticos.
  - El mismo lenguaje de vidrio se aplica de forma limitada a las pastillas flotantes de duracion de sesion, descanso y cronometro, al indicador que permite volver al entrenamiento mientras se navega por otra pantalla, a ciertos botones contextuales aislados y a los buscadores del Motor. La busqueda muscular y la biblioteca de ejercicios comparten altura, tipografia, iconografia, limpieza y foco, con una refraccion mas tenue para conservar la lectura. Los menus integrados en encabezados, como las acciones de rutina, permanecen neutros para no competir con la accion principal. Tarjetas, formularios, contenido y acciones principales conservan superficies solidas para no perder contraste.
  - La identidad tipografica combina Barlow Condensed en titulos, botones y metricas con Inter en textos y formularios. La fuente de titulos se eligio mediante una comparacion previa dentro del lenguaje visual de Kinetic. Los pesos normales e italicos utilizados se distribuyen como archivos WOFF2 locales para mantener la misma apariencia al iniciar la PWA con o sin conexion. `Target Engine` se mantiene en una sola linea para conservar su lectura como nombre propio.
  - Perfil se reorganiza como una portada centrada en avatar, identidad, nivel y biografia, con un unico acceso de edicion mediante el lapiz; altura y peso permanecen dentro de esa edicion, donde se cargan. Entrenamiento presenta directamente la edicion y el resumen de objetivos junto con la seleccion de unidades, sin subtitulos redundantes; Preferencias concentra tema, idioma y novedades con el mismo criterio; Datos y cuenta aisla correo, diagnostico de sincronizacion y cierre de sesion. Se eliminan las metricas de actividad fijas en cero y los encabezados duplicados. Las salidas que descartan una edicion conservan la etiqueta `Cancelar`, alineada a la izquierda para coincidir con el sentido de regreso.
  - Los encabezados comunes dejan de duplicar el acceso al perfil. Se eliminan los regresos redundantes hacia Inicio y Rutinas, el regreso a grupos musculares se integra de forma compacta en su cabecera y las salidas de una edicion o seleccion se identifican como `Cancelar` en lugar de reutilizar una flecha.
  - La navegacion inferior detecta ediciones locales pendientes en rutinas, ejercicios, perfil y objetivos. Antes de cambiar de seccion solicita confirmacion y, si el usuario decide continuar editando, devuelve la lente al acceso actual.
  - El bundle de produccion separa React, Supabase, Motion, drag and drop, iconos y dependencias generales en bloques estables. Las vistas secundarias se cargan bajo demanda, reduciendo el bloque principal de aproximadamente 671 kB a unos 245 kB sin reintroducir la advertencia por tamano.
  - Historial deja de encadenar el fallback de su modulo, el indicador de consulta y una segunda animacion escalonada. Su pequeno modulo se incorpora a la carga principal y la pantalla conserva solo el estado real de consulta a Supabase, eliminando el parpadeo de la primera entrada con un impacto acotado sobre el bundle.
  - La PWA incorpora un service worker de produccion con estrategia de actualizacion controlada: precarga la estructura, vistas diferidas y recursos esenciales, elimina caches obsoletas y revisa versiones al iniciar, cada quince minutos y al recuperar visibilidad, foco, pagina o conexion. Un limite comun evita consultas duplicadas y permite volver a ofrecer una version descargada que se habia pospuesto. La interfaz informa cuando la app queda disponible sin conexion y solicita confirmacion antes de aplicar una version nueva. Si existe una sesion activa, conserva la actualizacion en espera y vuelve a ofrecerla cuando termina para evitar interrupciones.
  - El cache en tiempo de uso se limita a las hojas de estilo y archivos de Google Fonts, con cantidad y vigencia acotadas. Las solicitudes a Supabase usan `NetworkOnly`, sin cache ni segunda cola en el service worker, para conservar una unica fuente de reintentos en `syncQueue` y evitar respuestas remotas obsoletas.

- Verificacion:
  - La linea base queda en 112 pruebas aprobadas, TypeScript sin errores, auditoria de dependencias de produccion sin vulnerabilidades y build correcto. El build PWA genera el service worker y precarga 64 recursos (aproximadamente 3,7 MiB, incluidas las fuentes locales) sin reintroducir advertencias por tamano de chunks.

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
