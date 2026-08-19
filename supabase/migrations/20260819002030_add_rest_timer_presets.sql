alter table public.user_preferences
  add column rest_timer_presets_seconds integer[] not null default '{}'::integer[];

alter table public.user_preferences
  add constraint user_preferences_rest_timer_presets_seconds_check
  check (
    cardinality(rest_timer_presets_seconds) <= 8
    and 5 <= all(rest_timer_presets_seconds)
    and 3599 >= all(rest_timer_presets_seconds)
  );

comment on column public.user_preferences.rest_timer_presets_seconds is
  'Ordered custom rest timer presets in seconds. Empty by default; maximum 8 values.';
