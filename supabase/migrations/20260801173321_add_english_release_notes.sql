alter table public.app_releases
  add column title_en text;

alter table public.app_release_notes
  add column title_en text,
  add column description_en text;

update public.app_releases
set title_en = case version
  when '2026.07.01' then 'Exercise and PWA improvements'
  when '2026.07.29' then 'More flexible sessions and routines'
  else title_en
end
where version in ('2026.07.01', '2026.07.29');

update public.app_release_notes
set
  title_en = case
    when release_version = '2026.07.01' and position = 1 then 'Engine as an exercise library'
    when release_version = '2026.07.01' and position = 2 then 'Global exercise search'
    when release_version = '2026.07.01' and position = 3 then 'Sets to failure'
    when release_version = '2026.07.01' and position = 4 then 'Body weight and profile'
    when release_version = '2026.07.01' and position = 5 then 'PWA improvements'
    when release_version = '2026.07.29' and position = 1 then 'Reorder your exercises'
    when release_version = '2026.07.29' and position = 2 then 'Optional CORE in every session'
    when release_version = '2026.07.29' and position = 3 then 'More reliable routine editing'
    else title_en
  end,
  description_en = case
    when release_version = '2026.07.01' and position = 1 then 'The ENGINE entry now lets you explore exercises without accidentally changing your routines.'
    when release_version = '2026.07.01' and position = 2 then 'You can search for exercises by name and see which muscle group they belong to.'
    when release_version = '2026.07.01' and position = 3 then 'Routines can now include sets to failure and record the actual repetitions completed during training.'
    when release_version = '2026.07.01' and position = 4 then 'Your profile can store height and weight for exercises that use body weight.'
    when release_version = '2026.07.01' and position = 5 then 'Transitions are smoother and the muscle selector loads better on mobile devices.'
    when release_version = '2026.07.29' and position = 1 then 'You can now change the exercise order by dragging exercises from the side handle.'
    when release_version = '2026.07.29' and position = 2 then 'CORE remains available after choosing a day, but it only counts when you complete at least one of its exercises.'
    when release_version = '2026.07.29' and position = 3 then 'Exercise order is preserved while editing, and saving configured sets is now more reliable.'
    else description_en
  end
where release_version in ('2026.07.01', '2026.07.29');

alter table public.app_releases
  add constraint app_releases_title_en_check
  check (title_en is null or length(btrim(title_en)) > 0);

alter table public.app_release_notes
  add constraint app_release_notes_title_en_check
    check (title_en is null or length(btrim(title_en)) > 0),
  add constraint app_release_notes_description_en_check
    check (description_en is null or length(btrim(description_en)) > 0);
