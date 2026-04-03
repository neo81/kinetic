import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Edit2, Plus, Trash2 } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import type { Routine, View, Exercise } from '../types';

export const RoutineCreatorView = ({
  setView,
  onSave,
  currentRoutine,
  selectedRoutineDayId,
  onSelectRoutineDay,
  onDeleteRoutineDay,
  onSelectMuscle,
  onDeleteExercise,
  onEditExercise,
  navigationSource,
  setNavigationSource,
}: {
  setView: (v: View) => void;
  onSave: (r: Partial<Routine>, targetSelection?: { dayNum?: number | 'core' }, shouldSync?: boolean) => Promise<Routine | void> | void;
  currentRoutine: Routine | null;
  selectedRoutineDayId: string | null;
  onSelectRoutineDay: (dayId: string | null) => void;
  onDeleteRoutineDay: (dayId: string) => void;
  onSelectMuscle: (muscle: string) => void;
  onDeleteExercise: (exId: string) => void;
  onEditExercise: (ex: Exercise, instanceId?: string) => void;
  navigationSource?: View;
  setNavigationSource: (view: View) => void;
}) => {
  const [name, setName] = useState(currentRoutine?.name || '');
  
  const orderedDayEntries = [...(currentRoutine?.dayEntries ?? [])].sort((left, right) => left.position - right.position);
  const [localActiveDayNum, setLocalActiveDayNum] = useState<number | 'core' | null>(null);
  const activeDayEntry = orderedDayEntries.find(d => 
    (localActiveDayNum !== null && (
      (localActiveDayNum === 'core' && d.dayType === 'core') || 
      (typeof localActiveDayNum === 'number' && d.dayNumber === localActiveDayNum)
    )) ||
    (selectedRoutineDayId && d.id === selectedRoutineDayId)
  );

  const [errorMsg, setErrorMsg] = useState('');
  const [itemToTrash, setItemToTrash] = useState<{ type: 'day' | 'exercise'; id: string } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Sincronizar el número de día local con el ID seleccionado globalmente (para cuando volvemos del editor)
  useEffect(() => {
    if (selectedRoutineDayId && localActiveDayNum === null) {
      const active = orderedDayEntries.find(d => d.id === selectedRoutineDayId);
      if (active) {
        setLocalActiveDayNum(active.dayType === 'core' ? 'core' : active.dayNumber);
      }
    }
  }, [selectedRoutineDayId, localActiveDayNum, orderedDayEntries]);

  const handleGridSelect = (num: number | 'core') => {
    setLocalActiveDayNum(num);
    // Also try to find if this day already exists to sync the selectedRoutineDayId
    const existing = orderedDayEntries.find(d => 
      (num === 'core' && d.dayType === 'core') || 
      (typeof num === 'number' && d.dayNumber === num)
    );
    if (existing) {
      onSelectRoutineDay(existing.id);
    } else {
      onSelectRoutineDay(null);
    }
    // Solo limpiar errores de validación de días/ejercicios, no el de nombre si está vacío
    if (errorMsg.includes('día') || errorMsg.includes('ejercicio') || errorMsg.includes('CORE')) {
      setErrorMsg('');
    }
  };

  const handleAddExerciseClick = async () => {
    // If the day doesn't exist yet, we must save the routine structure first to get a dayId
    if (!activeDayEntry && localActiveDayNum !== null) {
      const currentDays = currentRoutine?.days || [];
      const currentFocus = currentRoutine?.focus || '';
      let newDays = [...currentDays];
      let newFocus = currentFocus;

      if (localActiveDayNum === 'core') {
        newFocus = 'Dia core';
      } else if (!newDays.includes(localActiveDayNum)) {
        newDays = [...newDays, localActiveDayNum].sort((a, b) => (a as any) - (b as any));
      }
      
      // We call onSave with shouldSync: false to initialize the day locally only
      await onSave({ name: name || 'Rutina sin nombre', days: newDays, focus: newFocus }, { dayNum: localActiveDayNum }, false);
    }

    // Navigation logic
    if (localActiveDayNum === 'core') {
      setNavigationSource('routine-creator');
      onSelectMuscle('core');
      setView('exercise-list');
    } else {
      setNavigationSource('routine-creator');
      setView('exercise-selector');
    }
  };

  const handleGlobalSave = () => {
    if (!name.trim()) {
      setErrorMsg('Ingresa un nombre para tu rutina');
      window.scrollTo(0, 0);
      return;
    }
    const totalExercises = orderedDayEntries.reduce((acc, day) => acc + (day.exercises ?? []).length, 0);
    
    if (totalExercises === 0) {
      setErrorMsg('Carga al menos un ejercicio para guardar tu rutina');
      const gridSection = document.getElementById('day-grid-section');
      if (gridSection) {
        gridSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setErrorMsg(''); // Limpiar cualquier error previo si todo está OK
    onSave({ name });
    
    // Si la rutina es nueva (no tiene ID o es primera vez), dashboard. Si es edición, volver al detalle.
    const isEditing = !!currentRoutine?.id;
    setView(isEditing ? (navigationSource === 'routine-detail' ? 'routine-detail' : 'dashboard') : 'dashboard');
  };

  return (
    <>
      <PageShell
        activeView="routine-creator"
        setView={setView}
        onProfileClick={() => setView('settings')}
        onSettingsClick={() => setView('settings')}
        contentClassName="max-w-md pb-32"
      >
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView(navigationSource === 'routine-detail' ? 'routine-detail' : 'dashboard')}
              className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
              <span className="text-[0.7rem] font-bold uppercase tracking-widest">Cancelar</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-headline text-[2.6rem] font-bold uppercase leading-tight tracking-tight text-on-surface">
                {currentRoutine ? 'Editar rutina' : 'Nueva rutina'}
              </h1>
              <div className="h-1.5 w-16 rounded-full bg-primary/80"></div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[0.62rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
              Nombre de la rutina
            </label>
            {errorMsg && !name.trim() && (
              <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[0.62rem] font-bold uppercase tracking-widest text-secondary">
                {errorMsg}
              </motion.p>
            )}
            <div className="group relative">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMsg('');
                }}
                className={`w-full rounded-[0.95rem] border bg-surface-container-highest px-4 py-4 text-base text-on-surface outline-none transition-all placeholder:text-on-surface-variant/45 focus:ring-2 focus:ring-primary/15 ${
                  errorMsg && !name.trim() ? 'border-secondary/50 focus:border-secondary' : 'border-transparent focus:border-primary/30'
                }`}
                placeholder="Ej. Hipertrofia A"
                type="text"
              />
              <div className={`absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-300 group-focus-within:w-full ${errorMsg && !name.trim() ? 'bg-secondary' : 'bg-primary'}`}></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[0.62rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                1. Selecciona el número de día
              </label>
              {errorMsg.includes('ejercicio') && (
                <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="text-[0.62rem] font-bold uppercase tracking-widest text-secondary">
                  ¡Añade al menos un ejercicio!
                </motion.span>
              )}
            </div>

            <div id="day-grid-section" className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                const isActive = localActiveDayNum === num;
                return (
                  <button
                    key={num}
                    onClick={() => handleGridSelect(num)}
                    className={`w-full aspect-square rounded-[0.95rem] px-2 py-3 transition-all active:scale-95 ${
                      isActive
                        ? 'bg-primary text-black shadow-[0_16px_32px_rgba(212,255,0,0.2)]'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="block text-[0.58rem] font-bold uppercase tracking-[0.08em] opacity-70">Dia</span>
                    <span className="mt-1 block font-headline text-[1.75rem] font-semibold leading-none">{num}</span>
                  </button>
                );
              })}
              
              <button
                onClick={() => handleGridSelect('core')}
                className={`w-full aspect-square rounded-[0.95rem] px-2 py-3 transition-all active:scale-95 ${
                  localActiveDayNum === 'core'
                    ? 'bg-primary text-black shadow-[0_16px_32px_rgba(212,255,0,0.2)]'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="block text-[0.58rem] font-bold uppercase tracking-[0.08em] opacity-70">Focus</span>
                <span className="mt-1 block font-headline text-[1.3rem] font-semibold leading-none text-center">CORE</span>
              </button>
            </div>
          </div>

          {orderedDayEntries.length > 0 && (
            <div className="space-y-4">
              <label className="block text-[0.62rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                Días de tu rutina
              </label>
              <div className="grid grid-cols-2 gap-3">
                {orderedDayEntries.map((day) => {
                  const isActive = activeDayEntry?.id === day.id;
                  return (
                    <div key={day.id} className="relative group">
                      <button
                        onClick={() => {
                          setLocalActiveDayNum(day.dayType === 'core' ? 'core' : day.dayNumber as number);
                          onSelectRoutineDay(day.id);
                        }}
                        className={`w-full rounded-[0.95rem] border px-4 py-4 text-left transition-all ${
                          isActive
                            ? 'border-secondary bg-secondary text-black active:scale-95 shadow-[0_16px_32px_rgba(255,145,0,0.22)] shadow-lg'
                            : 'border-primary bg-primary text-black hover:scale-[1.02] shadow-md'
                        }`}
                      >
                        <div className="text-[0.55rem] font-bold uppercase tracking-[0.16em] opacity-80">
                          {day.dayType === 'core' ? 'Core' : `Día ${day.dayNumber}`}
                        </div>
                        <div className="mt-1 font-headline text-[1.2rem] font-semibold uppercase leading-tight truncate">
                          {day.title}
                        </div>
                        <div className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] opacity-80">
                          {day.exercises.length} ejercicios
                        </div>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToTrash({ type: 'day', id: day.id });
                        }}
                        className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-xl opacity-0 transition-all hover:scale-110 group-hover:opacity-100"
                        title="Eliminar día"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {localActiveDayNum !== null && (
            <div className="space-y-6">
              <section className="rounded-[1.2rem] bg-surface-container-low/40 p-5 space-y-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="block text-[0.62rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                    Ejercicios de {localActiveDayNum === 'core' ? 'CORE' : `Día ${localActiveDayNum}`}
                  </label>
                  {activeDayEntry && (
                    <span className="text-[0.62rem] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 uppercase tracking-widest">
                      {(activeDayEntry.exercises ?? []).length} ejercicios
                    </span>
                  )}
                </div>

                <div id="active-day-exercises" className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {activeDayEntry && activeDayEntry.exercises.length > 0 ? (
                      activeDayEntry.exercises.map((item) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                          key={item.id} 
                          className="group relative flex items-center justify-between rounded-[1rem] border border-white/5 bg-surface-container-low/60 px-5 py-4 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:border-primary/20"
                        >
                          <div className="min-w-0 pr-4">
                            <div className="text-[0.9rem] font-bold text-on-surface truncate tracking-tight">{item.exercise.name}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {item.exercise.sets.length} Series
                              </span>
                              <span className="h-1 w-1 rounded-full bg-white/20"></span>
                              <span className="text-[0.65rem] font-medium text-on-surface-variant italic">
                                {item.exercise.muscle || item.exercise.muscleGroup}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditExercise(item.exercise);
                              }}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant transition-all hover:bg-primary hover:text-black active:scale-90"
                              title="Editar"
                            >
                              <Edit2 size={15} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToTrash({ type: 'exercise', id: item.id });
                              }}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant transition-all hover:bg-red-500 hover:text-white active:scale-90"
                              title="Eliminar"
                            >
                              <Trash2 size={15} strokeWidth={2.5} />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-[1rem] border border-dashed border-white/10 px-4 py-10 text-center"
                      >
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">
                          Todavía no hay ejercicios cargados
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleAddExerciseClick}
                  className={`w-full mt-2 rounded-[0.95rem] border border-dashed px-4 py-4 transition-all active:scale-[0.98] hover:bg-primary/10 group ${
                    errorMsg.includes('no tiene ejercicios') ? 'border-secondary bg-secondary/5' : 'border-primary/30 bg-primary/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plus size={16} className={`${errorMsg.includes('no tiene ejercicios') ? 'text-secondary' : 'text-primary'} transition-transform group-hover:rotate-90`} />
                    <span className={`text-[0.72rem] font-bold uppercase tracking-[0.16em] ${errorMsg.includes('no tiene ejercicios') ? 'text-secondary' : 'text-primary'}`}>
                      Añadir ejercicio a {localActiveDayNum === 'core' ? 'CORE' : `Día ${localActiveDayNum}`}
                    </span>
                  </div>
                </button>
                {errorMsg.includes('no tiene ejercicios') && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-secondary"
                  >
                    {errorMsg}
                  </motion.p>
                )}
              </section>
            </div>
          )}

          <div className="pt-8">
            <button
              onClick={handleGlobalSave}
              className="neon-button flex w-full items-center justify-center gap-3 rounded-[1.2rem] py-5 shadow-[0_20px_50px_rgba(212,255,0,0.25)] transition-all active:scale-[0.97]"
            >
              <span className="font-headline text-[1.1rem] font-bold uppercase tracking-[0.15em] text-black">
                Guardar Rutina
              </span>
              <ArrowRight size={20} strokeWidth={3} className="text-black" />
            </button>
          </div>
        </section>

        <ConfirmDialog
          isOpen={!!itemToTrash}
          title={itemToTrash?.type === 'day' ? "Eliminar Día" : "Eliminar Ejercicio"}
          message={itemToTrash?.type === 'day' 
            ? `¿Confirma que desea borrar este día y todos sus ejercicios?`
            : `¿Confirma que desea quitar este ejercicio del día?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            if (itemToTrash) {
              if (itemToTrash.type === 'day') onDeleteRoutineDay(itemToTrash.id);
              else onDeleteExercise(itemToTrash.id);
            }
            setItemToTrash(null);
          }}
          onCancel={() => setItemToTrash(null)}
        />
      </PageShell>
    </>
  );
};
