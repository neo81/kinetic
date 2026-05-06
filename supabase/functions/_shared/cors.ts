const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function getAllowedOrigins(): string[] {
  const configured = Deno.env.get('ALLOWED_ORIGINS');
  if (!configured) {
    return defaultAllowedOrigins;
  }

  return configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

export function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigins = getAllowedOrigins();

  // If ALLOWED_ORIGINS is explicitly configured, enforce it.
  // If not configured (dev/default mode), reflect request origin to avoid
  // iOS PWA standalone CORS mismatches.
  const hasExplicitAllowedOrigins = !!Deno.env.get('ALLOWED_ORIGINS');
  const isAllowedOrigin = !!origin && allowedOrigins.includes(origin);

  let allowOrigin: string;
  if (hasExplicitAllowedOrigins) {
    if (!origin) {
      // iOS standalone/PWA can send a null origin in some contexts.
      allowOrigin = '*';
    } else {
      // For unknown origins in strict mode, keep a safe fallback (first configured).
      allowOrigin = isAllowedOrigin ? origin : allowedOrigins[0];
    }
  } else {
    // Dev/fallback mode: reflect origin when available; otherwise allow all.
    allowOrigin = origin ?? '*';
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
