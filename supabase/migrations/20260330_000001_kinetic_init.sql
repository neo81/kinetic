create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  unit_system text not null default 'kg' check (unit_system in ('kg', 'lb')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.muscle_groups (
  id bigserial primary key,
  code text not null unique,
  name text not null,
  body_side text not null check (body_side in ('front', 'back', 'core', 'other')),
  sort_order integer not null default 0
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  muscle_group_id bigint not null references public.muscle_groups(id),
  equipment text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  day_type text not null check (day_type in ('core', 'weekday')),
  day_number integer check (day_number between 1 and 7),
  title text,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint routine_days_core_day_number_check
    check (
      (day_type = 'core' and day_number is null)
      or (day_type = 'weekday' and day_number is not null)
    )
);

create table if not exists public.routine_day_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position integer not null,
  rest_seconds integer,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  routine_day_exercise_id uuid not null references public.routine_day_exercises(id) on delete cascade,
  set_number integer not null,
  reps numeric(6,2),
  weight numeric(8,2),
  duration_minutes numeric(6,2),
  duration_seconds numeric(6,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_sessions (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz,
  ended_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.session_day_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.routine_sessions(id) on delete cascade,
  routine_day_id uuid not null references public.routine_days(id),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists public.session_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_day_log_id uuid not null references public.session_day_logs(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position integer,
  notes text
);

create table if not exists public.session_set_logs (
  id uuid primary key default gen_random_uuid(),
  session_exercise_log_id uuid not null references public.session_exercise_logs(id) on delete cascade,
  set_number integer not null,
  reps numeric(6,2),
  weight numeric(8,2),
  duration_minutes numeric(6,2),
  duration_seconds numeric(6,2),
  completed boolean not null default false
);

create unique index if not exists profiles_username_idx on public.profiles(username);
create unique index if not exists muscle_groups_code_idx on public.muscle_groups(code);
create index if not exists exercises_muscle_group_active_idx on public.exercises(muscle_group_id, is_active);
create index if not exists routines_user_active_updated_idx on public.routines(user_id, is_active, updated_at desc);
create unique index if not exists routine_days_routine_position_idx on public.routine_days(routine_id, position);
create unique index if not exists routine_days_routine_day_number_idx on public.routine_days(routine_id, day_number) where day_number is not null;
create unique index if not exists routine_day_exercises_day_position_idx on public.routine_day_exercises(routine_day_id, position);
create unique index if not exists exercise_sets_routine_exercise_set_number_idx on public.exercise_sets(routine_day_exercise_id, set_number);
create index if not exists routine_sessions_user_started_idx on public.routine_sessions(user_id, started_at desc);
create index if not exists session_day_logs_session_day_idx on public.session_day_logs(session_id, routine_day_id);
create index if not exists session_exercise_logs_day_position_idx on public.session_exercise_logs(session_day_log_id, position);
create unique index if not exists session_set_logs_exercise_set_number_idx on public.session_set_logs(session_exercise_log_id, set_number);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_routines_updated_at on public.routines;
create trigger set_routines_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_day_exercises enable row level security;
alter table public.exercise_sets enable row level security;
alter table public.routine_sessions enable row level security;
alter table public.session_day_logs enable row level security;
alter table public.session_exercise_logs enable row level security;
alter table public.session_set_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "muscle_groups_read_authenticated" on public.muscle_groups;
create policy "muscle_groups_read_authenticated"
on public.muscle_groups for select
using (auth.role() = 'authenticated');

drop policy if exists "exercises_read_authenticated" on public.exercises;
create policy "exercises_read_authenticated"
on public.exercises for select
using (auth.role() = 'authenticated');

drop policy if exists "routines_manage_own" on public.routines;
create policy "routines_manage_own"
on public.routines for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "routine_days_manage_own" on public.routine_days;
create policy "routine_days_manage_own"
on public.routine_days for all
using (
  exists (
    select 1
    from public.routines
    where routines.id = routine_days.routine_id
      and routines.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.routines
    where routines.id = routine_days.routine_id
      and routines.user_id = auth.uid()
  )
);

drop policy if exists "routine_day_exercises_manage_own" on public.routine_day_exercises;
create policy "routine_day_exercises_manage_own"
on public.routine_day_exercises for all
using (
  exists (
    select 1
    from public.routine_days
    join public.routines on routines.id = routine_days.routine_id
    where routine_days.id = routine_day_exercises.routine_day_id
      and routines.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.routine_days
    join public.routines on routines.id = routine_days.routine_id
    where routine_days.id = routine_day_exercises.routine_day_id
      and routines.user_id = auth.uid()
  )
);

drop policy if exists "exercise_sets_manage_own" on public.exercise_sets;
create policy "exercise_sets_manage_own"
on public.exercise_sets for all
using (
  exists (
    select 1
    from public.routine_day_exercises
    join public.routine_days on routine_days.id = routine_day_exercises.routine_day_id
    join public.routines on routines.id = routine_days.routine_id
    where routine_day_exercises.id = exercise_sets.routine_day_exercise_id
      and routines.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.routine_day_exercises
    join public.routine_days on routine_days.id = routine_day_exercises.routine_day_id
    join public.routines on routines.id = routine_days.routine_id
    where routine_day_exercises.id = exercise_sets.routine_day_exercise_id
      and routines.user_id = auth.uid()
  )
);

drop policy if exists "routine_sessions_manage_own" on public.routine_sessions;
create policy "routine_sessions_manage_own"
on public.routine_sessions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "session_day_logs_manage_own" on public.session_day_logs;
create policy "session_day_logs_manage_own"
on public.session_day_logs for all
using (
  exists (
    select 1
    from public.routine_sessions
    where routine_sessions.id = session_day_logs.session_id
      and routine_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.routine_sessions
    where routine_sessions.id = session_day_logs.session_id
      and routine_sessions.user_id = auth.uid()
  )
);

drop policy if exists "session_exercise_logs_manage_own" on public.session_exercise_logs;
create policy "session_exercise_logs_manage_own"
on public.session_exercise_logs for all
using (
  exists (
    select 1
    from public.session_day_logs
    join public.routine_sessions on routine_sessions.id = session_day_logs.session_id
    where session_day_logs.id = session_exercise_logs.session_day_log_id
      and routine_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.session_day_logs
    join public.routine_sessions on routine_sessions.id = session_day_logs.session_id
    where session_day_logs.id = session_exercise_logs.session_day_log_id
      and routine_sessions.user_id = auth.uid()
  )
);

drop policy if exists "session_set_logs_manage_own" on public.session_set_logs;
create policy "session_set_logs_manage_own"
on public.session_set_logs for all
using (
  exists (
    select 1
    from public.session_exercise_logs
    join public.session_day_logs on session_day_logs.id = session_exercise_logs.session_day_log_id
    join public.routine_sessions on routine_sessions.id = session_day_logs.session_id
    where session_exercise_logs.id = session_set_logs.session_exercise_log_id
      and routine_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.session_exercise_logs
    join public.session_day_logs on session_day_logs.id = session_exercise_logs.session_day_log_id
    join public.routine_sessions on routine_sessions.id = session_day_logs.session_id
    where session_exercise_logs.id = session_set_logs.session_exercise_log_id
      and routine_sessions.user_id = auth.uid()
  )
);

delete from public.muscle_groups where id != 1;

insert into public.muscle_groups (code, name, body_side, sort_order)
values
  -- Frente
  ('hombros', 'Hombros', 'front', 1),
  ('pectorales', 'Pectorales', 'front', 2),
  ('biceps', 'Bíceps', 'front', 3),
  ('abdomen', 'Abdomen', 'front', 4),
  ('oblicuos', 'Oblicuos', 'front', 5),
  ('antebrazo', 'Antebrazo', 'front', 6),
  ('abductores', 'Abductores', 'front', 7),
  ('aductores', 'Aductores', 'front', 8),
  ('cuadriceps', 'Cuádriceps', 'front', 9),
  -- Espalda
  ('trapecio', 'Trapecio', 'back', 10),
  ('triceps', 'Tríceps', 'back', 11),
  ('dorsales', 'Dorsales', 'back', 12),
  ('lumbares', 'Lumbares', 'back', 13),
  ('gluteos', 'Glúteos', 'back', 14),
  ('isquiotibiales', 'Isquiotibiales', 'back', 15),
  ('pantorrillas', 'Pantorrillas', 'back', 16)
on conflict (code) do update
set
  name = excluded.name,
  body_side = excluded.body_side,
  sort_order = excluded.sort_order;

-- Limpiar ejercicios antes de insertarlos (por si se re-ejecuta el script)
delete from public.exercises;

-- Inserción masiva de ejercicios categorizados
insert into public.exercises (name, description, muscle_group_id, equipment)
values
  -- Pectorales
  ('Press de Banca Plano', 'Acostado en un banco plano, sujeta la barra con apertura media. Baja la barra hasta el pecho de forma controlada y empuja explosivamente hacia arriba sin bloquear completamente los codos.', (select id from public.muscle_groups where code = 'pectorales'), 'Barra y Banco'),
  ('Press de Banca Inclinado', 'Ajusta el banco a 30-45 grados. Levanta las mancuernas desde la altura de los hombros hacia arriba, enfocando el estímulo en la porción superior del pectoral.', (select id from public.muscle_groups where code = 'pectorales'), 'Mancuernas'),
  ('Cruces en PoleaAlta', 'De pie en el centro de dos poleas altas, tira de los agarres hacia abajo y hacia el centro de tu cuerpo contrarrestando el peso. Excelente para el trabajo de aislamiento y congestión.', (select id from public.muscle_groups where code = 'pectorales'), 'Polea'),
  ('Flexiones de Pecho (Push-ups)', 'Boca abajo, apoya las manos a una anchura ligeramente mayor que los hombros. Baja el cuerpo estirado hasta que el pecho roce el suelo y empuja de regreso. Ejercicio esencial de calistenia.', (select id from public.muscle_groups where code = 'pectorales'), 'Peso Corporal'),
  ('Aperturas con Mancuernas', 'Tumbado en banco plano o inclinado, abre los brazos con una ligera flexión en los codos hasta sentir el estiramiento en el pecho, luego júntalos arriba como si dieras un abrazo.', (select id from public.muscle_groups where code = 'pectorales'), 'Mancuernas'),

  -- Hombros
  ('Press Militar', 'De pie o sentado, empuja la barra desde las clavículas hasta bloquear los brazos por encima de la cabeza. Activa profundamente el deltoides anterior.', (select id from public.muscle_groups where code = 'hombros'), 'Barra'),
  ('Elevaciones Laterales', 'Con una mancuerna en cada mano, eleva los brazos lateralmente hasta que estén paralelos al suelo. Evita balancearte usando inercia.', (select id from public.muscle_groups where code = 'hombros'), 'Mancuernas'),
  ('Press Arnold', 'Variación del press de hombros con mancuernas, comenzando con las palmas mirando hacia ti a nivel del cuello y rotándolas al subir hasta quedar mirando al frente.', (select id from public.muscle_groups where code = 'hombros'), 'Mancuernas'),
  ('Pájaros (Reverse Flyes)', 'Inclinado hacia adelante o apoyado boca abajo en un banco, levanta las mancuernas lateralmente enfocando el trabajo en la parte posterior del hombro.', (select id from public.muscle_groups where code = 'hombros'), 'Mancuernas'),

  -- Bíceps
  ('Curl de Bíceps con Barra', 'De pie, sujeta una barra con agarre supino (palmas hacia arriba) al ancho de los hombros. Flexiona los codos subiendo el peso hacia el pecho sin mover la espalda.', (select id from public.muscle_groups where code = 'biceps'), 'Barra'),
  ('Curl Alterno con Mancuernas', 'De pie o sentado, flexiona un brazo elevando la mancuerna seguido por el otro, rotando ligeramente la muñeca hacia afuera en la subida.', (select id from public.muscle_groups where code = 'biceps'), 'Mancuernas'),
  ('Curl Martillo', 'Mantén un agarre neutro (las palmas mirándose) durante todo el recorrido del curl. Ayuda a desarrollar también el braquial y braquiorradial.', (select id from public.muscle_groups where code = 'biceps'), 'Mancuernas'),
  ('Curl en Banco Scott', 'Apoya los tríceps en un pupitre inclinado y levanta la barra Z. Impide utilizar el impulso para un aislamiento total del bíceps.', (select id from public.muscle_groups where code = 'biceps'), 'Banco Scott y Barra Z'),

  -- Tríceps
  ('Extensión en Polea Alta', 'De pie frente a la polea, utiliza cuerda o barra en V. Con los codos pegados al cuerpo empuja hacia abajo hasta extender el brazo.', (select id from public.muscle_groups where code = 'triceps'), 'Polea'),
  ('Press Francés (Rompecráneos)', 'Acostado, baja una barra Z flexionando los codos hasta que la barra casi toque tu frente, y luego empuja a la posición inicial.', (select id from public.muscle_groups where code = 'triceps'), 'Barra Z y Banco'),
  ('Fondos en Paralelas (Dips)', 'Soporta el peso corporal entre dos barras paralelas. Baja lentamente flexionando codos, manteniendo el torso erguido para un mayor enfoque en tríceps.', (select id from public.muscle_groups where code = 'triceps'), 'Paralelas'),
  ('Patada de Tríceps', 'Inclinado, con el codo apuntando atrás de forma horizontal, extiende el antebrazo hacia atrás contrayendo el tríceps por un segundo en la extensión completa.', (select id from public.muscle_groups where code = 'triceps'), 'Mancuerna'),

  -- Dorsales (Espalda media/alta)
  ('Dominadas (Pull-ups)', 'Colgado de una barra con agarre amplio pronado. Tracciona elevando el cuerpo hasta que la barbilla pase la barra, retrayendo las escápulas.', (select id from public.muscle_groups where code = 'dorsales'), 'Barra de Dominadas'),
  ('Jalón al Pecho', 'En polea alta, baja la barra ancha hacia la parte superior del pecho usando la fuerza de los músculos dorsales, reteniendo en la fase excéntrica.', (select id from public.muscle_groups where code = 'dorsales'), 'Máquina de Jalón'),
  ('Remo con Barra', 'Cuerpo inclinado a 45 grados y abdomen muy apretado. Tira de la barra hacia tu ombligo enfocando el trabajo en juntar las escápulas.', (select id from public.muscle_groups where code = 'dorsales'), 'Barra'),
  ('Remo Gironda (Polea Baja)', 'Sentado, con agarre V estrecho, tira del asa directo hacia tu abdomen sin deformar la postura lumbar.', (select id from public.muscle_groups where code = 'dorsales'), 'Polea'),

  -- Trapecio
  ('Encogimientos (Shrugs)', 'Con una mancuerna o disco pesado en cada mano a los costados del cuerpo. Encoge los hombros directo hacia las orejas, sin girarlos ni rotarlos.', (select id from public.muscle_groups where code = 'trapecio'), 'Mancuernas'),
  ('Remo al Mentón', 'De pie, agarre estrecho de una barra o mancuernas. Sube el peso arrimándolo al cuerpo hasta el nivel del mentón, llevando los codos más alto que las muñecas.', (select id from public.muscle_groups where code = 'trapecio'), 'Barra o Polea'),

  -- Lumbares
  ('Hiperextensiones', 'Ancla los talones en el banco romano con las caderas libres. Baja flexionando el torso y vuelve a la posición horizontal contrayendo erectores espinales y glúteos.', (select id from public.muscle_groups where code = 'lumbares'), 'Banco Romano'),
  ('Supermans', 'Acostado boca abajo en el piso, brazos extendidos adelante. Levanta piernas y brazos simultáneamente formando un "arco" aguantando un segundo arriba.', (select id from public.muscle_groups where code = 'lumbares'), 'Peso Corporal'),

  -- Cuádriceps
  ('Sentadilla Libre', 'Con barra sobre los hombros traseros. Flexiona cadera y rodillas profundamente simulando sentarte en una silla. Fundamental del culturismo.', (select id from public.muscle_groups where code = 'cuadriceps'), 'Barra y Rack'),
  ('Prensa de Piernas (Leg Press)', 'Acomodado en la prensa a 45 grados. Baja la plataforma controlando un ángulo de 90 grados en rodillas y empuja usando toda la planta del pie.', (select id from public.muscle_groups where code = 'cuadriceps'), 'Máquina Prensa'),
  ('Extensión de Cuádriceps', 'Sentado en máquina, extiende totalmente las rodillas levantando el rodillo, sosteniendo medio segundo de máxima contracción.', (select id from public.muscle_groups where code = 'cuadriceps'), 'Máquina Extensora'),
  ('Sentadilla Búlgara', 'Coloca un pie atrás apoyado sobre un banco. Baja en sentadilla en una sola pierna hasta rozar el suelo con la rodilla de atrás. Altísima demanda cuádripces y equilibrio.', (select id from public.muscle_groups where code = 'cuadriceps'), 'Mancuernas y Cajón'),
  ('Zancadas (Lunges)', 'Da un paso largo bajando las caderas recto hacia abajo hasta formar ángulos rectos en ambas piernas. Vuelve arriba repitiendo o avanzando.', (select id from public.muscle_groups where code = 'cuadriceps'), 'Mancuernas'),

  -- Isquiotibiales
  ('Peso Muerto Rumano', 'De pie, flexiona muy poco las rodillas e inclínate desde la cadera echando los glúteos atrás y bajando el peso por tus muslos hasta estirar isquiotibiales intensamente.', (select id from public.muscle_groups where code = 'isquiotibiales'), 'Barra o Mancuernas'),
  ('Curl de Piernas Tumbado', 'Boca abajo en la máquina, flexiona las rodillas subiendo el peso hacia los glúteos de forma enérgica, bajando controlado.', (select id from public.muscle_groups where code = 'isquiotibiales'), 'Máquina Curl Femoral'),
  ('Curl de Piernas Sentado', 'En la versión sentada, empuja el cojín hacia atrás bajando la pierna para contraer la musculatura isquiotibial inferior.', (select id from public.muscle_groups where code = 'isquiotibiales'), 'Máquina Curl Femoral'),

  -- Glúteos
  ('Hip Thrust (Empuje de Cadera)', 'Con espalda alta sobre un cajón y la pelvis recibiendo barra acolchada. Empuja con fuerza usando glúteos y talones puenteando hasta alinear cuerpo-muslos.', (select id from public.muscle_groups where code = 'gluteos'), 'Barra y Cajón'),
  ('Sentadilla Sumo', 'Sentadilla de separación de pies altísima y puntas hacia afuera, concentrando inmensamente la distribución de esfuerzo hacia glúteos y aductores.', (select id from public.muscle_groups where code = 'gluteos'), 'Barra o Mancuerna Pesada'),
  ('Puente Glúteo Básico', 'Tendiendo la espalda al piso, flexiona rodillas; presiona la pelvis hacia al cielo. Gran auxiliar para la conexión mente-músculo de esta área.', (select id from public.muscle_groups where code = 'gluteos'), 'Peso Corporal'),
  ('Patada Trasera en Polea', 'Apoyando la cinta tobillera en un cable de piso. Da una patada vigorosa estrictamente hacia atrás usando sólo tensión glútea, sin arquear la espalda baja.', (select id from public.muscle_groups where code = 'gluteos'), 'Polea Baja'),

  -- Abductores
  ('Apertura en Máquina Abductora', 'Sentado empuja las cubiertas de las almohadillas hacia fuera contra la resistencia exterior abriendo drásticamente el ángulo de las rodillas.', (select id from public.muscle_groups where code = 'abductores'), 'Máquina Abductores'),
  ('Abducción en Polea o Banda', 'De lateral fijando tobillo. Levanta la pierna estirada lateralmente apartándose perpendicularmente de la base para fatigar zona externa del cadera-glúteo medio.', (select id from public.muscle_groups where code = 'abductores'), 'Polea Baja o Banda'),

  -- Aductores
  ('Cierre en Máquina Aductora', 'Acopla las piernas abiertas hacia las palmas internas de los soportes. Fuerza un cierre potente uniéndolas al máximo aislando los aductores.', (select id from public.muscle_groups where code = 'aductores'), 'Máquina Aductores'),

  -- Pantorrillas (Gemelos/Sóleo)
  ('Elevación de Talones de Pie', 'De pie en escalón. Deja caer los talones estirando tobillo y contrae levantándolos a máxima explosión en la cúspide (gemelos gastrocnemios).', (select id from public.muscle_groups where code = 'pantorrillas'), 'Máquina o Bodyweight'),
  ('Elevación de Talones Sentado', 'Sentado con pesos descasando en muslos frontales. Levanta un soporte sobre las puntas levantando; activa masivamente el Sóleo inferior.', (select id from public.muscle_groups where code = 'pantorrillas'), 'Máquina Sóleo Sentado'),

  -- Abdomen
  ('Crunch Abdominal Clásico', 'Boca arriba rodillas dobladas, encoge tórax a la pelvis para despegar solo hombros del piso aislando Recto adbominal.', (select id from public.muscle_groups where code = 'abdomen'), 'Peso Corporal'),
  ('Rueda Abdominal (Ab Wheel)', 'De rodillas operando la rueda, rueda cuerpo horizontal al frente lo más extendible protegiendo columna y jala en retroceso contraído al suelo.', (select id from public.muscle_groups where code = 'abdomen'), 'Rueda (Ab Roller)'),
  ('Elevación de Piernas Colgado', 'Colgado sostén espalda firme. Fuerza subiendo rodillas directas o piernas totalmente rígidas en paralela para activar porciones bajas infraumbilicales abdominales.', (select id from public.muscle_groups where code = 'abdomen'), 'Barra Dominadas'),

  -- Oblicuos
  ('Crunch Oblicuo', 'Tendido al suelo, orienta contracción de la jaula torácica no al frente sino tocando oblicuamente o juntando codo sobre la rótula contralateral.', (select id from public.muscle_groups where code = 'oblicuos'), 'Peso Corporal'),
  ('Giros Rusos (Russian Twists)', 'Glúteos apoyantes y rodillas libres altas en pose de V de abdomen. Rotea mancuerna del lago derecho topando al piso al lado opuesto en secuencias.', (select id from public.muscle_groups where code = 'oblicuos'), 'Mancuerna o Balón'),

  -- Antebrazo
  ('Curl de Muñeca Supinado', 'Apoya zona antebraquial aliviándose al filo un banquillo boca arriba con la barra y flexiona muñequera puro solo los carpianos adentro.', (select id from public.muscle_groups where code = 'antebrazo'), 'Barra o Mancuernas'),
  ('Curl de Muñeca Pronado', 'Ídem pero dorso palma voltea vista al techo focalizando y entrenando reveses musculares flexoextensores del brachiorradial superior.', (select id from public.muscle_groups where code = 'antebrazo'), 'Barra'),
  ('Cuelgue Pasivo en Barra', 'Ejercicio estático isométrico. Colgar activamente sosteniendo barra, desafiando puro grip y fortalezador crudo con temporizador cronómetrico.', (select id from public.muscle_groups where code = 'antebrazo'), 'Barra Dominadas'),

  -- Core Isométrico Global ("CORE")
  ('Plancha Isométrica (Forearm Plank)', 'Posición de push-up sobre antebrazos alineando todo segmento cráneo pélvico plantar. Contraer vientre hacia columna impidiendo vientos espinales lumbares durante tiempos.', (select id from public.muscle_groups where code = 'core'), 'Peso corporal'),
  ('Plancha Lateral', 'Con recostamiento paralelo apoyado de un codito base, apuntar vientre horizontal firme, empoderando flancos musculares profundos oblicuos-core unificados de lateral.', (select id from public.muscle_groups where code = 'core'), 'Peso corporal'),
  ('Hollow Body Hold', 'Boca arriba como lancha o “banana shape”. Espalda baja adherida sin paso alumbrico inferior y brazos/piernas alzando tensión suprema sostenida gimnasia y calistenia.', (select id from public.muscle_groups where code = 'core'), 'Peso corporal'),
  ('Paseo del Granjero (Farmers Walk)', 'Pausas caminadas de sobre-cargas magnas asimétricas o simétricas con pesas o kettlebells para el reclutamiento abdominal profundo antirotacional o axial funcional dinámico.', (select id from public.muscle_groups where code = 'core'), 'Mancuernas o Kettlebells pesadas'),
  ('Bird Dog', 'En postura cuadripedial (rodillas+palmas). Estirar simétricamente la brazo derecha con miembro isquiotibiotarsal opuesto. Equilibrio medular e inserción transversa abdominal.', (select id from public.muscle_groups where code = 'core'), 'Peso corporal');
