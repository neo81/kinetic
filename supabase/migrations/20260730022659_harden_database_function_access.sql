-- Use a fixed, empty search path. Every relation referenced by these
-- functions is already schema-qualified, while pg_catalog remains available
-- implicitly for built-in functions.
alter function public.set_updated_at()
  set search_path = '';

alter function public.create_user_preferences()
  set search_path = '';

alter function public.handle_new_user()
  set search_path = '';

alter function public.end_session_transaction(uuid, timestamptz, jsonb)
  set search_path = '';

alter function public.import_routine(text, text, jsonb)
  set search_path = '';

-- Trigger functions are internal implementation details and must not be
-- callable through the Data API.
revoke execute on function public.set_updated_at()
  from public, anon, authenticated;

revoke execute on function public.create_user_preferences()
  from public, anon, authenticated;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

-- Session completion is the only SECURITY DEFINER RPC still required by the
-- application. It performs its own auth.uid() ownership validation.
revoke execute on function public.end_session_transaction(uuid, timestamptz, jsonb)
  from public, anon;

grant execute on function public.end_session_transaction(uuid, timestamptz, jsonb)
  to authenticated, service_role;

-- Routine imports are now persisted through normal RLS-protected table
-- operations, so the legacy SECURITY DEFINER RPC is no longer exposed.
revoke execute on function public.import_routine(text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.import_routine(text, text, jsonb)
  to service_role;
