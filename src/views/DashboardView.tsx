import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { motion } from 'motion/react';
import { Activity, ChevronRight, Clock, TrendingUp, Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { PageShell } from '../components/layout/PageShell';
import { formatSessionVolume } from '../utils/formatting';
import { routinesRepository } from '../features/routines/repository';
import type { Routine, View, DashboardData, UserProfile } from '../types';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'BUENOS DIAS';
  if (hour < 18) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
};

interface DashboardViewProps {
  setView: (view: View) => void;
  routines: Routine[];
  onNewRoutine: () => void;
  setCurrentRoutine: (routine: Routine | null) => void;
  profile?: UserProfile | null;
}

const TrendIndicator = ({ change }: { change: number }) => {
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.1;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const color = isNeutral ? 'text-on-surface-variant/40' : isPositive ? 'text-primary' : 'text-secondary';

  if (isNeutral) return <span className="text-[10px] font-black uppercase text-on-surface-variant/40">-</span>;

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon size={12} />
      <span className="text-[10px] font-black">{Math.abs(change).toFixed(0)}%</span>
    </div>
  );
};

const ProgressBar = ({ current, target, label }: { current: number; target: number; label: string }) => {
  const percent = Math.min(100, (current / target) * 100);
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/60">{label}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary">{Math.round(percent)}%</p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export const DashboardView = ({
  setView,
  routines,
  onNewRoutine,
  setCurrentRoutine,
  profile,
}: DashboardViewProps) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchStats = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const data = await routinesRepository.getDashboardData(session.user.id);
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const lastActiveRoutine = routines.length > 0
    ? [...routines].sort((a, b) => {
        if (!a.lastSession && !b.lastSession) return 0;
        if (!a.lastSession) return 1;
        if (!b.lastSession) return -1;
        const dateA = new Date(a.lastSession.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.lastSession.split('/').reverse().join('-')).getTime();
        return dateB - dateA;
      })[0]
    : null;

  return (
    <PageShell
      activeView="dashboard"
      setView={setView}
      onProfileClick={() => setView('settings')}
      profile={profile}
    >
        <section className="space-y-10">
          <header className="space-y-3">
             <div className="flex items-center gap-3">
               <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">{getGreeting()}</span>
             </div>
             <h1 className="font-headline text-[3.2rem] font-bold uppercase leading-none tracking-tight text-on-surface">DASHBOARD</h1>
          </header>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary shadow-[0_0_10px_rgba(212,255,0,0.4)]"></div>
                <h3 className="text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">PRÓXIMO PASO</h3>
              </div>
              <button
                onClick={() => setView('routines-list')}
                className="flex items-center gap-2 rounded-full bg-white/5 py-1.5 pl-4 pr-2 text-[9px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/10 active:scale-95"
              >
                Ver todas
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-black">
                  <ChevronRight size={14} />
                </div>
              </button>
            </div>

            {lastActiveRoutine ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setCurrentRoutine(lastActiveRoutine);
                  setView('routine-detail');
                }}
                className="group relative cursor-pointer overflow-hidden rounded-[3rem] border border-white/5 bg-surface-container-low/40 p-10 shadow-2xl backdrop-blur-xl transition-all active:scale-[0.985] hover:bg-white/5"
              >
                <div className="absolute top-0 right-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-primary/10 opacity-0 blur-[100px] transition-opacity duration-700 group-hover:opacity-100"></div>

                <div className="relative z-10 space-y-8">
                  <div>
                    <div className="mb-2 text-[10px] font-black uppercase italic tracking-[0.5em] text-primary">CONTINUAR ENTRENAMIENTO</div>
                    <h4 className="font-headline text-4xl font-black uppercase italic leading-none tracking-tight text-on-background sm:text-5xl">
                      {lastActiveRoutine.name}
                    </h4>
                    <p className="mt-4 text-[11px] font-black uppercase italic tracking-widest text-on-surface-variant/40">
                      Última sesión: {lastActiveRoutine.lastSession || 'Sin registros aún'} • {lastActiveRoutine.focus || 'General'}
                    </p>
                  </div>

                  <button
                     className="flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] text-black shadow-[0_15px_30px_rgba(212,255,0,0.25)] transition-all hover:scale-105 active:scale-95"
                  >
                    <Activity size={18} fill="currentColor" />
                    Entrenar Ahora
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-[3rem] border border-dashed border-white/8 bg-surface-container-low/35 p-12 text-center backdrop-blur-xl">
                <p className="font-headline text-2xl font-black uppercase italic text-on-surface opacity-40 leading-tight">No tienes rutinas activas</p>
                <p className="mt-3 text-sm text-on-surface-variant/60">Carga tu primer plan de entrenamiento para empezar.</p>
              </div>
            )}
          </div>
        </section>

        {/* Main Performance Card - ESTA SEMANA */}
        <section className="mt-14 group relative overflow-hidden rounded-[3rem] border border-white/5 bg-surface-container-low/40 p-10 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-primary/5 opacity-0 blur-[100px] transition-opacity duration-700 group-hover:opacity-40"></div>

          <div className="relative z-10 space-y-10">
            <div className="space-y-2">
              <span className="block text-[9px] font-black uppercase italic tracking-[0.4em] text-primary sm:text-[10px]">ESTA SEMANA - TU RENDIMIENTO</span>
              <h3 className="font-headline text-3xl font-black italic leading-none tracking-tighter text-on-background sm:text-4xl">
                {dashboardData ? formatSessionVolume(Math.round(dashboardData.thisWeek.volume), dashboardData.thisWeek.volumeMinutes) : 'Cargando...'}
              </h3>
            </div>

            {dashboardData ? (
              <div className="space-y-8">
                {/* Primary Metric: VOLUMEN LEVANTADO */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-1 rounded-full bg-primary/60"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Volumen Levantado</span>
                    </div>
                    <TrendIndicator change={dashboardData.thisWeek.changeVsLastWeek.volumeChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-black italic text-on-background tracking-tighter sm:text-4xl">
                        {dashboardData.thisWeek.volume > 0 ? `${Math.round(dashboardData.thisWeek.volume / 1000)}k` : '0'}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">kg esta semana</p>
                    </div>
                    <div className="border-l border-white/5 pl-4">
                      <p className="text-2xl font-black italic text-primary tracking-tighter">
                        {dashboardData.goals.weeklyVolumeTarget > 0 ? `${Math.round(dashboardData.goals.weeklyVolumeTarget / 1000)}k` : '0'}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">meta semanal</p>
                    </div>
                  </div>
                  <ProgressBar
                    current={dashboardData.thisWeek.volume}
                    target={dashboardData.goals.weeklyVolumeTarget}
                    label="Progreso"
                  />
                </div>

                {/* Secondary Metric: EJERCICIOS COMPLETADOS */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-1 rounded-full bg-secondary/60"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Ejercicios Completados</span>
                    </div>
                    <TrendIndicator change={dashboardData.thisWeek.changeVsLastWeek.exerciseChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-black italic text-on-background tracking-tighter sm:text-4xl">
                        {dashboardData.thisWeek.exercises}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">ejercicios (7d)</p>
                    </div>
                    <div className="border-l border-white/5 pl-4">
                      <p className="text-2xl font-black italic text-secondary tracking-tighter">
                        {dashboardData.goals.weeklyExercisesTarget}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">meta semanal</p>
                    </div>
                  </div>
                  <ProgressBar
                    current={dashboardData.thisWeek.exercises}
                    target={dashboardData.goals.weeklyExercisesTarget}
                    label="Progreso"
                  />
                </div>

                {/* Tertiary Metric: TIEMPO DE ENTRENAMIENTO */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-1 rounded-full bg-primary/40"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Tiempo Entrenamiento</span>
                    </div>
                    <TrendIndicator change={dashboardData.thisWeek.changeVsLastWeek.durationChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-black italic text-on-background tracking-tighter sm:text-4xl">
                        {Math.round(dashboardData.thisWeek.avgDuration)}m
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">prom. por sesión</p>
                    </div>
                    <div className="border-l border-white/5 pl-4">
                      <p className="text-2xl font-black italic text-primary tracking-tighter">
                        {dashboardData.goals.weeklyDurationTarget}m
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">meta semanal</p>
                    </div>
                  </div>
                  <ProgressBar
                    current={dashboardData.thisWeek.avgDuration * dashboardData.thisWeek.sessions}
                    target={dashboardData.goals.weeklyDurationTarget}
                    label="Progreso"
                  />
                </div>

                {/* Session count */}
                <div className="border-t border-white/5 pt-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                    {dashboardData.thisWeek.sessions} sesiones completadas esta semana
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="font-headline text-sm font-semibold uppercase text-on-surface-variant">Cargando datos...</p>
              </div>
            )}
          </div>
        </section>

        <div className="pb-10" />
    </PageShell>
  );
};
