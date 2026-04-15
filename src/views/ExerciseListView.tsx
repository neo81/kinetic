import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Search, Loader2, Star, User, Edit2, Trash2,
  SlidersHorizontal, X, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import type { Exercise, ExerciseEquipmentFilter, ExerciseFilter, ExerciseSourceFilter, View } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { fallbackExerciseLibrary } from '../app/initialData';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExerciseLibraryItem = Exercise & {
  type?: string;
  pr?: string;
  img?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPlaceholderImage = (group: string) => {
  const g = group.toLowerCase();
  const backMuscles = ['trapecio', 'triceps', 'dorsales', 'lumbares', 'gluteos'];
  const legMuscles = ['isquiotibiales', 'pantorrillas', 'cuadriceps', 'abductores', 'aductores'];
  if (backMuscles.includes(g)) return '/exercise-placeholder-back.png';
  if (legMuscles.includes(g)) return '/exercise-placeholder-legs.png';
  return '/exercise-placeholder.png';
};

const EQUIPMENT_OPTIONS: ExerciseEquipmentFilter[] = [
  'Todos', 'Barra', 'Mancuerna', 'Maquina', 'Peso corporal', 'Cable',
];
const DEFAULT_FILTER: ExerciseFilter = {
  equipment: 'Todos',
  source: 'todos',
  onlyFavorites: false,
};

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────

const DeleteConfirmModal = ({
  exerciseName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  exerciseName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm px-4 pb-8"
    onClick={onCancel}
  >
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-surface-container-high p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <AlertTriangle size={22} strokeWidth={2.5} />
      </div>
      <h3 className="mb-1 font-headline text-lg font-black uppercase tracking-tight text-on-surface">
        Eliminar ejercicio
      </h3>
      <p className="mb-6 text-sm font-medium leading-relaxed text-on-surface-variant">
        ¿Eliminar <span className="font-bold text-on-surface">"{exerciseName}"</span>? Esta acción no se puede deshacer.
        Las rutinas que usen este ejercicio no se verán afectadas.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-white/10 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex-1 rounded-xl bg-red-500/80 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Filter Panel ──────────────────────────────────────────────────────────────

const FilterPanel = ({
  filters,
  onChange,
  resultCount,
}: {
  filters: ExerciseFilter;
  onChange: (f: ExerciseFilter) => void;
  resultCount: number;
}) => {
  const [open, setOpen] = useState(false);

  const hasActiveFilters =
    filters.equipment !== 'Todos' ||
    filters.source !== 'todos' ||
    filters.onlyFavorites;

  const activeCount = [
    filters.equipment !== 'Todos',
    filters.source !== 'todos',
    filters.onlyFavorites,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Toggle button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
            hasActiveFilters
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-white/10 bg-white/5 text-on-surface-variant hover:border-white/20'
          }`}
        >
          <SlidersHorizontal size={13} strokeWidth={2.5} />
          Filtros
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-black">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2.5}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
          {resultCount} resultado{resultCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Expandable panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5 space-y-5 backdrop-blur-sm">

              {/* Equipamiento */}
              <div>
                <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">
                  Equipamiento
                </p>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onChange({ ...filters, equipment: opt })}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                        filters.equipment === opt
                          ? 'border-primary bg-primary text-black shadow-md'
                          : 'border-white/10 bg-white/5 text-on-surface-variant hover:border-white/20'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuente */}
              <div>
                <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">
                  Fuente
                </p>
                <div className="flex gap-2">
                  {([
                    { val: 'todos', label: 'Todos' },
                    { val: 'global', label: 'Catálogo' },
                    { val: 'custom', label: 'Mis ejercicios' },
                  ] as { val: ExerciseSourceFilter; label: string }[]).map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => onChange({ ...filters, source: val })}
                      className={`flex-1 rounded-xl border py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                        filters.source === val
                          ? 'border-primary bg-primary text-black'
                          : 'border-white/10 bg-white/5 text-on-surface-variant hover:border-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Solo favoritos */}
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                  Solo favoritos
                </p>
                <button
                  onClick={() => onChange({ ...filters, onlyFavorites: !filters.onlyFavorites })}
                  className={`flex h-7 w-12 items-center rounded-full border px-1 transition-all ${
                    filters.onlyFavorites
                      ? 'border-primary bg-primary justify-end'
                      : 'border-white/10 bg-white/10 justify-start'
                  }`}
                >
                  <span className={`h-5 w-5 rounded-full shadow transition-all ${
                    filters.onlyFavorites ? 'bg-black' : 'bg-on-surface-variant/40'
                  }`} />
                </button>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  onClick={() => onChange(DEFAULT_FILTER)}
                  className="flex w-full items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 hover:text-primary transition-colors"
                >
                  <X size={11} strokeWidth={3} />
                  Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Exercise Card ─────────────────────────────────────────────────────────────

type ExerciseCardProps = {
  exercise: ExerciseLibraryItem;
  muscle: string;
  index: number;
  onSelect: (e: Exercise) => void;
  onEdit: (e: ExerciseLibraryItem, ev: React.MouseEvent) => void;
  onToggleFavorite: (e: ExerciseLibraryItem) => void | Promise<void>;
  onDeleteRequest: (e: ExerciseLibraryItem) => void;
  isTogglingFavorite: boolean;
};

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  muscle,
  index,
  onSelect,
  onEdit,
  onToggleFavorite,
  onDeleteRequest,
  isTogglingFavorite,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04, type: 'spring', stiffness: 100 }}
    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.2rem] border border-white/5 bg-surface-container-low transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
  >
    {/* Image area */}
    <div
      className="relative flex w-full aspect-[4/3] items-center justify-center bg-white p-2"
      onClick={() => onSelect(exercise)}
    >
      {/* Favorite button */}
      <button
        className={`absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border transition-all active:scale-90 ${
          exercise.isFavorite
            ? 'border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF6B00]'
            : 'border-black/10 bg-black/5 text-black/20 hover:text-[#FF6B00]'
        } ${isTogglingFavorite ? 'pointer-events-none opacity-50' : ''}`}
        onClick={(ev) => { ev.stopPropagation(); onToggleFavorite(exercise); }}
        title={exercise.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Star
          size={13}
          strokeWidth={2.5}
          fill={exercise.isFavorite ? 'currentColor' : 'none'}
        />
      </button>
      <img
        src={getPlaceholderImage(muscle)}
        alt="Ejercicio"
        className="h-[90%] w-[90%] object-contain mix-blend-multiply opacity-90"
      />
    </div>

    {/* Info area */}
    <div
      className="flex w-full flex-col p-4 bg-[#141414]"
      onClick={() => onSelect(exercise)}
    >
      <div className="flex items-start justify-between">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-on-surface group-hover:text-primary transition-colors pr-2">
          {exercise.name}
        </h3>
        {exercise.isCustom && (
          <div className="flex shrink-0 items-center justify-center rounded bg-primary/20 px-1.5 py-0.5 border border-primary/30 ml-2">
            <User size={10} strokeWidth={3} className="text-primary mr-1" />
            <span className="text-[8px] font-black uppercase text-primary tracking-wider">Custom</span>
          </div>
        )}
      </div>
      {exercise.equipment && (
        <span className="mt-1 text-[10px] font-medium tracking-wide text-on-surface-variant/60">
          ({exercise.equipment})
        </span>
      )}
    </div>

    {/* Custom exercise actions */}
    {exercise.isCustom && (
      <div className="flex border-t border-white/5 bg-[#0f0f0f]">
        <button
          onClick={(ev) => onEdit(exercise, ev)}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[9px] font-black uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors border-r border-white/5"
        >
          <Edit2 size={10} strokeWidth={2.5} />
          Editar
        </button>
        <button
          onClick={(ev) => { ev.stopPropagation(); onDeleteRequest(exercise); }}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[9px] font-black uppercase tracking-wider text-on-surface-variant hover:text-red-400 transition-colors"
        >
          <Trash2 size={10} strokeWidth={2.5} />
          Eliminar
        </button>
      </div>
    )}
  </motion.div>
);

// ─── Create / Edit Form ────────────────────────────────────────────────────────

const ExerciseForm = ({
  muscle,
  editingId,
  initialName,
  initialEquipment,
  onSave,
  onCancel,
  isSubmitting,
  nameError,
}: {
  muscle: string;
  editingId: string | null;
  initialName: string;
  initialEquipment: string;
  onSave: (name: string, equipment: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  nameError: string;
}) => {
  const [name, setName] = useState(initialName);
  const [equipment, setEquipment] = useState(initialEquipment);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSave = name.trim().length >= 3 && name.trim().length <= 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-[2rem] border border-white/10 bg-surface-container-high p-6 shadow-2xl"
    >
      <h3 className="mb-4 font-headline text-xl font-black uppercase italic tracking-widest text-on-surface">
        {editingId ? 'Editar Ejercicio' : 'Crear Nuevo'}
      </h3>
      <div className="space-y-3">
        {/* Grupo muscular (readonly) */}
        <div className="flex w-full rounded-xl border border-white/5 bg-black/40 px-5 py-4 text-sm text-on-surface opacity-70">
          <span className="mr-2 self-center text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Grupo:</span>
          <span className="font-black uppercase text-primary">{muscle}</span>
        </div>

        {/* Nombre */}
        <div>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del ejercicio (mín. 3 caracteres)"
            maxLength={60}
            className={`w-full rounded-xl border bg-black/40 px-5 py-4 text-sm text-on-surface outline-none transition-colors focus:border-primary/50 ${
              nameError ? 'border-red-500/60' : 'border-white/5'
            }`}
          />
          <div className="mt-1 flex justify-between px-1">
            {nameError ? (
              <span className="text-[10px] text-red-400 font-medium">{nameError}</span>
            ) : (
              <span />
            )}
            <span className={`text-[10px] font-medium ${name.length > 55 ? 'text-[#FF6B00]' : 'text-on-surface-variant/30'}`}>
              {name.length}/60
            </span>
          </div>
        </div>

        {/* Equipamiento */}
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/5 bg-black/40 px-5 py-4 text-sm text-on-surface outline-none focus:border-primary/50"
        >
          <option value="Peso corporal">Peso corporal</option>
          <option value="Barra">Barra</option>
          <option value="Mancuerna">Mancuerna</option>
          <option value="Maquina">Máquina</option>
          <option value="Cable">Cable / Polea</option>
        </select>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(name.trim(), equipment)}
            disabled={isSubmitting || !canSave}
            className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const ExerciseListView = ({
  setView,
  muscle,
  onSelectExercise,
}: {
  setView: (v: View) => void;
  muscle: string;
  onSelectExercise: (e: Exercise) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ExerciseFilter>(DEFAULT_FILTER);
  const [allExercises, setAllExercises] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit form state
  const [isCreating, setIsCreating] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingInitialName, setEditingInitialName] = useState('');
  const [editingInitialEq, setEditingInitialEq] = useState('Peso corporal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');

  // Delete state
  const [deletingExercise, setDeletingExercise] = useState<ExerciseLibraryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Favorite toggling
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchExercises = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      const fallback = fallbackExerciseLibrary
        .filter((ex) => ex.muscleGroupCode === muscle.toLowerCase())
        .map((ex) => ({ ...ex, muscleGroup: ex.muscleGroup || muscle, notes: '' }));
      setAllExercises(fallback);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch exercises for this muscle group
      const { data: exData, error: exError } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          equipment,
          description,
          muscle_group_id,
          user_id,
          is_active,
          muscle_groups!inner(code, name)
        `)
        .eq('muscle_groups.code', muscle.toLowerCase())
        .eq('is_active', true);

      if (exError) throw exError;

      // 2. Fetch user's favorites for this batch
      let favoriteIds = new Set<string>();
      if (user && exData && exData.length > 0) {
        const ids = exData.map((e: any) => e.id);
        const { data: favData } = await (supabase.from('exercise_favorites') as any)
          .select('exercise_id')
          .eq('user_id', user.id)
          .in('exercise_id', ids);
        if (favData) {
          favoriteIds = new Set((favData as any[]).map((f: any) => f.exercise_id));
        }
      }

      // 3. Map to local shape
      const mapped: ExerciseLibraryItem[] = (exData ?? []).map((item: any) => ({
        id: item.id,
        name: item.name,
        muscleGroup: item.muscle_groups?.name || muscle,
        equipment: item.equipment || 'No especificado',
        description: item.description,
        notes: '',
        sets: [],
        isCustom: !!item.user_id,
        isFavorite: favoriteIds.has(item.id),
      }));

      // Sort: favorites first, then custom, then global
      mapped.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        if (a.isCustom && !b.isCustom) return -1;
        if (!a.isCustom && b.isCustom) return 1;
        return a.name.localeCompare(b.name);
      });

      setAllExercises(mapped);
    } catch (err) {
      console.error('Error al cargar ejercicios:', err);
      const fallback = fallbackExerciseLibrary
        .filter((ex) => ex.muscleGroupCode === muscle.toLowerCase())
        .map((ex) => ({ ...ex, muscleGroup: ex.muscleGroup || muscle, notes: '' }));
      setAllExercises(fallback);
    } finally {
      setLoading(false);
    }
  }, [muscle]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchExercises();
  }, [fetchExercises]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredExercises = allExercises.filter((ex) => {
    if (searchQuery && !ex.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filters.equipment !== 'Todos' && !(ex.equipment ?? '').toLowerCase().includes(filters.equipment.toLowerCase())) return false;
    if (filters.source === 'global' && ex.isCustom) return false;
    if (filters.source === 'custom' && !ex.isCustom) return false;
    if (filters.onlyFavorites && !ex.isFavorite) return false;
    return true;
  });

  // ── Toggle Favorite ────────────────────────────────────────────────────────

  const handleToggleFavorite = async (exercise: ExerciseLibraryItem) => {
    if (!supabase) return;
    setTogglingFavoriteId(exercise.id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setTogglingFavoriteId(null); return; }

    // Optimistic update
    setAllExercises((prev) =>
      prev.map((ex) => ex.id === exercise.id ? { ...ex, isFavorite: !ex.isFavorite } : ex)
    );

    try {
      if (exercise.isFavorite) {
        await supabase
          .from('exercise_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exercise.id);
      } else {
        await (supabase.from('exercise_favorites') as any).insert({
          user_id: user.id,
          exercise_id: exercise.id,
        });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert on failure
      setAllExercises((prev) =>
        prev.map((ex) => ex.id === exercise.id ? { ...ex, isFavorite: exercise.isFavorite } : ex)
      );
    } finally {
      setTogglingFavoriteId(null);
    }
  };

  // ── Create / Edit ──────────────────────────────────────────────────────────

  const startCreate = () => {
    setIsCreating(true);
    setEditingExerciseId(null);
    setEditingInitialName('');
    setEditingInitialEq('Peso corporal');
    setNameError('');
  };

  const startEdit = (ex: ExerciseLibraryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreating(true);
    setEditingExerciseId(ex.id);
    setEditingInitialName(ex.name);
    setEditingInitialEq(ex.equipment || 'Peso corporal');
    setNameError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveExercise = async (name: string, equipment: string) => {
    if (!supabase) return;
    setIsSubmitting(true);
    setNameError('');

    try {
      if (editingExerciseId) {
        // Check for duplicate name (exclude self)
        const { data: dup } = await supabase
          .from('exercises')
          .select('id')
          .ilike('name', name)
          .neq('id', editingExerciseId)
          .eq('is_active', true)
          .maybeSingle();

        if (dup) {
          setNameError('Ya existe un ejercicio con ese nombre.');
          return;
        }

        const { error } = await supabase.from('exercises').update({ name, equipment }).eq('id', editingExerciseId);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check for duplicate name
        const { data: dup } = await supabase
          .from('exercises')
          .select('id')
          .ilike('name', name)
          .eq('is_active', true)
          .maybeSingle();

        if (dup) {
          setNameError('Ya existe un ejercicio con ese nombre.');
          return;
        }

        const { data: mgData } = await supabase
          .from('muscle_groups')
          .select('id')
          .eq('code', muscle.toLowerCase())
          .single();

        if (!mgData?.id) throw new Error('Grupo muscular no encontrado.');

        const { error } = await supabase.from('exercises').insert({
          name,
          equipment,
          muscle_group_id: mgData.id,
          user_id: user.id,
        });
        if (error) throw error;
      }

      setIsCreating(false);
      setEditingExerciseId(null);
      await fetchExercises();
    } catch (err) {
      console.error('Error guardando ejercicio:', err);
      setNameError('Ocurrió un error. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Soft Delete ────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    if (!deletingExercise || !supabase) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('exercises')
        .update({ is_active: false })
        .eq('id', deletingExercise.id);

      if (error) throw error;

      // Remove from local state immediately
      setAllExercises((prev) => prev.filter((ex) => ex.id !== deletingExercise.id));
      setDeletingExercise(null);
    } catch (err) {
      console.error('Error eliminando ejercicio:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deletingExercise && (
          <DeleteConfirmModal
            exerciseName={deletingExercise.name}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeletingExercise(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      <PageShell
        activeView="exercise-selector"
        setView={setView}
        onProfileClick={() => setView('settings')}
        onSettingsClick={() => setView('settings')}
        contentClassName="space-y-6 sm:space-y-10"
      >
        {/* Header */}
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
                  + Crear
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Create / Edit form */}
        <AnimatePresence>
          {isCreating && (
            <ExerciseForm
              muscle={muscle}
              editingId={editingExerciseId}
              initialName={editingInitialName}
              initialEquipment={editingInitialEq}
              onSave={handleSaveExercise}
              onCancel={() => { setIsCreating(false); setEditingExerciseId(null); setNameError(''); }}
              isSubmitting={isSubmitting}
              nameError={nameError}
            />
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center text-primary transition-transform group-focus-within:scale-110">
            <Search size={20} strokeWidth={3} />
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[2.5rem] border border-white/5 bg-white/5 py-5 pl-14 pr-6 font-headline text-sm font-black uppercase tracking-[0.2em] text-on-surface shadow-2xl backdrop-blur-xl transition-all placeholder:text-on-surface-variant/20 focus:ring-2 focus:ring-primary/30"
            placeholder="Buscar movimiento..."
            type="text"
          />
          {searchQuery && (
            <button
              className="absolute inset-y-0 right-5 flex items-center text-on-surface-variant/40 hover:text-on-surface-variant"
              onClick={() => setSearchQuery('')}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          resultCount={filteredExercises.length}
        />

        {/* Supabase offline banner */}
        {!isSupabaseConfigured && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Loader2 size={22} className="animate-pulse" />
              </div>
              <div>
                <p className="font-headline text-[0.75rem] font-black uppercase tracking-[0.25em] text-primary">Modo Respaldo</p>
                <p className="mt-0.5 text-[0.68rem] font-medium text-on-surface-variant/70">
                  Mostrando datos locales. Las rutinas no se sincronizarán.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Exercise grid */}
        <div className="space-y-4 pb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-24 opacity-70">
              <Loader2 size={40} className="animate-spin text-primary" />
              <p className="text-[11px] font-black uppercase italic tracking-[0.3em] text-primary">
                Cargando biblioteca...
              </p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="rounded-[4rem] border-2 border-dashed border-white/5 bg-white/5 py-24 text-center opacity-70">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <Search size={32} className="text-on-surface-variant/20" />
              </div>
              <p className="px-8 text-[11px] font-black uppercase italic tracking-[0.2em] text-on-surface-variant/40">
                {filters.onlyFavorites
                  ? 'No tenés favoritos en este grupo'
                  : filters.source === 'custom'
                  ? 'No creaste ejercicios en este grupo aún'
                  : 'No hay ejercicios para estos filtros'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {filteredExercises.map((exercise, index) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  muscle={muscle}
                  index={index}
                  onSelect={onSelectExercise}
                  onEdit={startEdit}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteRequest={(ex) => setDeletingExercise(ex)}
                  isTogglingFavorite={togglingFavoriteId === exercise.id}
                />
              ))}
            </div>
          )}
        </div>
      </PageShell>
    </>
  );
};
