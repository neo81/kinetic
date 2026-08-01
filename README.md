<div align="center">
  <img width="1200" height="auto" alt="Kinetic Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  <h1>⚡ Kinetic ⚡</h1>
  <p><strong>La Evolución en la Gestión del Entrenamiento Fitness</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Supabase-Persistencia-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  </p>
</div>

---

# 🇪🇸 Español (Neutro)

## 🚀 Resumen

**Kinetic** es una aplicación de fitness premium y de alto rendimiento diseñada para atletas que exigen precisión en su entrenamiento. Construida con un enfoque en la **excelencia visual** y **flujos de trabajo intuitivos**, Kinetic transforma los datos complejos de entrenamiento en una experiencia optimizada y motivadora.

Más allá de ser un simple registro, Kinetic cuenta con el **Target Engine**—un selector anatómico que permite construir rutinas basadas en grupos musculares específicos con precisión quirúrgica.

## ✨ Características Clave

### 🧠 Target Engine (Selector Muscular)
Mapas anatómicos interactivos (Frontal y Posterior) que proporcionan una interfaz directa para la selección de ejercicios. Calibrados para una máxima precisión.

### 📋 Creador de Rutinas Inteligente
- **Planificación Día a Día**: Organiza tu entrenamiento por días de la semana o sesiones con enfoque en el núcleo (Core).
- **Validación Dinámica**: El feedback en tiempo real asegura que tus rutinas estén completas y listas para la acción.
- **Formateo Inteligente**: Naming automático y etiquetas de frecuencia basadas en tus selecciones.

### ⚙️ Editor de Ejercicios de Precisión
- **Soporte Multi-Unidad**: Registra pesos en `kg` o duraciones en `min/seg`.
- **Series al fallo**: Permite planificar series por repeticiones fijas o `Al fallo`, manteniendo el registro real de repeticiones al finalizar la sesión.
- **Peso corporal controlado**: Soporte para ejercicios con peso corporal y snapshot del peso del perfil, sin activarlo por defecto al cargar una serie nueva.
- **Corrección durante la sesión**: Los sets ya realizados pueden abrirse nuevamente para editar valores o borrar el registro si fueron cargados por error.
- **Comparación durante la sesión**: Todas las series usan una presentación unificada y legible en navegador y PWA; las registradas muestran el valor realizado junto al planificado y las pendientes conservan el objetivo.
- **Inicio posicionado en el día**: Al comenzar una sesión, la vista vuelve al encabezado del día iniciado aunque el usuario estuviera revisando una serie intermedia o final.
- **Notas Globales**: Notas de entrenamiento persistentes que proporcionan contexto en todas las series de una instancia de ejercicio.
- **Gestión de Series Fluida**: Añade o elimina series con un solo toque, con persistencia automática.

### 📊 Dashboard de Rendimiento
- **Seguimiento de Carga Semanal**: Monitorea tu volumen de entrenamiento calculado en tiempo real.
- **Progreso Visual**: Gráficos y métricas de alto contraste que resaltan tus ganancias semanales.
- **Objetivos Personalizados**: Define y personaliza tus metas semanales.
- **Acceso claro a rutinas**: `VER TODAS` y el footer `RUTINAS` abren la lista completa; el detalle se muestra solo al elegir una rutina o continuar desde el dashboard.
- **Historial detallado**: Las sesiones completadas pueden expandirse para revisar días, ejercicios, sets y valores registrados.

### 👤 Perfil Avanzado
- **Avatar Personalizado**: Sube y ajusta tu avatar con zoom/crop integrado.
- **Validación de Username**: Validación en tiempo real (3-30 caracteres, sin duplicados).
- **Datos corporales**: Altura y peso disponibles para seguimiento y para ejercicios basados en peso corporal.
- **Preferencias de Usuario**: Tema (Oscuro/Claro) e Idioma (Español/Inglés).
- **Feedback Mejorado**: Mensajes auto-limpios después de 3 segundos.

### 🔄 Sincronización Robusta
- **Sincronización Offline**: La app continúa funcionando sin conexión.
- **Reintentos Inteligentes**: Sistema de cola con reintentos exponenciales.
- **Persistencia Local**: Todos los cambios se guardan localmente antes de sincronizar.

### 🔎 Biblioteca y Motor de Ejercicios
- **Búsqueda global**: Permite buscar ejercicios fuera de un grupo muscular e informa a qué grupo pertenecen.
- **Resultados adaptados a PWA**: Los nombres, grupos y equipos se presentan sin recortes ni columnas comprimidas en pantallas angostas.
- **Apertura directa**: Al elegir un resultado global se abre la ficha del ejercicio exacto dentro de su grupo muscular.
- **Modo visor desde el footer**: El acceso `MOTOR` funciona como biblioteca consultiva; no crea series ni modifica rutinas accidentalmente.
- **Selección contextual**: Al abrir el selector desde una rutina, el flujo vuelve al editor de series para cargar el ejercicio como antes.
- **Imágenes por grupo muscular**: Los ejercicios usan imágenes representativas por grupo, optimizadas en formato WebP.
- **Catálogo ampliado**: Incluye variantes de remo con pecho apoyado, curl de bíceps en polea y pullover; los ejercicios internos de pruebas E2E no forman parte del catálogo visible.

### 📱 PWA y rendimiento móvil
- **Transiciones suavizadas**: Ajustes para evitar pantallazos negros y cortes duros en iOS/Android PWA.
- **Selector muscular optimizado**: Precarga de imágenes frontal/posterior y regreso respetando la vista activa.
- **Iconografía PWA renovada**: Iconos de app, favicon y Apple Touch generados desde la imagen base corregida.
- **Idioma persistente**: La configuración permite alternar entre Español e Inglés sin recargar; la preferencia se guarda localmente y se sincroniza con Supabase. Ya están localizados el acceso y registro, Dashboard, navegación compartida, Configuración, perfil, avatar, novedades históricas, avisos, diagnósticos, rutinas, sesión activa, Historial y la interfaz completa de Motor.
- **Catálogo bilingüe completo**: Supabase conserva el nombre y la descripción canónicos en español y dispone de sus equivalentes en inglés. Los 142 ejercicios globales activos tienen nombre y descripción técnica en ambos idiomas; Motor, el editor de rutinas, la sesión activa y el Historial presentan el contenido localizado sin modificar los datos canónicos.
- **Respaldo offline localizado**: Los 28 ejercicios incluidos en el catálogo local de emergencia conservan su identidad canónica en español y muestran nombres, grupos musculares y equipamiento en inglés cuando ese idioma está activo.
- **Contenido personalizado preservado**: Los nombres escritos por el usuario para rutinas, días y ejercicios no se traducen ni se modifican. Solo se localizan las etiquetas, mensajes y valores de respaldo generados por la aplicación.
- **Historial localizado por estructura**: Los días registrados se presentan como `Día/Day N` según el idioma activo a partir de su tipo y número; no se depende del título español persistido ni se reescriben sesiones anteriores.

## 🛠 Tech Stack

- **Frontend**: [React 19](https://react.dev/) con TypeScript
- **Herramientas**: [Vite](https://vitejs.dev/) para builds ultra rápidos, [Vitest](https://vitest.dev/) para testing
- **Estilos**: [TailwindCSS 4](https://tailwindcss.com/) con sistema Dark-Mode-First
- **Animaciones**: [Motion](https://motion.dev/) para transiciones fluidas
- **Backend**: [Supabase](https://supabase.com/) para persistencia real-time
- **Storage**: Supabase Storage para avatares y archivos de usuario
- **Icons**: [Lucide React](https://lucide.dev/) para iconografía consistente

## 📈 Estado del Desarrollo

**5 de 9 Fases Completadas** ✅

- ✅ Fase 1: Estabilización (Auth Google OAuth)
- ✅ Fase 2: Dashboard Redesignado con Contexto
- ✅ Fase 3: Sync y Offline Robusto
- ✅ Fase 4: Biblioteca de Ejercicios Avanzada
- ✅ Fase 5: Perfil y Preferencias Avanzadas
- ⏳ Fase 6: Analytics & Estadísticas Avanzadas
- ⏳ Fase 7: Social & Compartir Entrenamientos
- ⏳ Fase 8: Mobile App (iOS/Android)
- ⏳ Fase 9: Calidad de Producción

Ver [ROADMAP.md](ROADMAP.md) para detalles completos de todas las fases.

## 📦 Primeros Pasos

### Requisitos Previos

- **Node.js** 24.18.0 (version fijada para Volta)
- **NPM** o **PNPM**
- **Cuenta en [Supabase](https://supabase.com/)** (gratuita)

### Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/neo81/kinetic.git
   cd kinetic
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Entorno:**
   Crea un archivo `.env.local` en la raíz del proyecto:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima
   ```
   
   Obtén estas credenciales de tu proyecto en [Supabase Dashboard](https://app.supabase.com/)

4. **Configurar Supabase (una sola vez):**
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   npx supabase functions deploy end-session --no-verify-jwt
   ```
   - Crea un bucket `user-avatars` en Supabase Storage
   - Habilita acceso público para el bucket
   - La Edge Function valida el JWT dentro de su implementación; por eso el despliegue conserva `--no-verify-jwt`

5. **Lanzar la plataforma:**
   ```bash
   npm run dev
   ```
   La app estará disponible en `http://localhost:3000`

### Comandos Disponibles

```bash
npm run dev        # Desarrollar con hot reload
npm run build      # Build para producción
npm run preview    # Preview del build
npm run test       # Ejecutar tests con Vitest
npm run test:ui    # UI de Vitest
npm run lint       # Verificar TypeScript con tsc --noEmit
npm run test:e2e   # Ejecutar pruebas E2E con Playwright
npm run test:load:k6        # Smoke/load test con k6
```

## 🔐 Seguridad

- **OAuth 2.0**: Autenticación segura con Google
- **RLS (Row Level Security)**: Datos protegidos a nivel de base de datos
- **Funciones internas**: La transacción de cierre solo puede ser ejecutada por `service_role` desde la Edge Function
- **SSL/TLS**: Toda comunicación es encriptada
- **Tokens**: JWT seguros manejados por Supabase

## 📱 Responsive Design

- Optimizado para desktop y tablet
- Interfaz adaptativa con TailwindCSS
- Mobile en fases futuras (Fase 8)

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

# 🇺🇸 English

## 🚀 Overview

**Kinetic** is a premium, high-performance fitness application designed for athletes who demand precision in their training. Built with a focus on **visual excellence** and **intuitive workflows**, Kinetic transforms complex workout data into a streamlined, motivating experience.

Looking beyond a simple logger, Kinetic features the **Target Engine**—an anatomical selector that allows you to build routines based on specific muscle groups with surgical precision.

## ✨ Key Features

### 🧠 Target Engine (Muscle Selector)
Interactive anatomical maps (Front & Back) that provide a direct interface for exercise selection. Calibrated for maximum precision.

### 📋 Intelligent Routine Creator
- **Day-by-Day Planning**: Organize your training by days of the week or core focus sessions.
- **Dynamic Validation**: Real-time feedback ensures your routines are complete and ready for action.
- **Smart Formatting**: Automatic naming and frequency labeling based on your selections.

### ⚙️ Precision Exercise Editor
- **Multi-Unit Support**: Log weights in `kg` or durations in `min/sec`.
- **Failure Sets**: Plan sets as fixed reps or `To failure`, while still capturing actual reps at session completion.
- **Controlled Bodyweight Load**: Supports bodyweight exercises and profile weight snapshots without enabling bodyweight by default for newly selected exercises.
- **In-session corrections**: Captured sets can be opened again to edit values or remove the record if they were logged by mistake.
- **Global Notes**: Persistent training notes that provide context across all sets of an exercise instance.
- **Fluid Set Management**: Add or remove sets with a single tap, with automatic persistence.

### 📊 Performance Dashboard
- **Weekly Load Tracking**: Monitor your training volume calculated in real-time.
- **Visual Progress**: High-contrast charts and metrics that highlight your weekly gains.
- **Custom Goals**: Set and personalize your weekly objectives.
- **Clear routines access**: `View all` and the `RUTINAS` footer entry open the full routine list; routine detail appears only after selecting a routine or continuing from the dashboard.
- **Detailed history**: Completed sessions can be expanded to review days, exercises, sets, and recorded values.

### 👤 Advanced Profile
- **Custom Avatar**: Upload and adjust your avatar with integrated zoom/crop.
- **Username Validation**: Real-time validation (3-30 characters, no duplicates).
- **Body Metrics**: Height and weight are available for tracking and bodyweight-based exercise records.
- **User Preferences**: Theme (Dark/Light) and Language (Spanish/English).
- **Improved Feedback**: Auto-clearing messages after 3 seconds.

### 🔄 Robust Synchronization
- **Offline Sync**: The app continues working without connection.
- **Smart Retries**: Queue system with exponential backoff.
- **Local Persistence**: All changes saved locally before syncing.

### 🔎 Exercise Library and Engine
- **Global Search**: Search exercises outside a specific muscle group and see which group each result belongs to.
- **Footer Viewer Mode**: The `MOTOR` footer entry works as a read-only exercise library and does not create sets or change routines accidentally.
- **Contextual Selection**: When opened from a routine, the selector keeps the add-exercise flow and returns to the set editor.
- **Muscle-Group Images**: Exercises use representative WebP imagery by muscle group.

### 📱 PWA and Mobile Performance
- **Smoother Transitions**: Adjustments to avoid black flashes and hard cuts on iOS/Android PWA.
- **Optimized Muscle Selector**: Front/back image preloading and return behavior that preserves the active side.
- **Refreshed PWA Icons**: App icons, favicon, and Apple Touch icon regenerated from the corrected base artwork.

## 🛠 Tech Stack

- **Frontend**: [React 19](https://react.dev/) with TypeScript
- **Tooling**: [Vite](https://vitejs.dev/) for ultra-fast builds, [Vitest](https://vitest.dev/) for testing
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/) with Dark-Mode-First design system
- **Animations**: [Motion](https://motion.dev/) for smooth transitions
- **Backend**: [Supabase](https://supabase.com/) for real-time data persistence
- **Storage**: Supabase Storage for avatars and user files
- **Icons**: [Lucide React](https://lucide.dev/) for consistent iconography

## 📈 Development Status

**5 of 9 Phases Completed** ✅

- ✅ Phase 1: Stabilization (Google OAuth)
- ✅ Phase 2: Redesigned Dashboard with Context
- ✅ Phase 3: Robust Sync & Offline
- ✅ Phase 4: Advanced Exercise Library
- ✅ Phase 5: Profile & Advanced Preferences
- ⏳ Phase 6: Analytics & Advanced Stats
- ⏳ Phase 7: Social & Share Workouts
- ⏳ Phase 8: Mobile App (iOS/Android)
- ⏳ Phase 9: Production Quality

See [ROADMAP.md](ROADMAP.md) for complete details of all phases.

## 📦 Getting Started

### Prerequisites

- **Node.js** 24.18.0 (pinned for Volta)
- **NPM** or **PNPM**
- **[Supabase](https://supabase.com/) account** (free tier available)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/neo81/kinetic.git
   cd kinetic
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env.local` file in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
   
   Get these credentials from your project in [Supabase Dashboard](https://app.supabase.com/)

4. **Setup Supabase (one-time):**
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   npx supabase functions deploy end-session --no-verify-jwt
   ```
   - Create a `user-avatars` bucket in Supabase Storage
   - Enable public access for the bucket
   - The Edge Function validates the JWT internally, so deployment intentionally keeps `--no-verify-jwt`

5. **Launch the platform:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

### Available Commands

```bash
npm run dev        # Develop with hot reload
npm run build      # Build for production
npm run preview    # Preview the build
npm run test       # Run tests with Vitest
npm run test:ui    # Vitest UI
npm run lint       # Check TypeScript with tsc --noEmit
npm run test:e2e   # Run E2E tests with Playwright
npm run test:load:k6        # Smoke/load test with k6
```

## 🔐 Security

- **OAuth 2.0**: Secure authentication with Google
- **RLS (Row Level Security)**: Database-level data protection
- **Internal functions**: The completion transaction is executable only by `service_role` through the Edge Function
- **SSL/TLS**: All communication is encrypted
- **Tokens**: Secure JWT handling by Supabase

## 📱 Responsive Design

- Optimized for desktop and tablet
- Adaptive interface with TailwindCSS
- Mobile in future phases (Phase 8)

## 🤝 Contributing

Contributions are welcome! For major changes:

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Creado con ❤️ por el Equipo de Kinetic | Built with ❤️ by the Kinetic Team</p>
</div>
