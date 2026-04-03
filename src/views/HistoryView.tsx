import { History } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import type { View } from '../types';

export const HistoryView = ({ setView }: { setView: (v: View) => void }) => (
  <PageShell
    activeView="history"
    setView={setView}
    onProfileClick={() => setView('settings')}
    onSettingsClick={() => setView('settings')}
    contentClassName="space-y-10 sm:space-y-14"
  >
      <section>
        <div className="mb-2 flex items-center gap-3">
          <div className="h-1 w-1 rounded-full bg-primary animate-pulse"></div>
          <span className="block text-[9px] font-black uppercase tracking-[0.4em] text-primary opacity-80 sm:text-[10px]">REGISTRO DE ACTIVIDAD</span>
        </div>
        <h2 className="font-headline text-4xl font-black uppercase italic leading-none tracking-tighter text-on-background sm:text-6xl">HISTORIAL</h2>
      </section>

      <div className="flex flex-col items-center justify-center space-y-6 py-20 opacity-20">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-on-surface-variant">
          <History size={40} />
        </div>
        <p className="font-headline text-sm font-black uppercase italic tracking-[0.3em]">SIN REGISTROS DISPONIBLES</p>
      </div>
  </PageShell>
);
