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
    <nav className="theme-bottom-nav fixed bottom-0 left-0 z-50 w-full px-3 pb-[calc(env(safe-area-inset-bottom)+1.35rem)] pt-3 backdrop-blur-2xl">
      <div className="theme-bottom-nav-inner mx-auto flex w-full max-w-2xl items-center justify-around rounded-[2rem] px-2 py-2">
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
                active === item.id ? 'theme-bottom-nav-active scale-105 bg-primary/12' : 'theme-bottom-nav-item-hover'
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
                className="theme-bottom-nav-indicator absolute -top-1 h-1 w-12 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
