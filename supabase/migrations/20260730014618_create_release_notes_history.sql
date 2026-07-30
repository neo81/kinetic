create table public.app_releases (
  version text primary key,
  title text not null,
  published_at timestamptz not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint app_releases_version_format_check
    check (version ~ '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$'),
  constraint app_releases_title_check
    check (length(btrim(title)) > 0)
);

create table public.app_release_notes (
  id uuid primary key default gen_random_uuid(),
  release_version text not null
    references public.app_releases(version) on update cascade on delete cascade,
  position smallint not null,
  title text not null,
  description text not null,
  created_at timestamptz not null default now(),
  constraint app_release_notes_position_check
    check (position > 0),
  constraint app_release_notes_title_check
    check (length(btrim(title)) > 0),
  constraint app_release_notes_description_check
    check (length(btrim(description)) > 0),
  constraint app_release_notes_release_position_key
    unique (release_version, position)
);

create table public.user_release_reads (
  user_id uuid not null
    references auth.users(id) on delete cascade,
  release_version text not null
    references public.app_releases(version) on update cascade on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, release_version)
);

create index app_releases_published_at_idx
  on public.app_releases (published_at desc)
  where is_published;

alter table public.app_releases enable row level security;
alter table public.app_release_notes enable row level security;
alter table public.user_release_reads enable row level security;

revoke all on table public.app_releases from anon, authenticated;
revoke all on table public.app_release_notes from anon, authenticated;
revoke all on table public.user_release_reads from anon, authenticated;

grant select on table public.app_releases to authenticated;
grant select on table public.app_release_notes to authenticated;
grant select, insert on table public.user_release_reads to authenticated;

create policy "Authenticated users can view published releases"
  on public.app_releases
  for select
  to authenticated
  using (is_published);

create policy "Authenticated users can view published release notes"
  on public.app_release_notes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.app_releases
      where app_releases.version = app_release_notes.release_version
        and app_releases.is_published
    )
  );

create policy "Users can view their own release reads"
  on public.user_release_reads
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can record their own release reads"
  on public.user_release_reads
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

insert into public.app_releases (version, title, published_at, is_published)
values
  ('2026.07.01', 'Mejoras de ejercicios y experiencia PWA', '2026-07-01 12:00:00-03', true),
  ('2026.07.29', 'Sesiones y rutinas mas flexibles', '2026-07-29 12:00:00-03', true);

insert into public.app_release_notes (release_version, position, title, description)
values
  (
    '2026.07.01',
    1,
    'Motor como biblioteca',
    'El acceso MOTOR ahora permite explorar ejercicios sin modificar rutinas por accidente.'
  ),
  (
    '2026.07.01',
    2,
    'Busqueda global de ejercicios',
    'Podes buscar ejercicios por nombre y ver a que grupo muscular pertenecen.'
  ),
  (
    '2026.07.01',
    3,
    'Series al fallo',
    'Las rutinas ya pueden incluir series al fallo y registrar las repeticiones reales al entrenar.'
  ),
  (
    '2026.07.01',
    4,
    'Peso corporal y perfil',
    'El perfil permite guardar altura y peso para ejercicios que usan peso corporal.'
  ),
  (
    '2026.07.01',
    5,
    'Mejoras PWA',
    'Se suavizaron transiciones y se mejoro la carga del selector muscular en mobile.'
  ),
  (
    '2026.07.29',
    1,
    'Ordena tus ejercicios',
    'Ahora podes cambiar el orden de los ejercicios arrastrandolos desde el asa lateral.'
  ),
  (
    '2026.07.29',
    2,
    'CORE opcional en cada sesion',
    'CORE queda disponible al elegir un dia, pero solo cuenta si realizas alguno de sus ejercicios.'
  ),
  (
    '2026.07.29',
    3,
    'Edicion de rutinas mas estable',
    'El orden de los ejercicios se conserva al editarlos y se mejoro el guardado de sus series.'
  );
