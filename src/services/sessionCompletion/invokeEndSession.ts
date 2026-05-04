import { supabase } from '../../lib/supabase/client';
import type { Json } from '../../lib/supabase/database.types';

type InvokeEndSessionInput = {
  sessionId: string;
  endedAt: string;
  sessionData: Json;
};

export async function invokeEndSession(input: InvokeEndSessionInput): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const { error } = await supabase.functions.invoke('end-session', {
    body: input,
  });

  if (error) {
    throw error;
  }
}
