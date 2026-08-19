import { useEffect, useState } from 'react';
import { Dumbbell, History, Home, Search } from 'lucide-react';
import type { View } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

let lastBottomNavIndex: number | null = null;

export const BottomNav = ({ active, setView }: { active: View; setView: (v: View) => void }) => {
  const { t } = useLanguage();
  const items = [
    { id: 'dashboard', icon: Home, label: t('nav.dashboard') },
    { id: 'routines-list', icon: Dumbbell, label: t('nav.routines') },
    { id: 'exercise-selector', icon: Search, label: t('nav.engine') },
    { id: 'history', icon: History, label: t('nav.history') },
  ];
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === active));
  const [animatedIndex, setAnimatedIndex] = useState(() => lastBottomNavIndex ?? activeIndex);

  useEffect(() => {
    lastBottomNavIndex = activeIndex;
    const animationFrame = window.requestAnimationFrame(() => setAnimatedIndex(activeIndex));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeIndex]);

  const handleNavigate = (targetView: View) => {
    if (targetView === 'exercise-selector') {
      window.sessionStorage.setItem('kinetic.selectorSource', 'global');
    }

    setView(targetView);
  };

  return (
    <nav className="theme-bottom-nav liquid-glass-bottom-nav fixed bottom-0 left-0 z-50 w-full px-3 pb-[calc(env(safe-area-inset-bottom)+1.35rem)] pt-3">
      <div className="theme-bottom-nav-inner liquid-glass-bottom-nav__surface mx-auto grid w-full max-w-[20rem] grid-cols-4 items-center rounded-[2rem] px-2 py-2">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-2 z-10">
          <div
            className="liquid-glass-bottom-nav__selection-track flex justify-center"
            style={{ transform: `translate3d(${animatedIndex * 100}%, 0, 0)` }}
          >
            <span className="liquid-glass-bottom-nav__selection block h-[3.125rem] w-[3.125rem] rounded-[1.2rem]" />
          </div>
        </div>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            title={item.label}
            onClick={() => handleNavigate(item.id as View)}
            className={`group relative z-20 flex min-w-0 flex-col items-center justify-center transition-all duration-500 ${
              active === item.id ? 'text-primary' : 'text-on-surface-variant/40 hover:text-on-surface'
            }`}
          >
            <div
              className={`relative isolate overflow-hidden rounded-[1.2rem] p-3 transition-transform duration-500 ${
                active === item.id ? 'scale-105' : 'theme-bottom-nav-item-hover'
              }`}
            >
              <item.icon className="relative z-10" size={27} strokeWidth={active === item.id ? 2.5 : 2} />
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
};
