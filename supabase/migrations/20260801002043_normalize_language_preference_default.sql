alter table public.user_preferences
  drop constraint user_preferences_language_check;

update public.user_preferences
set language = 'es-419',
    updated_at = now()
where language = 'es';

alter table public.user_preferences
  add constraint user_preferences_language_check
  check (language in ('es-419', 'en'));

alter table public.user_preferences
  alter column language set default 'es-419';

create or replace function public.create_user_preferences()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.user_preferences (user_id, theme, language)
  values (new.id, 'dark', 'es-419');
  return new;
end;
$$;
