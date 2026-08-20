import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { motion } from 'motion/react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Activity, ChevronRight, Clock, TrendingUp, Trophy, ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-react';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { PageShell } from '../components/layout/PageShell';
import { formatSessionVolume } from '../utils/formatting';
import { routinesRepository } from '../features/routines/repository';
import type { Routine, View, DashboardData, UserProfile } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface DashboardViewProps {
  setView: (view: View) => void;
  routines: Routine[];
  currentRoutine: Routine | null;
  onNewRoutine: () => void;
  onEditRoutine: (routine: Routine) => void;
  onDeleteRoutine: (routineId: string) => void;
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
        <p className="theme-primary-text text-[9px] font-bold uppercase tracking-[0.1em]">{Math.round(percent)}%</p>
      </div>
      <div className="theme-muted-surface h-1.5 w-full overflow-hidden rounded-full">
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
  currentRoutine,
  onNewRoutine,
  onEditRoutine,
  onDeleteRoutine,
  setCurrentRoutine,
  profile,
}: DashboardViewProps) => {
  const { language, t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12
    ? t('dashboard.greetingMorning')
    : currentHour < 18
      ? t('dashboard.greetingAfternoon')
      : t('dashboard.greetingEvening');

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

  const lastActiveRoutine = currentRoutine ?? (routines.length > 0
    ? [...routines].sort((a, b) => {
        if (!a.lastSession && !b.lastSession) return 0;
        if (!a.lastSession) return 1;
        if (!b.lastSession) return -1;
        const dateA = new Date(a.lastSession.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.lastSession.split('/').reverse().join('-')).getTime();
        return dateB - dateA;
      })[0]
    : null);

  return (
    <PageShell
      activeView="dashboard"
      setView={setView}
      profile={profile}
    >
        <section className="space-y-10">
          <header className="space-y-3">
             <div className="flex items-center gap-3">
               <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">{greeting}</span>
             </div>
             <h1 className="font-headline text-[3.2rem] font-bold uppercase leading-none tracking-tight text-on-surface">{t('dashboard.title')}</h1>
          </header>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="theme-primary-indicator-glow h-6 w-1 rounded-full bg-primary"></div>
                <h3 className="text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('dashboard.nextStep')}</h3>
              </div>
              <button
                onClick={() => setView('routines-list')}
                className="theme-muted-surface theme-primary-text flex items-center gap-2 rounded-full py-1.5 pl-4 pr-2 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-primary/10 active:scale-95"
              >
                {t('dashboard.viewAll')}
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
                className="group theme-interactive-hover relative cursor-pointer overflow-hidden rounded-[3rem] border theme-hairline-border bg-surface-container-low/40 p-10 shadow-2xl backdrop-blur-xl transition-all active:scale-[0.985]"
              >
                <div className="absolute top-0 right-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-primary/10 opacity-0 blur-[100px] transition-opacity duration-700 group-hover:opacity-100"></div>

                <div className="relative z-10 space-y-8">
                  <div>
                    <div className="theme-primary-text-soft mb-2 text-[10px] font-black uppercase italic tracking-[0.5em]">{t('dashboard.continueWorkout')}</div>
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-headline text-4xl font-black uppercase italic leading-none tracking-tight text-on-background sm:text-5xl">
                        {lastActiveRoutine.name}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={t('dashboard.editRoutine')}
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditRoutine(lastActiveRoutine);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary/15 hover:text-on-surface"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={t('dashboard.deleteRoutine')}
                          onClick={(event) => {
                            event.stopPropagation();
                            setRoutineToDelete(lastActiveRoutine);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-secondary/15 hover:text-secondary"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] font-black uppercase italic tracking-widest text-on-surface-variant/40">
                      {t('dashboard.lastSession')}: {lastActiveRoutine.lastSession || t('dashboard.noRecords')} • {lastActiveRoutine.focus || t('routines.general')}
                    </p>
                  </div>

                  <button
                     className="theme-primary-shadow-strong flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-105 active:scale-95"
                  >
                    <Activity size={18} fill="currentColor" />
                    {t('dashboard.trainNow')}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-[3rem] border border-dashed theme-hairline-border bg-surface-container-low/35 p-12 text-center backdrop-blur-xl">
                <p className="font-headline text-2xl font-black uppercase italic text-on-surface opacity-40 leading-tight">{t('dashboard.noActiveRoutines')}</p>
                <p className="mt-3 text-sm text-on-surface-variant/60">{t('dashboard.noActiveRoutinesHint')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Main Performance Card - ESTA SEMANA */}
        <section className="group relative mt-14 overflow-hidden rounded-[3rem] border theme-hairline-border bg-surface-container-low/40 p-10 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-primary/5 opacity-0 blur-[100px] transition-opacity duration-700 group-hover:opacity-40"></div>

          <div className="relative z-10 space-y-10">
            <div className="space-y-2">
              <span className="theme-primary-text-soft block text-[9px] font-black uppercase italic tracking-[0.4em] sm:text-[10px]">{t('dashboard.weekPerformance')}</span>
              <h3 className="font-headline text-3xl font-black italic leading-none tracking-tighter text-on-background sm:text-4xl">
                {dashboardData ? formatSessionVolume(Math.round(dashboardData.thisWeek.volume), dashboardData.thisWeek.volumeMinutes, language) : t('common.loading')}
              </h3>
            </div>

            {dashboardData ? (
              <div className="space-y-8">
                {/* Primary Metric: VOLUMEN LEVANTADO */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-1 rounded-full bg-primary/60"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">{t('dashboard.volumeLifted')}</span>
                    </div>
                    <TrendIndicator change={dashboardData.thisWeek.changeVsLastWeek.volumeChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-black italic text-on-background tracking-tighter sm:text-4xl">
                        {dashboardData.thisWeek.volume > 0 ? `${Math.round(dashboardData.thisWeek.volume / 1000)}k` : '0'}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">{t('dashboard.kgThisWeek')}</p>
                    </div>
                    <div className="border-l theme-hairline-border pl-4">
                      <p className="theme-primary-text text-2xl font-black italic tracking-tighter">
                        {dashboardData.goals.weeklyVolumeTarget > 0 ? `${Math.round(dashboardData.goals.weeklyVolumeTarget / 1000)}k` : '0'}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">{t('dashboard.weeklyGoal')}</p>
                    </div>
                  </div>
                  <ProgressBar
                    current={dashboardData.thisWeek.volume}
                    target={dashboardData.goals.weeklyVolumeTarget}
                    label={t('dashboard.progress')}
                  />
                </div>

                {/* Secondary Metric: EJERCICIOS COMPLETADOS */}
                <div className="space-y-4 border-t theme-hairline-border pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-1 rounded-full bg-secondary/60"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">{t('dashboard.completedExercises')}</span>
                    </div>
                    <TrendIndicator change={dashboardData.thisWeek.changeVsLastWeek.exerciseChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-black italic text-on-background tracking-tighter sm:text-4xl">
                        {dashboardData.thisWeek.exercises}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">{t('dashboard.exercises7d')}</p>
                    </div>
                    <div className="border-l theme-hairline-border pl-4">
                      <p className="text-2xl font-black italic text-secondary tracking-tighter">
                        {dashboardData.goals.weeklyExercisesTarget}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">{t('dashboard.weeklyGoal')}</p>
                    </div>
                  </div>
                  <ProgressBar
                    current={dashboardData.thisWeek.exercises}
                    target={dashboardData.goals.weeklyExercisesTarget}
                    label={t('dashboard.progress')}
                  />
                </div>

                {/* Tertiary Metric: TIEMPO DE ENTRENAMIENTO */}
                <div className="space-y-4 border-t theme-hairline-border pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-1 rounded-full bg-primary/40"></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">{t('dashboard.trainingTime')}</span>
                    </div>
                    <TrendIndicator change={dashboardData.thisWeek.changeVsLastWeek.durationChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-black italic text-on-background tracking-tighter sm:text-4xl">
                        {Math.round(dashboardData.thisWeek.avgDuration)}m
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">{t('dashboard.averagePerSession')}</p>
                    </div>
                    <div className="border-l theme-hairline-border pl-4">
                      <p className="theme-primary-text text-2xl font-black italic tracking-tighter">
                        {dashboardData.goals.weeklyDurationTarget}m
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">{t('dashboard.weeklyGoal')}</p>
                    </div>
                  </div>
                  <ProgressBar
                    current={dashboardData.thisWeek.avgDuration * dashboardData.thisWeek.sessions}
                    target={dashboardData.goals.weeklyDurationTarget}
                    label={t('dashboard.progress')}
                  />
                </div>

                {/* Session count */}
                <div className="border-t theme-hairline-border pt-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                    {dashboardData.thisWeek.sessions} {t('dashboard.completedThisWeek')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="font-headline text-sm font-semibold uppercase text-on-surface-variant">{t('dashboard.loadingData')}</p>
              </div>
            )}
          </div>
        </section>

        <div className="pb-10" />
        <ConfirmDialog
          isOpen={!!routineToDelete}
          title={t('dashboard.deleteTitle')}
          message={t('dashboard.deleteMessage')}
          confirmText={t('dashboard.confirmDelete')}
          cancelText={t('dashboard.back')}
          variant="danger"
          onConfirm={() => {
            if (routineToDelete) {
              onDeleteRoutine(routineToDelete.id);
            }
            setRoutineToDelete(null);
          }}
          onCancel={() => setRoutineToDelete(null)}
        />
    </PageShell>
  );
};
