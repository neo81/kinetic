/**
 * Servicio opcional de logging remoto para diagnóstico de PWA
 * 
 * Envía logs de sincronización a un endpoint remoto para debugging
 * cuando no hay acceso a DevTools (iOS/Android PWA)
 */

import { supabase } from '../lib/supabase/client';

export interface RemoteLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: Record<string, unknown>;
  userAgent: string;
}

type AppLogInsert = {
  level: RemoteLog['level'];
  category: string;
  message: string;
  data?: Record<string, unknown>;
  user_agent: string;
  created_at: string;
};

type AppLogsClient = {
  from: (table: 'app_logs') => {
    insert: (rows: AppLogInsert[]) => Promise<{ error: { message?: string } | null }>;
  };
};

class RemoteLogger {
  private isEnabled = false;
  private batchLogs: RemoteLog[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 20;
  private readonly BATCH_INTERVAL_MS = 30000; // 30s

  /**
   * Enable remote logging (should be called once at app startup)
   */
  enable() {
    this.isEnabled = true;
    console.log('[RemoteLogger] Remote logging enabled');
    
    // Start batching interval
    this.batchInterval = setInterval(() => {
      this.flushLogs();
    }, this.BATCH_INTERVAL_MS);
  }

  /**
   * Disable remote logging
   */
  disable() {
    this.isEnabled = false;
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    this.flushLogs();
  }

  /**
   * Log an info message
   */
  info(category: string, message: string, data?: Record<string, unknown>) {
    this.addLog('info', category, message, data);
  }

  /**
   * Log a warning
   */
  warn(category: string, message: string, data?: Record<string, unknown>) {
    this.addLog('warn', category, message, data);
  }

  /**
   * Log an error
   */
  error(category: string, message: string, data?: Record<string, unknown>) {
    this.addLog('error', category, message, data);
  }

  /**
   * Add log to batch
   */
  private addLog(
    level: 'info' | 'warn' | 'error',
    category: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    if (!this.isEnabled) return;

    const log: RemoteLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      userAgent: navigator.userAgent,
    };

    this.batchLogs.push(log);

    // Flush if batch is full
    if (this.batchLogs.length >= this.BATCH_SIZE) {
      this.flushLogs();
    }
  }

  /**
   * Send batched logs to server
   */
  private async flushLogs() {
    if (!this.isEnabled || this.batchLogs.length === 0) return;

    const logsToSend = [...this.batchLogs];
    this.batchLogs = [];

    try {
      if (!supabase) return;

      // Insert logs into a logs table (create this table if needed)
      const appLogsClient = supabase as unknown as AppLogsClient;
      const { error } = await appLogsClient
        .from('app_logs')
        .insert(
          logsToSend.map(log => ({
            level: log.level,
            category: log.category,
            message: log.message,
            data: log.data,
            user_agent: log.userAgent,
            created_at: log.timestamp,
          }))
        );

      if (error) {
        console.error('[RemoteLogger] Error sending logs:', error);
        // Re-add logs to batch if failed (up to a limit)
        if (this.batchLogs.length < 100) {
          this.batchLogs.unshift(...logsToSend);
        }
      } else {
        console.log(`[RemoteLogger] Sent ${logsToSend.length} logs`);
      }
    } catch (err) {
      console.error('[RemoteLogger] Unexpected error:', err);
    }
  }
}

export const remoteLogger = new RemoteLogger();

// ============================================================================
// TABLA SQL REQUERIDA (ejecutar una sola vez)
// ============================================================================
/*
create table public.app_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  level text not null check (level in ('info', 'warn', 'error')),
  category text not null,
  message text not null,
  data jsonb,
  user_agent text,
  created_at timestamp with time zone not null,
  created_at_day date generated always as (created_at::date) stored
);

-- Enable RLS
alter table public.app_logs enable row level security;

-- Policy: Users can only view their own logs
create policy "Users can view own logs"
  on public.app_logs
  for select
  to authenticated
  using (user_id = auth.uid());

-- Policy: Authenticated users can insert their own logs
create policy "Users can insert own logs"
  on public.app_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Index for queries
create index idx_app_logs_user_created on public.app_logs(user_id, created_at desc);
*/
