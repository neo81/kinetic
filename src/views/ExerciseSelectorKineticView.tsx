import { useEffect, useMemo, useState } from 'react';
import { Accessibility, Activity, ArrowLeft, Search } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import type { View } from '../types';

type MuscleSide = 'front' | 'back';
type MuscleTarget = {
  id: string;
  label: string;
  group: string;
  dot: { x: number; y: number };
  labelPos: { x: number; y: number };
  align: 'left' | 'right';
};

const selectorData: Record<MuscleSide, { image: string; targets: MuscleTarget[] }> = {
  front: {
    image: '/body-front.png',
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
    image: '/body-back.png',
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
}: {
  setView: (v: View) => void;
  onSelectMuscle: (m: string) => void;
}) => {
  const [side, setSide] = useState<MuscleSide>('front');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredTargets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return selectorData[side].targets;
    }

    return selectorData[side].targets.filter((target) =>
      target.label.toLowerCase().includes(normalizedQuery),
    );
  }, [searchQuery, side]);

  const handleOpenLibrary = (group: string) => {
    onSelectMuscle(group);
    setView('exercise-list');
  };

  return (
    <PageShell
      activeView="exercise-selector"
      setView={setView}
      onProfileClick={() => setView('settings')}
      onSettingsClick={() => setView('settings')}
      contentClassName="max-w-md space-y-5"
    >
      <section className="space-y-2">
        <div className="mb-2">
          <button
            onClick={() => setView('routine-creator')}
            className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-primary shadow-xl transition-all hover:bg-primary/10 active:scale-90"
          >
            <ArrowLeft size={18} strokeWidth={3} className="transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
        <h2 className="kinetic-gradient-text font-headline text-[4rem] font-semibold uppercase leading-[0.82] tracking-[0.02em]">
          Target
          <br />
          Engine
        </h2>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
          Selector muscular de precision
        </p>
      </section>

      <section className="panel-surface rounded-[1rem] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar grupo muscular..."
            className="h-12 w-full rounded-full border border-white/6 bg-surface-container-high px-11 text-sm text-on-surface outline-none transition-all focus:border-primary/35 focus:ring-2 focus:ring-primary/12"
          />
        </div>
      </section>

      <section className="panel-surface overflow-hidden rounded-[1.1rem]">
        <div className="relative aspect-[0.78] w-full">
          <img
            alt={`Figura anatomica ${side === 'front' ? 'frontal' : 'posterior'}`}
            className="h-full w-full object-cover"
            src={selectorData[side].image}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,9,18,0.08)_0%,rgba(13,11,26,0.28)_55%,rgba(11,10,20,0.48)_100%)]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(212,255,0,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(212,255,0,0.1)_1px,transparent_1px)',
              backgroundSize: '20px 20px',
            }}
          />

          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {filteredTargets.map((target) => {
              const startX = target.labelPos.x;
              const startY = target.labelPos.y;
              const endX = target.dot.x;
              const endY = target.dot.y;
              const midX = target.align === 'left' ? startX + 6 : startX - 6;

              return (
                <g key={`svg-${target.id}`} className="transition-opacity duration-300">
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

          {filteredTargets.map((target) => {
            return (
              <button
                key={`btn-${target.id}`}
                onClick={() => handleOpenLibrary(target.group)}
                className={`absolute flex flex-col justify-center -translate-y-1/2 transition-all hover:scale-[1.03] active:scale-95 group ${target.align === 'left' ? 'right-[unset] items-end' : 'left-[unset] items-start'
                  }`}
                style={{
                  top: `${target.labelPos.y}%`,
                  ...(target.align === 'left'
                    ? { right: `${100 - target.labelPos.x}%` }
                    : { left: `${target.labelPos.x}%` }),
                }}
              >
                <span className={`px-1 pb-0.5 font-headline text-[0.75rem] font-medium text-white drop-shadow-md transition-colors group-hover:text-primary ${target.align === 'left' ? 'text-right' : 'text-left'}`}>
                  {target.label}
                </span>
                <div className="h-[1.5px] w-full bg-white/70 transition-colors group-hover:bg-primary" />
              </button>
            );
          })}
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
              : 'border border-white/8 bg-surface-container-low text-on-surface-variant hover:border-primary/25 hover:text-on-surface'
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
              : 'border border-white/8 bg-surface-container-low text-on-surface-variant hover:border-primary/25 hover:text-on-surface'
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
