import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';

const RATE_LIMIT_ACTION = 'end_session';
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_RETENTION_HOURS = 24;

type EndSessionPayload = {
  sessionId: string;
  endedAt: string;
  sessionData: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(origin),
      'Content-Type': 'application/json',
    },
  });
}

function getSupabaseEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

Deno.serve(async req => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: buildCorsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401, origin);
  }

  let payload: EndSessionPayload;
  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  if (!payload.sessionId || !payload.endedAt || !payload.sessionData) {
    return jsonResponse({ error: 'Missing required session payload fields' }, 400, origin);
  }

  try {
    const supabaseUrl = getSupabaseEnv('SUPABASE_URL');
    const supabaseAnonKey = getSupabaseEnv('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = getSupabaseEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401, origin);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const currentWindowStart = new Date(
      Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS,
    ).toISOString();

    const {
      data: existingLimit,
      error: existingLimitError,
    } = await supabaseAdmin
      .from('function_rate_limits')
      .select('request_count')
      .eq('user_id', user.id)
      .eq('action', RATE_LIMIT_ACTION)
      .eq('window_start', currentWindowStart)
      .maybeSingle();

    if (existingLimitError) {
      console.error('[end-session] Failed to read rate limit bucket', existingLimitError);
      return jsonResponse({ error: 'Rate limit check failed' }, 500, origin);
    }

    const nextRequestCount = (existingLimit?.request_count ?? 0) + 1;
    if (nextRequestCount > RATE_LIMIT_MAX_REQUESTS) {
      return jsonResponse(
        {
          error: 'Rate limit exceeded',
          retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
        },
        429,
        origin,
      );
    }

    const { error: upsertLimitError } = await supabaseAdmin
      .from('function_rate_limits')
      .upsert(
        {
          user_id: user.id,
          action: RATE_LIMIT_ACTION,
          window_start: currentWindowStart,
          request_count: nextRequestCount,
        },
        {
          onConflict: 'user_id,action,window_start',
        },
      );

    if (upsertLimitError) {
      console.error('[end-session] Failed to update rate limit bucket', upsertLimitError);
      return jsonResponse({ error: 'Rate limit update failed' }, 500, origin);
    }

    const retentionCutoff = new Date(
      Date.now() - RATE_LIMIT_RETENTION_HOURS * 60 * 60 * 1000,
    ).toISOString();
    supabaseAdmin
      .from('function_rate_limits')
      .delete()
      .eq('user_id', user.id)
      .eq('action', RATE_LIMIT_ACTION)
      .lt('window_start', retentionCutoff)
      .then(({ error }) => {
        if (error) {
          console.warn('[end-session] Failed to prune old rate limit buckets', error);
        }
      });

    const { error: rpcError } = await supabaseUser.rpc('end_session_transaction', {
      p_session_id: payload.sessionId,
      p_ended_at: payload.endedAt,
      p_session_data: payload.sessionData,
    });

    if (rpcError) {
      console.error('[end-session] RPC failed', rpcError);
      return jsonResponse(
        {
          error: rpcError.message,
          code: rpcError.code ?? null,
        },
        rpcError.code === '42501' ? 403 : 400,
        origin,
      );
    }

    return jsonResponse(
      {
        success: true,
        rateLimit: {
          limit: RATE_LIMIT_MAX_REQUESTS,
          remaining: RATE_LIMIT_MAX_REQUESTS - nextRequestCount,
          windowSeconds: RATE_LIMIT_WINDOW_MS / 1000,
        },
      },
      200,
      origin,
    );
  } catch (error) {
    console.error('[end-session] Unexpected error', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      500,
      origin,
    );
  }
});
