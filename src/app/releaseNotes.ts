export type ReleaseNote = {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
};

export type AppRelease = {
  version: string;
  title: string;
  titleEn?: string;
  publishedAt: string;
  notes: ReleaseNote[];
};

export const getLocalizedReleaseText = (
  language: AppLanguage,
  canonical: string,
  english?: string,
): string => language === 'en' && english?.trim() ? english : canonical;

export const fallbackReleaseHistory: AppRelease[] = [
  {
    version: '2026.08.22',
    title: 'Entrenamientos más claros y una nueva experiencia móvil',
    titleEn: 'Clearer workouts and a new mobile experience',
    publishedAt: '2026-08-22T15:00:00.000Z',
    notes: [
      {
        title: 'Nueva navegación móvil',
        titleEn: 'New mobile navigation',
        description: 'La barra inferior reúne Inicio, Rutinas, Motor, Historial y Perfil en cinco accesos compactos, con una lente animada que también puede arrastrarse. El Perfil ahora está organizado en secciones más claras.',
        descriptionEn: 'The bottom navigation now brings Dashboard, Routines, Engine, History, and Profile together in five compact entries, with an animated lens that can also be dragged. Profile settings are now organized into clearer sections.',
      },
      {
        title: 'Sesiones más claras y flexibles',
        titleEn: 'Clearer active sessions',
        description: 'El tiempo total permanece visible durante el entrenamiento y cada serie muestra lo realizado junto con lo planificado. Puedes alternar entre ejercicios y registrar series en cualquier orden, sin bloques de agrupación innecesarios.',
        descriptionEn: 'Total workout time remains visible, and every set shows completed values alongside the planned target. You can switch between exercises and log sets in any order, without unnecessary grouping blocks.',
      },
      {
        title: 'Descansos personalizados',
        titleEn: 'Custom rest timers',
        description: 'El temporizador permite elegir minutos y segundos mediante ruedas táctiles, guardar hasta ocho tiempos frecuentes y recibir una alarma más clara al finalizar.',
        descriptionEn: 'The rest timer now uses touch-friendly minute and second wheels, supports up to eight saved durations, and provides a clearer alarm when time is up.',
      },
      {
        title: 'Kinetic en español e inglés',
        titleEn: 'Kinetic in Spanish and English',
        description: 'El idioma puede cambiarse instantáneamente desde Configuración y queda guardado en el dispositivo y la cuenta. La interfaz y el catálogo global están traducidos, mientras que los nombres personalizados permanecen intactos.',
        descriptionEn: 'Language can be changed instantly from Settings and is saved on both the device and the account. The interface and global exercise catalog are translated, while custom names remain unchanged.',
      },
      {
        title: 'Motor de ejercicios mejorado',
        titleEn: 'A more complete Exercise Engine',
        description: 'Los buscadores musculares y de ejercicios comparten ahora el mismo diseño. Los resultados llevan directamente al ejercicio y el catálogo presenta nombres completos, nuevas variantes y descripciones técnicas más detalladas.',
        descriptionEn: 'Muscle and exercise search now share the same design. Results open the selected exercise directly, and the catalog includes complete names, new variants, and more detailed technical descriptions.',
      },
      {
        title: 'Una PWA más rápida y confiable',
        titleEn: 'A faster and more reliable PWA',
        description: 'Se redujo la carga inicial, se suavizaron las primeras entradas a las pantallas y la aplicación puede detectar actualizaciones durante el uso o al volver al primer plano, sin interrumpir una sesión activa.',
        descriptionEn: 'Initial loading is lighter, first-time screen transitions are smoother, and the app can detect updates while in use or when returning to the foreground without interrupting an active workout.',
      },
    ],
  },
  {
    version: '2026.07.29',
    title: 'Sesiones y rutinas más flexibles',
    titleEn: 'More flexible sessions and routines',
    publishedAt: '2026-07-29T15:00:00.000Z',
    notes: [
      {
        title: 'Ordena tus ejercicios',
        titleEn: 'Reorder your exercises',
        description: 'Ahora puedes cambiar el orden de los ejercicios arrastrándolos desde el asa lateral.',
        descriptionEn: 'You can now change the exercise order by dragging exercises from the side handle.',
      },
      {
        title: 'CORE opcional en cada sesión',
        titleEn: 'Optional CORE in every session',
        description: 'CORE queda disponible al elegir un día, pero solo cuenta si realizas alguno de sus ejercicios.',
        descriptionEn: 'CORE remains available after choosing a day, but it only counts when you complete at least one of its exercises.',
      },
      {
        title: 'Edición de rutinas más estable',
        titleEn: 'More reliable routine editing',
        description: 'El orden de los ejercicios se conserva al editarlos y se mejoró el guardado de sus series.',
        descriptionEn: 'Exercise order is preserved while editing, and saving configured sets is now more reliable.',
      },
    ],
  },
];
import type { AppLanguage } from '../i18n/translations';
