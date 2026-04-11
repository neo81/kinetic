import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Search, Loader2, Star, User, Edit2 } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import type { Exercise, View } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { fallbackExerciseLibrary } from '../app/initialData';

type ExerciseLibraryItem = Exercise & {
  type?: string;
  pr?: string;
  img?: string;
  equipment?: string;
  isCustom?: boolean;
};

const getPlaceholderImage = (group: string) => {
  const g = group.toLowerCase();
  const backMuscles = ['trapecio', 'triceps', 'dorsales', 'lumbares', 'gluteos'];
  const legMuscles = ['isquiotibiales', 'pantorrillas', 'cuadriceps', 'abductores', 'aductores'];
  
  if (backMuscles.includes(g)) return '/exercise-placeholder-back.png';
  if (legMuscles.includes(g)) return '/exercise-placeholder-legs.png';
  return '/exercise-placeholder.png';
};

export const ExerciseListView = ({
  setView,
  muscle,
  onSelectExercise,
}: {
  setView: (v: View) => void;
  muscle: string;
  onSelectExercise: (e: Exercise) => void;
}) => {
  const [filter, setFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [allExercises, setAllExercises] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [newExName, setNewExName] = useState('');
  const [newExEq, setNewExEq] = useState('Peso corporal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase no está configurado. Usando biblioteca de respaldo.');
      const fallback = fallbackExerciseLibrary
        .filter(ex => ex.muscleGroupCode === muscle.toLowerCase())
        .map(ex => ({
          ...ex,
          muscleGroup: ex.muscleGroup || muscle,
          notes: '',
        }));
      setAllExercises(fallback);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          equipment,
          description,
          muscle_group_id,
          user_id,
          muscle_groups!inner(code, name)
        `)
        .eq('muscle_groups.code', muscle.toLowerCase());

      if (error) throw error;

      if (data) {
        const mapped: ExerciseLibraryItem[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          muscleGroup: item.muscle_groups?.name || muscle,
          equipment: item.equipment || 'No especificado',
          description: item.description,
          notes: '',
          sets: [],
          isCustom: !!item.user_id,
        }));
        setAllExercises(mapped);
      }
    } catch (err) {
      console.error('Error al descargar ejercicios:', err);
      // Fallback on error too
      const fallback = fallbackExerciseLibrary
        .filter(ex => ex.muscleGroupCode === muscle.toLowerCase())
        .map(ex => ({ ...ex, muscleGroup: ex.muscleGroup || muscle, notes: '' }));
      setAllExercises(fallback);
    } finally {
      setLoading(false);
    }
  }, [muscle]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchExercises();
  }, [fetchExercises]);

  const handleSaveExercise = async () => {
    if (!newExName.trim() || !supabase) return;
    setIsSubmitting(true);
    try {
      if (editingExerciseId) {
        const { error } = await supabase.from('exercises').update({
          name: newExName.trim(),
          equipment: newExEq,
        }).eq('id', editingExerciseId);
        if (error) throw error;
        
        setNewExName('');
        setNewExEq('Peso corporal');
        setEditingExerciseId(null);
        setIsCreating(false);
        fetchExercises();
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No hay usuario autenticado');
          return;
        }
        
        const { data: mgData } = await supabase.from('muscle_groups').select('id').eq('code', muscle.toLowerCase()).single();
        if (mgData?.id) {
          const { error } = await supabase.from('exercises').insert({
            name: newExName.trim(),
            equipment: newExEq,
            muscle_group_id: mgData.id,
            user_id: user.id
          });
          if (error) throw error;
          
          setNewExName('');
          setNewExEq('Peso corporal');
          setEditingExerciseId(null);
          setIsCreating(false);
          fetchExercises();
        }
      }
    } catch (err) {
      console.error('Error al guardar ejercicio:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (ex: ExerciseLibraryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreating(true);
    setEditingExerciseId(ex.id);
    setNewExName(ex.name);
    setNewExEq(ex.equipment || 'Peso corporal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const startCreate = () => {
    setIsCreating(true);
    setEditingExerciseId(null);
    setNewExName('');
    setNewExEq('Peso corporal');
  };

  const filteredExercises = allExercises.filter(
    (exercise) =>
      (filter === 'Todos' || (exercise.equipment && exercise.equipment.toLowerCase().includes(filter.toLowerCase()))) &&
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <PageShell
      activeView="exercise-selector"
      setView={setView}
      onProfileClick={() => setView('settings')}
      onSettingsClick={() => setView('settings')}
      contentClassName="space-y-10 sm:space-y-16"
    >
      <section>
        <div className="mb-3 flex items-center gap-4">
          <button
            onClick={() => setView('exercise-selector')}
            className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-primary shadow-xl transition-all hover:bg-primary/10 active:scale-90"
          >
            <ArrowLeft size={20} strokeWidth={3} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <div className="flex flex-col flex-1">
            <span className="block text-[9px] font-black uppercase tracking-[0.4em] text-primary opacity-80 sm:text-[10px]">
              BIBLIOTECA DE MOVIMIENTOS
            </span>
            <div className="flex justify-between items-end w-full pr-2">
              <h2 className="kinetic-gradient-text font-headline text-4xl font-black uppercase italic leading-none tracking-tighter drop-shadow-[0_0_30px_rgba(212,255,0,0.2)] sm:text-7xl">
                {muscle || 'Sin grupo'}
              </h2>
              <button 
                onClick={startCreate}
                className="text-[0.7rem] sm:text-xs font-black uppercase tracking-widest text-[#FF6B00] hover:scale-105 transition-transform"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-10">
        {!isSupabaseConfigured && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-6 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/5">
                <Loader2 size={24} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-headline text-[0.8rem] font-black uppercase tracking-[0.25em] text-primary">Modo Respaldo Activo</p>
                <p className="mt-1 text-[0.7rem] font-medium leading-relaxed text-on-surface-variant/80">
                  Supabase no está configurado en Vercel. Se está cargando la biblioteca de ejercicios local. 
                  <span className="block mt-1 text-primary/60 italic font-bold">Las rutinas nuevas no se sincronizarán en la nube.</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-8 flex items-center text-primary transition-transform group-focus-within:scale-110">
            <Search size={22} strokeWidth={3} />
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[2.5rem] border border-white/5 bg-white/5 py-7 pl-18 pr-8 font-headline text-sm font-black uppercase tracking-[0.2em] text-on-surface shadow-2xl backdrop-blur-xl transition-all placeholder:text-on-surface-variant/20 focus:ring-2 focus:ring-primary/30"
            placeholder="Buscar movimiento..."
            type="text"
          />
        </div>

        <div className="no-scrollbar -mx-6 flex gap-4 overflow-x-auto px-6 pb-6 sm:mx-0 sm:px-0">
          {['Todos', 'Barra', 'Mancuerna', 'Maquina', 'Peso corporal', 'Cable'].map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(tag)}
              className={`whitespace-nowrap rounded-[2rem] border-2 px-10 py-5 text-[11px] font-black uppercase italic tracking-widest transition-all ${
                filter === tag
                  ? 'scale-105 border-primary bg-primary text-black shadow-xl shadow-primary/20'
                  : 'border-white/5 bg-white/5 text-on-surface-variant/40 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-24 opacity-70">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p className="text-[11px] font-black uppercase italic tracking-[0.3em] text-primary">
              Cargando biblioteca...
            </p>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="rounded-[4rem] border-2 border-dashed border-white/5 bg-white/5 py-24 text-center opacity-70 backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <Search size={32} className="text-on-surface-variant/20" />
            </div>
            <p className="text-[11px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant/40">
              No hay ejercicios cargados para este grupo muscular.
            </p>
          </div>
        ) : isCreating ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2rem] border border-white/10 bg-surface-container-high p-6 shadow-2xl">
            <h3 className="mb-4 font-headline text-xl font-black uppercase italic tracking-widest text-on-surface">
              {editingExerciseId ? 'Editar Ejercicio' : 'Crear Nuevo'}
            </h3>
            <div className="space-y-4">
              <div className="flex w-full appearance-none rounded-xl border border-white/5 bg-black/40 px-5 py-4 text-sm text-on-surface opacity-70">
                <span className="mr-2 self-center text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Grupo:</span>
                <span className="font-black uppercase text-primary">{muscle}</span>
              </div>
              <input
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                placeholder="Nombre del ejercicio"
                className="w-full rounded-xl border border-white/5 bg-black/40 px-5 py-4 text-sm text-on-surface outline-none focus:border-primary/50"
              />
              <select
                value={newExEq}
                onChange={(e) => setNewExEq(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/5 bg-black/40 px-5 py-4 text-sm text-on-surface outline-none focus:border-primary/50"
              >
                <option value="Peso corporal">Peso corporal</option>
                <option value="Barra">Barra</option>
                <option value="Mancuerna">Mancuerna</option>
                <option value="Maquina">Máquina</option>
                <option value="Cable">Cable / Polea</option>
              </select>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setIsCreating(false); setEditingExerciseId(null); }}
                  className="flex-1 rounded-xl bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveExercise}
                  disabled={isSubmitting || !newExName.trim()}
                  className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {filteredExercises.map((exercise, index) => (
              <motion.button
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
                key={exercise.id}
                onClick={() => onSelectExercise(exercise)}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.2rem] border border-white/5 bg-surface-container-low transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] active:scale-95 text-left"
              >
                <div className="relative flex w-full aspect-[4/3] items-center justify-center bg-white p-2">
                  <Star size={16} className="absolute right-3 top-3 text-black/20 group-hover:text-[#FF6B00] transition-colors" />
                  <img src={getPlaceholderImage(muscle)} alt="Ejercicio" className="h-[90%] w-[90%] object-contain mix-blend-multiply opacity-90" />
                </div>
                <div className="flex w-full flex-col p-4 bg-[#141414]">
                  <div className="flex items-start justify-between">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-on-surface group-hover:text-primary transition-colors pr-2">
                      {exercise.name}
                    </h3>
                    {exercise.isCustom && (
                      <div className="flex flex-col items-end gap-1.5 ml-2">
                        <div className="flex shrink-0 items-center justify-center rounded bg-primary/20 px-1.5 py-0.5 border border-primary/30">
                          <User size={10} strokeWidth={3} className="text-primary mr-1" />
                          <span className="text-[8px] font-black uppercase text-primary tracking-wider">Custom</span>
                        </div>
                        <button 
                          onClick={(e) => startEdit(exercise, e)}
                          className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors bg-white/5 px-2 py-1 rounded"
                        >
                          <Edit2 size={10} strokeWidth={2.5} />
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                  {exercise.equipment && (
                    <span className="mt-1 text-[10px] font-medium tracking-wide text-on-surface-variant/60">
                      ({exercise.equipment})
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};
