import { motion } from 'motion/react';
import { Dumbbell, History, LayoutDashboard } from 'lucide-react';
import type { View } from '../../types';

export const BottomNav = ({ active, setView }: { active: View; setView: (v: View) => void }) => {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'PANEL' },
    { id: 'routine-detail', icon: Dumbbell, label: 'RUTINAS' },
    { id: 'exercise-selector', icon: 'list_alt', label: 'MOTOR', isMaterial: true },
    { id: 'history', icon: History, label: 'HISTORIAL' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-white/6 bg-[linear-gradient(180deg,rgba(8,9,11,0.45),rgba(8,9,11,0.96))] px-3 pb-[calc(env(safe-area-inset-bottom)+1.35rem)] pt-3 backdrop-blur-2xl shadow-[0_-18px_50px_rgba(0,0,0,0.62)]">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-around rounded-[2rem] border border-white/6 bg-surface-container-high/75 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`group relative flex flex-col items-center justify-center transition-all duration-500 ${
              active === item.id ? 'text-primary' : 'text-on-surface-variant/40 hover:text-on-surface'
            }`}
          >
            <div
              className={`rounded-[1.2rem] p-3 transition-all duration-500 ${
                active === item.id ? 'scale-105 bg-primary/12 shadow-[0_0_0_1px_rgba(212,255,0,0.12)]' : 'group-hover:bg-white/5'
              }`}
            >
              {item.isMaterial ? (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '26px', fontVariationSettings: active === item.id ? "'FILL' 1, 'wght' 700" : "'FILL' 0, 'wght' 400" }}
                >
                  {item.icon as string}
                </span>
              ) : (
                <item.icon size={26} strokeWidth={active === item.id ? 2.5 : 2} />
              )}
            </div>
            <span
              className={`mt-1.5 font-headline text-[0.82rem] font-semibold uppercase tracking-[0.26em] transition-all duration-500 ${
                active === item.id ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-40'
              }`}
            >
              {item.label}
            </span>
            {active === item.id && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-1 h-1 w-12 rounded-full bg-primary shadow-[0_0_22px_rgba(212,255,0,0.8)]"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
