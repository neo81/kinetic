-- Rate limiting support for authenticated Edge Functions.

CREATE TABLE IF NOT EXISTS public.function_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action, window_start)
);

ALTER TABLE public.function_rate_limits ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_function_rate_limits_updated_at ON public.function_rate_limits;
CREATE TRIGGER set_function_rate_limits_updated_at
BEFORE UPDATE ON public.function_rate_limits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL ON public.function_rate_limits FROM anon, authenticated;
