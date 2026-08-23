insert into public.app_releases (
  version,
  title,
  title_en,
  published_at,
  is_published
)
values (
  '2026.08.22',
  'Entrenamientos más claros y una nueva experiencia móvil',
  'Clearer workouts and a new mobile experience',
  '2026-08-22 12:00:00-03',
  true
)
on conflict (version) do update
set
  title = excluded.title,
  title_en = excluded.title_en,
  published_at = excluded.published_at,
  is_published = excluded.is_published;

insert into public.app_release_notes (
  release_version,
  position,
  title,
  title_en,
  description,
  description_en
)
values
  (
    '2026.08.22',
    1,
    'Nueva navegación móvil',
    'New mobile navigation',
    'La barra inferior reúne Inicio, Rutinas, Motor, Historial y Perfil en cinco accesos compactos, con una lente animada que también puede arrastrarse. El Perfil ahora está organizado en secciones más claras.',
    'The bottom navigation now brings Dashboard, Routines, Engine, History, and Profile together in five compact entries, with an animated lens that can also be dragged. Profile settings are now organized into clearer sections.'
  ),
  (
    '2026.08.22',
    2,
    'Sesiones más claras y flexibles',
    'Clearer active sessions',
    'El tiempo total permanece visible durante el entrenamiento y cada serie muestra lo realizado junto con lo planificado. Puedes alternar entre ejercicios y registrar series en cualquier orden, sin bloques de agrupación innecesarios.',
    'Total workout time remains visible, and every set shows completed values alongside the planned target. You can switch between exercises and log sets in any order, without unnecessary grouping blocks.'
  ),
  (
    '2026.08.22',
    3,
    'Descansos personalizados',
    'Custom rest timers',
    'El temporizador permite elegir minutos y segundos mediante ruedas táctiles, guardar hasta ocho tiempos frecuentes y recibir una alarma más clara al finalizar.',
    'The rest timer now uses touch-friendly minute and second wheels, supports up to eight saved durations, and provides a clearer alarm when time is up.'
  ),
  (
    '2026.08.22',
    4,
    'Kinetic en español e inglés',
    'Kinetic in Spanish and English',
    'El idioma puede cambiarse instantáneamente desde Configuración y queda guardado en el dispositivo y la cuenta. La interfaz y el catálogo global están traducidos, mientras que los nombres personalizados permanecen intactos.',
    'Language can be changed instantly from Settings and is saved on both the device and the account. The interface and global exercise catalog are translated, while custom names remain unchanged.'
  ),
  (
    '2026.08.22',
    5,
    'Motor de ejercicios mejorado',
    'A more complete Exercise Engine',
    'Los buscadores musculares y de ejercicios comparten ahora el mismo diseño. Los resultados llevan directamente al ejercicio y el catálogo presenta nombres completos, nuevas variantes y descripciones técnicas más detalladas.',
    'Muscle and exercise search now share the same design. Results open the selected exercise directly, and the catalog includes complete names, new variants, and more detailed technical descriptions.'
  ),
  (
    '2026.08.22',
    6,
    'Una PWA más rápida y confiable',
    'A faster and more reliable PWA',
    'Se redujo la carga inicial, se suavizaron las primeras entradas a las pantallas y la aplicación puede detectar actualizaciones durante el uso o al volver al primer plano, sin interrumpir una sesión activa.',
    'Initial loading is lighter, first-time screen transitions are smoother, and the app can detect updates while in use or when returning to the foreground without interrupting an active workout.'
  )
on conflict (release_version, position) do update
set
  title = excluded.title,
  title_en = excluded.title_en,
  description = excluded.description,
  description_en = excluded.description_en;
