import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, ChevronRight, Edit2, Play, Plus, Trash2 } from 'lucide-react';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { PageShell } from '../components/layout/PageShell';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import type { Routine, View } from '../types';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'BUENOS DIAS';
  if (hour < 18) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
};

export const DashboardView = ({
  setView,
  routines,
  onNewRoutine,
  setCurrentRoutine,
  onDeleteRoutine,
}: {
  setView: (v: View) => void;
  routines: Routine[];
  onNewRoutine: () => void;
  setCurrentRoutine: (r: Routine | null) => void;
  onDeleteRoutine: (id: string) => void;
}) => {
  const [routineToTrash, setRoutineToTrash] = useState<Routine | null>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const totalExercises = routines.reduce((count, routine) => count + routine.exercises.length, 0);
  const weeklyLoad = routines.reduce(
    (total, routine) =>
      total +
      routine.exercises.reduce(
        (exerciseTotal, exercise) =>
          exerciseTotal +
          exercise.sets.reduce(
            (setsTotal, set) => setsTotal + set.weight * set.reps,
            0,
          ),
        0,
      ),
    0,
  );

  return (
    <PageShell
      activeView="dashboard"
      setView={setView}
      onProfileClick={() => setView('settings')}
      onSettingsClick={() => setView('settings')}
      contentClassName="space-y-12 sm:space-y-20"
    >
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(212,255,0,0.8)] animate-pulse"></div>
            <span className="font-sans text-[10px] font-black uppercase italic tracking-[0.5em] text-primary opacity-80 sm:text-[11px]">{getGreeting()}</span>
          </div>
          <h2 className="font-headline text-5xl font-black uppercase italic leading-none tracking-tighter text-on-background drop-shadow-[0_0_30px_rgba(212,255,0,0.2)] sm:text-8xl">
            BIENVENIDO
          </h2>
        </section>

        <section
          onClick={() => {
            onNewRoutine();
            setView('routine-creator');
          }}
          className="group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-[3rem] border border-primary/20 bg-primary p-10 shadow-[0_30px_70px_rgba(212,255,0,0.3)] transition-all active:scale-[0.98] hover:shadow-[0_40px_90px_rgba(212,255,0,0.4)]"
        >
          <div className="absolute top-0 right-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-black/5 blur-[100px] transition-all duration-700 group-hover:bg-black/10"></div>

          <div className="relative z-10 flex items-center gap-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-black text-primary shadow-2xl transition-transform duration-700 group-hover:scale-110">
              <Plus size={32} strokeWidth={3} />
            </div>
            <div className="text-left">
              <h3 className="font-headline text-3xl font-black uppercase italic leading-none tracking-tight text-black sm:text-4xl">NUEVA RUTINA</h3>
              <p className="mt-2 text-[9px] font-black uppercase italic tracking-[0.4em] text-black/40">INICIAR PROGRAMACION</p>
            </div>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/5 transition-colors group-hover:bg-black/10">
            <ChevronRight size={28} className="text-black/40 transition-transform duration-500 group-hover:translate-x-2" />
          </div>
        </section>

        <section className="group relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-surface-container-low/40 p-10 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/5 sm:p-14">
          <div className="mb-10 flex items-start justify-between sm:mb-14">
            <div className="space-y-4">
              <span className="block text-[9px] font-black uppercase italic tracking-[0.4em] text-secondary sm:text-[10px]">VOLUMEN ESTA SEMANA</span>
              <div className="flex items-baseline gap-3">
                <span className="font-headline text-5xl font-black italic leading-none tracking-tighter text-on-background drop-shadow-[0_0_30px_rgba(255,92,0,0.2)] sm:text-8xl">
                  {Math.round(weeklyLoad)}
                </span>
                <span className="text-[11px] font-black uppercase italic tracking-widest text-on-surface-variant/40 sm:text-[12px]">
                  {weeklyLoad > 0 ? 'KILOS' : 'SIN DATOS'}
                </span>
              </div>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/5 bg-secondary/10 text-secondary shadow-inner transition-transform duration-700 group-hover:scale-110 sm:h-20 sm:w-20">
              <Activity size={28} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex h-32 items-end justify-between gap-3 sm:h-48 sm:gap-5">
            {[0, 0, 0, 0, 0, 0, 0].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-4 sm:gap-6">
                <div className="relative w-full rounded-t-2xl bg-white/5 transition-all duration-1000 hover:bg-white/10" style={{ height: `${Math.max(h * 100, 12)}%` }}>
                </div>
                <span className="text-[8px] font-black uppercase italic tracking-[0.2em] text-on-surface-variant/30 sm:text-[9px]">{['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'][i]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-10">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-5">
              <div className="h-8 w-1.5 rounded-full bg-primary shadow-[0_0_15px_rgba(212,255,0,0.5)]"></div>
              <h3 className="font-headline text-[12px] font-black uppercase italic tracking-[0.5em] text-on-background">RUTINAS ACTIVAS</h3>
            </div>
            <button className="group flex items-center gap-3 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/40 transition-colors hover:text-primary">
              VER TODO
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="space-y-8">
            {routines.length === 0 && (
              <div className="rounded-[3rem] border border-dashed border-white/8 bg-surface-container-low/35 p-10 text-center shadow-2xl backdrop-blur-xl">
                <p className="font-headline text-3xl font-semibold uppercase text-on-surface">Sin rutinas cargadas</p>
                <p className="mt-3 text-sm text-on-surface-variant">
                  Crea tu primera rutina para empezar a registrar ejercicios y volumen real.
                </p>
                <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                  {totalExercises} ejercicios registrados
                </div>
              </div>
            )}
            {routines.map((routine, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={routine.id}
                onClick={() => {
                  setCurrentRoutine(routine);
                  setView('routine-detail');
                }}
                className="group relative cursor-pointer overflow-hidden rounded-[3rem] border border-white/5 bg-surface-container-low/40 p-10 shadow-2xl backdrop-blur-xl transition-all active:scale-[0.98] hover:bg-white/5"
              >
                <div className="absolute top-0 right-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-primary/5 opacity-0 blur-[100px] transition-opacity duration-700 group-hover:opacity-100"></div>

                <div className="relative z-10 flex items-start justify-between">
                  <div className="space-y-8">
                    <div>
                      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="min-w-0 font-headline text-4xl font-black uppercase italic leading-none tracking-tight text-on-background transition-colors group-hover:text-primary sm:text-5xl">
                          {routine.name}
                        </h4>
                        {routine.syncPending ? <RoutineSyncPendingBadge /> : null}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary/20 shadow-inner"></div>
                        <span className="text-[11px] font-black uppercase italic tracking-widest text-on-surface-variant/40">{routine.frequency}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-12 sm:gap-20">
                      <div className="flex flex-col">
                        <span className="mb-2 text-[9px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/30">ULTIMA SESION</span>
                        <span className="text-[12px] font-black uppercase tracking-widest text-on-surface">{routine.lastSession}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="mb-2 text-[9px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/30">ENFOQUE</span>
                        <span className="text-[12px] font-black uppercase italic tracking-widest text-primary">{routine.focus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/5 bg-white/5 shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary group-hover:text-black">
                    <Play size={28} fill="currentColor" className="ml-1" />
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-end gap-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100 relative z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentRoutine(routine);
                      setView('routine-creator');
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-on-surface transition-all hover:bg-primary hover:text-black active:scale-90"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoutineToTrash(routine);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-on-surface-variant transition-all hover:bg-red-500 hover:text-white active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <ConfirmDialog
          isOpen={!!routineToTrash}
          title="Eliminar rutina"
          message={`¿Estás seguro de que quieres eliminar la rutina "${routineToTrash?.name}" permanentemente? Perderás todos tus registros y progresos asociados a ella.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            if (routineToTrash) {
              onDeleteRoutine(routineToTrash.id);
            }
            setRoutineToTrash(null);
          }}
          onCancel={() => setRoutineToTrash(null)}
        />
    </PageShell>
  );
};
