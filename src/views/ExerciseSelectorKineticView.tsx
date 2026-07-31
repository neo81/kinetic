import { useEffect, useMemo, useState } from 'react';
import { Accessibility, Activity, ArrowLeft, Dumbbell, Search } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { fallbackExerciseLibrary } from '../app/initialData';
import type { Exercise, UserProfile, View } from '../types';

type MuscleSide = 'front' | 'back';
type MuscleTarget = {
  id: string;
  label: string;
  group: string;
  dot: { x: number; y: number };
  labelPos: { x: number; y: number };
  align: 'left' | 'right';
};

type GlobalExerciseResult = Exercise & {
  muscleGroupCode: string;
};

const FOCUSED_EXERCISE_STORAGE_KEY = 'kinetic.focusedExerciseId';

const selectorData: Record<MuscleSide, { image: string; targets: MuscleTarget[] }> = {
  front: {
    image: '/body-front.webp',
    targets: [
      { id: 'hombros', label: 'Hombros', group: 'Hombros', dot: { x: 38, y: 25 }, labelPos: { x: 15, y: 23 }, align: 'left' },
      { id: 'pectorales', label: 'Pectorales', group: 'Pectorales', dot: { x: 56, y: 27 }, labelPos: { x: 82, y: 25 }, align: 'right' },
      { id: 'biceps', label: 'Bíceps', group: 'Biceps', dot: { x: 35, y: 34 }, labelPos: { x: 12, y: 34 }, align: 'left' },
      { id: 'abdomen', label: 'Abdomen', group: 'Abdomen', dot: { x: 50, y: 39 }, labelPos: { x: 85, y: 35 }, align: 'right' },
      { id: 'oblicuos', label: 'Oblicuos', group: 'Oblicuos', dot: { x: 42, y: 43 }, labelPos: { x: 15, y: 48 }, align: 'left' },
      { id: 'antebrazo', label: 'Antebrazo', group: 'Antebrazo', dot: { x: 70, y: 43 }, labelPos: { x: 85, y: 48 }, align: 'right' },
      { id: 'abductores', label: 'Abductores', group: 'Abductores', dot: { x: 39, y: 62 }, labelPos: { x: 17, y: 70 }, align: 'left' },
      { id: 'aductores', label: 'Aductores', group: 'Aductores', dot: { x: 53, y: 62 }, labelPos: { x: 85, y: 68 }, align: 'right' },
      { id: 'cuadriceps', label: 'Cuádriceps', group: 'Cuadriceps', dot: { x: 42, y: 57 }, labelPos: { x: 17, y: 58 }, align: 'left' },

    ],
  },
  back: {
    image: '/body-back.webp',
    targets: [
      { id: 'trapecio', label: 'Trapecio', group: 'Trapecio', dot: { x: 50, y: 20 }, labelPos: { x: 85, y: 18 }, align: 'right' },
      { id: 'triceps', label: 'Tríceps', group: 'Triceps', dot: { x: 35, y: 30 }, labelPos: { x: 12, y: 32 }, align: 'left' },
      { id: 'dorsales', label: 'Dorsales', group: 'Dorsales', dot: { x: 58, y: 38 }, labelPos: { x: 85, y: 38 }, align: 'right' },
      { id: 'lumbares', label: 'Lumbares', group: 'Lumbares', dot: { x: 50, y: 40 }, labelPos: { x: 15, y: 48 }, align: 'left' },
      { id: 'gluteos', label: 'Glúteos', group: 'Gluteos', dot: { x: 55, y: 48 }, labelPos: { x: 85, y: 58 }, align: 'right' },
      { id: 'isquiotibiales', label: 'Isquiotibiales', group: 'Isquiotibiales', dot: { x: 44, y: 59 }, labelPos: { x: 20, y: 65 }, align: 'left' },
      { id: 'pantorrillas', label: 'Pantorrillas', group: 'Pantorrillas', dot: { x: 42, y: 75 }, labelPos: { x: 20, y: 80 }, align: 'left' },
    ],
  },
};

export const ExerciseSelectorKineticView = ({
  setView,
  onSelectMuscle,
  onSelectExercise,
  selectedMuscle,
  navigationSource,
  profile,
}: {
  setView: (v: View) => void;
  onSelectMuscle: (m: string) => void;
  onSelectExercise?: (exercise: Exercise) => void;
  selectedMuscle?: string;
  navigationSource?: View;
  profile?: UserProfile | null;
}) => {
  const getSideForMuscle = (muscle?: string): MuscleSide => {
    const normalized = (muscle ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return selectorData.back.targets.some((target) => target.id === normalized || target.group.toLowerCase() === normalized)
      ? 'back'
      : 'front';
  };

  const [side, setSide] = useState<MuscleSide>(() => getSideForMuscle(selectedMuscle));
  const [searchQuery, setSearchQuery] = useState('');
  const [globalExercises, setGlobalExercises] = useState<GlobalExerciseResult[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<MuscleSide, boolean>>({
    front: false,
    back: false,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    (Object.entries(selectorData) as Array<[MuscleSide, typeof selectorData[MuscleSide]]>).forEach(([imageSide, data]) => {
      const image = new Image();
      image.src = data.image;

      const markLoaded = () => {
        setLoadedImages((current) => ({ ...current, [imageSide]: true }));
      };

      if (image.complete) {
        markLoaded();
        return;
      }

      void image.decode().then(markLoaded).catch(markLoaded);
    });
  }, []);

  useEffect(() => {
    setSide(getSideForMuscle(selectedMuscle));
  }, [selectedMuscle]);

  useEffect(() => {
    let cancelled = false;

    const fetchGlobalExercises = async () => {
      setGlobalSearchLoading(true);

      if (!isSupabaseConfigured || !supabase) {
        const fallback = fallbackExerciseLibrary.map((exercise) => ({
          ...exercise,
          muscleGroup: exercise.muscleGroup || exercise.muscleGroupCode,
          muscleGroupCode: exercise.muscleGroupCode,
          notes: '',
        }));
        if (!cancelled) {
          setGlobalExercises(fallback);
          setGlobalSearchLoading(false);
        }
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
            user_id,
            is_active,
            muscle_groups!inner(code, name)
          `)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) throw error;

        const mapped: GlobalExerciseResult[] = (data ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? undefined,
          equipment: item.equipment ?? undefined,
          muscleGroup: item.muscle_groups?.name || 'Sin grupo',
          muscleGroupCode: item.muscle_groups?.code || '',
          sets: [],
          isCustom: !!item.user_id,
        }));

        if (!cancelled) {
          setGlobalExercises(mapped);
        }
      } catch (error) {
        console.error('Error al cargar busqueda global de ejercicios:', error);
      } finally {
        if (!cancelled) {
          setGlobalSearchLoading(false);
        }
      }
    };

    fetchGlobalExercises();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTargetsBySide = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filterTargets = (targetSide: MuscleSide) => {
      if (!normalizedQuery) {
        return selectorData[targetSide].targets;
      }

      return selectorData[targetSide].targets.filter((target) =>
        target.label.toLowerCase().includes(normalizedQuery),
      );
    };

    return {
      front: filterTargets('front'),
      back: filterTargets('back'),
    };
  }, [searchQuery]);

  const filteredGlobalExercises = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
      return [];
    }

    return globalExercises
      .filter((exercise) =>
        exercise.name.toLowerCase().includes(normalizedQuery) ||
        exercise.muscleGroup.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [globalExercises, searchQuery]);

  const handleOpenLibrary = (group: string) => {
    window.sessionStorage.removeItem(FOCUSED_EXERCISE_STORAGE_KEY);
    onSelectMuscle(group);
    setView('exercise-list');
  };

  const handleSelectGlobalExercise = (exercise: GlobalExerciseResult) => {
    const selectorSource = window.sessionStorage.getItem('kinetic.selectorSource');
    if (selectorSource === 'global') {
      window.sessionStorage.setItem(FOCUSED_EXERCISE_STORAGE_KEY, exercise.id);
      onSelectMuscle(exercise.muscleGroupCode || exercise.muscleGroup);
      setView('exercise-list');
      return;
    }

    if (onSelectExercise) {
      onSelectExercise(exercise);
      return;
    }

    onSelectMuscle(exercise.muscleGroupCode || exercise.muscleGroup);
    setView('exercise-list');
  };

  const handleBack = () => {
    const selectorSource = window.sessionStorage.getItem('kinetic.selectorSource');
    if (navigationSource === 'routine-creator' && selectorSource !== 'global') {
      setView('routine-creator');
      return;
    }

    setView('dashboard');
  };

  return (
    <PageShell
      activeView="exercise-selector"
      setView={setView}
      onProfileClick={() => setView('settings')}
      onSettingsClick={() => setView('settings')}
      profile={profile}
      contentClassName="space-y-5"
    >
      <section className="space-y-5">
        <button onClick={handleBack} className="flex items-center gap-3 text-on-surface-variant transition-colors hover:text-primary">
          <div className="theme-muted-surface flex h-8 w-8 items-center justify-center rounded-full transition-all group-hover:bg-primary/20">
            <ArrowLeft size={16} strokeWidth={2.5} />
          </div>
          <span className="font-headline text-[0.72rem] font-black uppercase italic tracking-[0.22em]">Volver</span>
        </button>

        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">SELECTOR DE PRECISIÓN</span>
          </div>
          <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-on-surface">
            Target<br/>
            Engine
          </h1>
        </header>
      </section>

      <section className="panel-surface rounded-[1rem] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar grupo o ejercicio..."
            className="h-12 w-full rounded-full border theme-hairline-border bg-surface-container-high px-11 text-sm text-on-surface outline-none transition-all focus:border-primary/35 focus:ring-2 focus:ring-primary/12"
          />
        </div>
        {searchQuery.trim().length >= 2 && (
          <div className="mt-4 space-y-2">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Ejercicios encontrados
            </p>
            {globalSearchLoading ? (
              <div className="rounded-[0.9rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                Buscando...
              </div>
            ) : filteredGlobalExercises.length > 0 ? (
              <div className="space-y-2">
                {filteredGlobalExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => handleSelectGlobalExercise(exercise)}
                    className="flex w-full flex-col items-start gap-3 rounded-[0.9rem] bg-surface-container-low px-4 py-3 text-left transition-colors hover:bg-surface-container-high sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 w-full sm:flex-1">
                      <p className="break-words text-sm font-bold leading-snug text-on-surface">{exercise.name}</p>
                      <p className="mt-1.5 text-[10px] font-bold uppercase leading-relaxed tracking-[0.14em] text-primary">
                        Pertenece a {exercise.muscleGroup}
                      </p>
                    </div>
                    <div className="flex min-w-0 w-full items-start gap-2 text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-on-surface-variant sm:w-auto sm:max-w-[45%] sm:justify-end sm:text-right">
                      <Dumbbell className="mt-0.5 shrink-0" size={14} />
                      <span className="min-w-0 break-words">{exercise.equipment || 'General'}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[0.9rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                No hay ejercicios con ese nombre.
              </div>
            )}
          </div>
        )}
      </section>

      <section className="panel-surface overflow-hidden rounded-[1.1rem]">
        <div className="relative aspect-[0.78] w-full">
          {(Object.keys(selectorData) as MuscleSide[]).map((imageSide) => (
            <img
              key={imageSide}
              alt={`Figura anatomica ${imageSide === 'front' ? 'frontal' : 'posterior'}`}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${side === imageSide ? 'opacity-100' : 'opacity-0'}`}
              decoding="async"
              fetchPriority="high"
              loading="eager"
              onLoad={() => setLoadedImages((current) => ({ ...current, [imageSide]: true }))}
              src={selectorData[imageSide].image}
            />
          ))}
          <div className="theme-hero-image-overlay pointer-events-none absolute inset-0" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(212,255,0,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(212,255,0,0.1)_1px,transparent_1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {(Object.keys(selectorData) as MuscleSide[]).map((targetSide) => (
            <div key={targetSide} className={side === targetSide && loadedImages[targetSide] ? 'block' : 'hidden'}>
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {filteredTargetsBySide[targetSide].map((target) => {
                  const startX = target.labelPos.x;
                  const startY = target.labelPos.y;
                  const endX = target.dot.x;
                  const endY = target.dot.y;
                  const midX = target.align === 'left' ? startX + 6 : startX - 6;

                  return (
                    <g key={`svg-${targetSide}-${target.id}`}>
                      <line
                        x1={`${startX}%`} y1={`${startY}%`} x2={`${midX}%`} y2={`${startY}%`}
                        stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"
                      />
                      <line
                        x1={`${midX}%`} y1={`${startY}%`} x2={`${endX}%`} y2={`${endY}%`}
                        stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"
                      />
                      <circle cx={`${endX}%`} cy={`${endY}%`} r="3" fill="rgba(255,255,255,0.9)" />
                    </g>
                  );
                })}
              </svg>

              {filteredTargetsBySide[targetSide].map((target) => (
                <button
                  key={`btn-${targetSide}-${target.id}`}
                  onClick={() => handleOpenLibrary(target.group)}
                  className={`absolute flex flex-col justify-center -translate-y-1/2 transition-transform hover:scale-[1.03] active:scale-95 group ${target.align === 'left' ? 'right-[unset] items-end' : 'left-[unset] items-start'
                    }`}
                  style={{
                    top: `${target.labelPos.y}%`,
                    ...(target.align === 'left'
                      ? { right: `${100 - target.labelPos.x}%` }
                      : { left: `${target.labelPos.x}%` }),
                  }}
                >
                  <span className={`px-1 pb-0.5 font-headline text-[0.75rem] font-medium text-on-background drop-shadow-md transition-colors group-hover:text-primary ${target.align === 'left' ? 'text-right' : 'text-left'}`}>
                    {target.label}
                  </span>
                  <div className="h-[1.5px] w-full bg-on-background/60 transition-colors group-hover:bg-primary" />
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="panel-surface rounded-[1rem] p-4">
        <div className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
          Orientacion
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setSide('front')}
            className={`flex w-full items-center justify-between rounded-[0.9rem] px-4 py-3 font-headline text-[1.05rem] font-semibold uppercase tracking-[0.12em] transition-all active:scale-[0.985] ${side === 'front'
              ? 'neon-button shadow-[0_8px_24px_rgba(212,255,0,0.24)]'
              : 'border theme-hairline-border bg-surface-container-low text-on-surface-variant hover:border-primary/25 hover:text-on-surface'
              }`}
          >
            Frente
            <Accessibility size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => setSide('back')}
            className={`flex w-full items-center justify-between rounded-[0.9rem] px-4 py-3 font-headline text-[1.05rem] font-semibold uppercase tracking-[0.12em] transition-all active:scale-[0.985] ${side === 'back'
              ? 'neon-button shadow-[0_8px_24px_rgba(212,255,0,0.24)]'
              : 'border theme-hairline-border bg-surface-container-low text-on-surface-variant hover:border-primary/25 hover:text-on-surface'
              }`}
          >
            Espalda
            <Activity size={16} strokeWidth={2.5} />
          </button>
        </div>
      </section>
    </PageShell>
  );
};
