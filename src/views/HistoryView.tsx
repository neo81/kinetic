import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase/client';
import { PageShell } from '../components/layout/PageShell';
import { routinesRepository } from '../features/routines/repository';
import type { View, CompletedSession, UserProfile } from '../types';
import { formatSessionDate, formatSessionDuration, formatSessionVolume } from '../utils/formatting';

export const HistoryView = ({ setView, profile }: { setView: (v: View) => void; profile?: UserProfile | null }) => {
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const completedSessions = await routinesRepository.getCompletedSessions(session.user.id);
      setSessions(completedSessions);
    } catch (err) {
      console.error('Error loading completed sessions:', err);
      setError('No se pudo cargar el historial. Intenta de nuevo.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <PageShell
      activeView="history"
      setView={setView}
      onProfileClick={() => setView('settings')}
      onSettingsClick={() => setView('settings')}
      profile={profile}
      contentClassName=""
    >
      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">REGISTRO DE ACTIVIDAD</span>
        </div>
        <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-on-surface">
          HISTORIAL
        </h1>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-6 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 animate-spin">
            <History size={32} className="text-primary/60" />
          </div>
          <p className="font-headline text-sm font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Cargando historial...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center space-y-6 py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-secondary/40 bg-secondary/5">
            <History size={40} className="text-secondary/70" />
          </div>
          <div className="text-center space-y-3">
            <p className="font-headline text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
              {error}
            </p>
            <button
              onClick={loadSessions}
              className="inline-flex items-center gap-2 rounded-[0.8rem] border border-secondary/40 px-4 py-2 text-sm font-bold uppercase tracking-[0.15em] text-secondary transition-colors hover:bg-secondary/10"
            >
              <RotateCcw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center space-y-6 py-20 opacity-50">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-on-surface-variant">
            <History size={40} />
          </div>
          <p className="font-headline text-sm font-black uppercase italic tracking-[0.3em]">
            SIN REGISTROS DISPONIBLES
          </p>
          <p className="text-center text-xs text-on-surface-variant max-w-xs">
            Completa tu primer entrenamiento para ver tu historial aquí
          </p>
        </div>
      )}

      {/* Sessions List */}
      {!loading && !error && sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {sessions.map((session, idx) => (
            <motion.button
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              onClick={() => {
                // Stub for future detail view
                console.log('Session detail:', session);
              }}
              className="w-full rounded-[1.2rem] border theme-hairline-border bg-surface-container-high p-4 text-left transition-all hover:border-outline hover:bg-surface-container-high/80 active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.75rem] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                    {formatSessionDate(session.endedAt)}
                  </p>
                  <h3 className="font-headline text-[1.1rem] font-semibold uppercase text-on-surface mt-1 truncate">
                    {session.routineName}
                  </h3>
                </div>
              </div>

              <p className="text-[0.8rem] font-bold uppercase tracking-[0.12em] text-primary mb-3">
                {session.dayInfo}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[0.7rem] bg-surface-container p-2 text-center">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                    Duración
                  </p>
                  <p className="font-headline text-[0.95rem] font-semibold text-on-surface">
                    {formatSessionDuration(session.startedAt.getTime(), session.endedAt.getTime())}
                  </p>
                </div>
                <div className="rounded-[0.7rem] bg-surface-container p-2 text-center">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                    Volumen
                  </p>
                  <p className="font-headline text-[0.95rem] font-semibold text-secondary">
                    {formatSessionVolume(session.totalVolumeWeight, session.totalVolumeMinutes)}
                  </p>
                </div>
                <div className="rounded-[0.7rem] bg-surface-container p-2 text-center">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                    Ejercicios
                  </p>
                  <p className="font-headline text-[0.95rem] font-semibold text-on-surface">
                    {session.exerciseCount}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </PageShell>
  );
};
