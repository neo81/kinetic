-- The Edge Function now uses end_session_transaction_service as service_role.
-- Remove the authenticated SECURITY DEFINER endpoint so it can no longer be
-- called directly through the Data API.
drop function if exists public.end_session_transaction(
  uuid,
  timestamptz,
  jsonb
);
