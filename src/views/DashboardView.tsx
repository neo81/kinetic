import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { motion } from 'motion/react';
import { Activity, ChevronRight, Clock, Edit2, Play, Plus, Trash2, TrendingUp, Trophy } from 'lucide-react';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { PageShell } from '../components/layout/PageShell';
import type { Routine, View } from '../types';

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
}

export const DashboardView = ({
  setView,
  routines,
  onNewRoutine,
  setCurrentRoutine,
}: DashboardViewProps) => {
  const [realWeeklyActivity, setRealWeeklyActivity] = useState(0);
  const [realWeeklyVolume, setRealWeeklyVolume] = useState(0);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);
  const [weeklyAvgDuration, setWeeklyAvgDuration] = useState(0);
  const [dailyActivityMap, setDailyActivityMap] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchStats = async () => {
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('routine_sessions')
        .select(`
          id,
          started_at,
          ended_at,
          status,
          session_day_logs(
            session_exercise_logs(
              session_set_logs(reps, weight)
            )
          )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false });

      if (data && !error) {
        const sessions = data as any[];
        const days = [0, 0, 0, 0, 0, 0, 0];
        let totalExercises = 0;
        let totalVolume = 0;
        let totalDuration = 0;
        let completedSessionsCount = 0;
        
        const weekSessions = sessions.filter(s => new Date(s.ended_at) >= oneWeekAgo);
        
        weekSessions.forEach(sess => {
          const date = new Date(sess.ended_at);
          const dayIndex = (date.getDay() + 6) % 7; 
          
          let sessExerCount = 0;
          let sessVolume = 0;
          
          sess.session_day_logs?.forEach((dl: any) => {
             const exLogs = dl.session_exercise_logs || [];
             sessExerCount += exLogs.length;
             exLogs.forEach((el: any) => {
               (el.session_set_logs || []).forEach((sl: any) => {
                 sessVolume += (Number(sl.reps) || 0) * (Number(sl.weight) || 0);
               });
             });
          });
          
          days[dayIndex] += sessExerCount;
          totalExercises += sessExerCount;
          totalVolume += sessVolume;

          if (sess.started_at && sess.ended_at) {
            const duration = (new Date(sess.ended_at).getTime() - new Date(sess.started_at).getTime()) / (1000 * 60);
            totalDuration += duration;
            completedSessionsCount++;
          }
        });

        const max = Math.max(...days, 1);
        setDailyActivityMap(days.map(d => d / max));
        setRealWeeklyActivity(totalExercises);
        setRealWeeklyVolume(totalVolume);
        setWeeklyAvgDuration(completedSessionsCount > 0 ? Math.round(totalDuration / completedSessionsCount) : 0);

        if (sessions.length > 0) {
           const lastSess = sessions[0];
           if (lastSess.started_at && lastSess.ended_at) {
             const duration = (new Date(lastSess.ended_at).getTime() - new Date(lastSess.started_at).getTime()) / (1000 * 60);
             setLastSessionDuration(Math.round(duration));
           }
        }
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
                    <Play size={18} fill="currentColor" />
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

        <section className="mt-14 group relative overflow-hidden rounded-[3rem] border border-white/5 bg-surface-container-low/40 p-10 shadow-2xl backdrop-blur-xl">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-8 sm:gap-12">
            <div className="flex gap-10 sm:gap-16">
              <div className="space-y-2">
                <span className="block text-[9px] font-black uppercase italic tracking-[0.4em] text-primary sm:text-[10px]">ACTIVIDAD RECIENTE</span>
                <div className="flex items-baseline gap-3">
                  <span className="font-headline text-3xl font-black italic leading-none tracking-tighter text-on-background drop-shadow-[0_0_30px_rgba(212,255,0,0.2)] sm:text-4xl" id="recent-activity-count">
                    {realWeeklyActivity}
                  </span>
                  <span className="text-[11px] font-black uppercase italic tracking-widest text-on-surface-variant/40 sm:text-[12px]">
                    {realWeeklyActivity > 0 ? 'EJERCICIOS' : 'SIN DATOS'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="block text-[9px] font-black uppercase italic tracking-[0.4em] text-primary sm:text-[10px]">VOLUMEN REAL (7D)</span>
                <div className="flex items-baseline gap-3">
                  <span className="font-headline text-3xl font-black italic leading-none tracking-tighter text-on-background drop-shadow-[0_0_30px_rgba(212,255,0,0.2)] sm:text-4xl">
                    {Math.round(realWeeklyVolume / 1000)}k
                  </span>
                  <span className="text-[11px] font-black uppercase italic tracking-widest text-on-surface-variant/40 sm:text-[12px]">
                    Kgs
                  </span>
                </div>
              </div>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/5 bg-secondary/10 text-secondary shadow-inner transition-transform duration-700 group-hover:scale-110 sm:h-20 sm:w-20">
              <Activity size={28} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex h-32 items-end justify-between gap-3 sm:h-48 sm:gap-5">
            {dailyActivityMap.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-4 sm:gap-6">
                <div className="relative w-full rounded-t-2xl bg-white/5 transition-all duration-1000 hover:bg-white/10" style={{ height: `${Math.max(h * 100, 15)}%` }}>
                  {h > 0 && <div className="absolute inset-x-0 bottom-0 top-0 rounded-t-2xl bg-primary/60 shadow-[0_0_20px_rgba(212,255,0,0.3)] animate-pulse" />}
                </div>
                <span className="text-[8px] font-black uppercase italic tracking-[0.2em] text-on-surface-variant/30 sm:text-[9px]">{['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'][i]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 pb-10">
           <div className="group relative overflow-hidden rounded-[2.5rem] bg-surface-container-low/40 border border-white/5 p-8 backdrop-blur-xl transition-all hover:bg-white/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-6 w-1 rounded-full bg-primary shadow-[0_0_10px_rgba(212,255,0,0.4)]"></div>
                <h3 className="text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">DURACIÓN DE SESIÓN</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div>
                  <p className="text-2xl font-black italic text-on-background tracking-tighter">
                    {lastSessionDuration}m
                  </p>
                  <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest text-nowrap">ÚLTIMA SESIÓN</p>
                </div>
                <div className="border-l border-white/5 pl-4">
                  <p className="text-2xl font-black italic text-primary tracking-tighter">
                    {weeklyAvgDuration}m
                  </p>
                  <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest text-nowrap">PROM. SEMANAL</p>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 text-primary">
                <Clock size={80} />
              </div>
           </div>

           <div className="group relative overflow-hidden rounded-[2.5rem] bg-surface-container-low/40 border border-white/5 p-8 backdrop-blur-xl transition-all hover:bg-white/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-6 w-1 rounded-full bg-secondary shadow-[0_0_10px_rgba(255,107,0,0.4)]"></div>
                <h3 className="text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">TEN. VOLUMEN</h3>
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black italic text-on-background tracking-tighter">
                      {realWeeklyVolume > 0 ? `+${Math.round(realWeeklyVolume / 1000)}k` : '0'}
                    </p>
                    <TrendingUp size={16} className="text-secondary mb-1" />
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest tracking-widest">KGS TRABAJADOS</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <Activity size={24} />
                </div>
              </div>
           </div>
           
           <div className="group relative overflow-hidden rounded-[2.5rem] bg-surface-container-low/40 border border-white/5 p-8 backdrop-blur-xl transition-all hover:bg-white/5 sm:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-6 w-1 rounded-full bg-primary shadow-[0_0_10px_rgba(212,255,0,0.4)]"></div>
                <h3 className="text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">CAPACIDAD DE TRABAJO</h3>
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-8">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-black italic text-on-background tracking-tighter">{realWeeklyActivity}</p>
                      <Trophy size={16} className="text-primary mb-1" />
                    </div>
                    <p className="text-[10px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">EJERCICIOS COMPLETADOS (7D)</p>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Trophy size={20} />
                </div>
              </div>
           </div>
        </section>
    </PageShell>
  );
};
