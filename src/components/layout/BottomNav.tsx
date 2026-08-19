import { motion } from 'motion/react';
import { Dumbbell, History, Home, Search } from 'lucide-react';
import type { View } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

export const BottomNav = ({ active, setView }: { active: View; setView: (v: View) => void }) => {
  const { t } = useLanguage();
  const items = [
    { id: 'dashboard', icon: Home, label: t('nav.dashboard') },
    { id: 'routines-list', icon: Dumbbell, label: t('nav.routines') },
    { id: 'exercise-selector', icon: Search, label: t('nav.engine') },
    { id: 'history', icon: History, label: t('nav.history') },
  ];
  const handleNavigate = (targetView: View) => {
    if (targetView === 'exercise-selector') {
      window.sessionStorage.setItem('kinetic.selectorSource', 'global');
    }

    setView(targetView);
  };

  return (
    <nav className="theme-bottom-nav liquid-glass-bottom-nav fixed bottom-0 left-0 z-50 w-full px-3 pb-[calc(env(safe-area-inset-bottom)+1.35rem)] pt-3">
      <div className="theme-bottom-nav-inner liquid-glass-bottom-nav__surface mx-auto grid w-full max-w-[20rem] grid-cols-4 items-center rounded-[2rem] px-2 py-2">
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
            {active === item.id && (
              <motion.div
                layoutId="bottom-nav-active-decoration"
                initial={false}
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[3.125rem]"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <span className="liquid-glass-bottom-nav__selection absolute left-1/2 top-0 block h-[3.125rem] w-[3.125rem] -translate-x-1/2 rounded-[1.2rem]" />
              </motion.div>
            )}
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
