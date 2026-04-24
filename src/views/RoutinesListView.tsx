import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Edit2, Play, Plus, Trash2 } from 'lucide-react';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { PageShell } from '../components/layout/PageShell';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import type { Routine, View, UserProfile } from '../types';

interface RoutinesListViewProps {
  setView: (view: View) => void;
  routines: Routine[];
  onNewRoutine: () => void;
  setCurrentRoutine: (routine: Routine | null) => void;
  onDeleteRoutine: (routineId: string) => void;
  profile?: UserProfile | null;
}

export const RoutinesListView = ({
  setView,
  routines,
  onNewRoutine,
  setCurrentRoutine,
  onDeleteRoutine,
  profile,
}: RoutinesListViewProps) => {
  const [routineToTrash, setRoutineToTrash] = useState<Routine | null>(null);

  const totalExercises = routines.reduce((count, routine) => count + (routine.exercises?.length || 0), 0);

  return (
    <PageShell
      activeView="routines-list"
      setView={setView}
      onProfileClick={() => setView('settings')}
      onSettingsClick={() => setView('settings')}
      profile={profile}
    >
      <div className="space-y-10 pb-32">
        {/* Botón Volver Estándar */}
        <section>
          <button 
            onClick={() => setView('dashboard')} 
            className="flex items-center gap-3 text-on-surface-variant transition-colors hover:text-primary group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-all group-hover:bg-primary/20">
              <ArrowLeft size={16} strokeWidth={2.5} />
            </div>
            <span className="font-headline text-[0.72rem] font-black uppercase italic tracking-[0.22em]">Volver al panel</span>
          </button>
        </section>

        {/* Título y Cabecera de Contenido */}
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">GESTIÓN DE PLANES</span>
          </div>
          <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-on-surface">MIS RUTINAS</h1>
        </header>

        {/* Botón Crear Rutina Explícito */}
        <section>
          <button
            onClick={onNewRoutine}
            className="flex w-full items-center justify-center gap-4 rounded-[2rem] bg-primary p-6 text-black shadow-[0_20px_40px_rgba(212,255,0,0.15)] transition-all hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/10 transition-transform group-hover:rotate-90">
              <Plus size={24} strokeWidth={3} />
            </div>
            <span className="font-headline text-xl font-black uppercase italic tracking-wider">Crear Nueva Rutina</span>
          </button>
        </section>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-6 w-1 rounded-full bg-primary/40 shadow-[0_0_10px_rgba(212,255,0,0.2)]"></div>
            <h3 className="text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">BIBLIOTECA ACTIVA</h3>
          </div>

          {routines.length === 0 ? (
            <div className="rounded-[3rem] border border-dashed border-white/8 bg-surface-container-low/35 p-12 text-center backdrop-blur-xl">
              <p className="font-headline text-2xl font-black uppercase italic text-on-surface opacity-40 leading-tight">Sin rutinas cargadas</p>
              <p className="mt-3 text-sm text-on-surface-variant/60">Usa el botón superior para crear tu primer plan de entrenamiento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {routines.map((routine, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={routine.id}
                  onClick={() => {
                    setCurrentRoutine(routine);
                    setView('routine-detail');
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/5 bg-surface-container-low/40 p-8 shadow-2xl backdrop-blur-xl transition-all active:scale-[0.985] hover:bg-white/5"
                >
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-6">
                      <div>
                        <div className="mb-3 flex items-center gap-3">
                          <h4 className="min-w-0 truncate font-headline text-3xl font-black uppercase italic leading-none tracking-tight text-on-background transition-colors group-hover:text-primary sm:text-4xl">
                            {routine.name}
                          </h4>
                          {routine.syncPending && <RoutineSyncPendingBadge />}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/40"></div>
                          <span className="text-[10px] font-black uppercase italic tracking-widest text-on-surface-variant/40">{routine.frequency}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                          <span className="mb-1 text-[8px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant/20">ULTIMA</span>
                          <span className="text-[11px] font-black uppercase text-on-surface">{routine.lastSession || '-- / --'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="mb-1 text-[8px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant/20">ENFOQUE</span>
                          <span className="text-[11px] font-black uppercase italic text-primary">{routine.focus || 'GENERAL'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/5 shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:border-primary group-hover:bg-primary group-hover:text-black">
                      <Play size={24} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                  
                  <div className="mt-8 flex items-center justify-end gap-2 relative z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentRoutine(routine);
                        setView('routine-creator');
                      }}
                      className="flex h-10 px-4 items-center justify-center gap-2 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:bg-primary hover:text-black active:scale-90"
                    >
                      <Edit2 size={14} />
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoutineToTrash(routine);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-on-surface-variant transition-all hover:bg-red-500/20 hover:text-red-500 active:scale-90"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-8 text-center opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant">
            {totalExercises} ejercicios en total • {routines.length} rutinas activas
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!routineToTrash}
        title="Eliminar rutina"
        message={`¿Estás seguro de que quieres eliminar la rutina "${routineToTrash?.name}" permanentemente? Se perderá todo el historial.`}
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
