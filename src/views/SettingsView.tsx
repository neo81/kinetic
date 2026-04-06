import { useState } from 'react';
import { ArrowLeft, ChevronRight, Edit2, LogOut, Ruler, User } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import type { View } from '../types';

export const SettingsView = ({ setView, onLogout }: { setView: (v: View) => void; onLogout: () => void }) => {
  const [units, setUnits] = useState<'KG' | 'LB'>('KG');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');

  const fitnessLevels = ['Principiante', 'Intermedio', 'Atleta elite', 'Competidor pro'];
  const displayName = fullName.trim() || 'Perfil sin configurar';
  const displayLevel = fitnessLevel || 'Sin nivel asignado';

  const handleLogoutClick = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await Promise.resolve(onLogout());
    } finally {
      setIsLoggingOut(false);
      setView('login');
    }
  };

  return (
    <PageShell
      activeView="dashboard"
      setView={setView}
      showHeader={false}
      contentClassName="max-w-md px-4 pt-0 pb-24 sm:px-6"
    >
      <div className="sticky top-0 z-50 -mx-4 bg-background/95 backdrop-blur-xl sm:-mx-6">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => (isEditingProfile ? setIsEditingProfile(false) : setView('dashboard'))} className="text-on-surface-variant transition-colors hover:text-primary">
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <h1 className={`font-sans text-sm font-bold uppercase tracking-[0.28em] ${isEditingProfile ? 'text-on-surface' : 'text-primary'}`}>
              {isEditingProfile ? 'Editar perfil' : 'Configuracion'}
            </h1>
          </div>

          {isEditingProfile ? (
            <button onClick={() => setIsEditingProfile(false)} className="font-sans text-sm font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:text-primary/80">
              Guardar
            </button>
          ) : (
            <div className="font-headline text-[1.9rem] font-semibold uppercase tracking-[0.14em] text-primary">KINETIC</div>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
      </div>

      {isEditingProfile ? (
        <section className="space-y-8 pb-8">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-[conic-gradient(from_210deg,#ff7439,#d1fc00,#ff7439)] p-1 shadow-[0_0_30px_rgba(209,252,0,0.16)]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-container text-on-surface">
                  <User size={44} strokeWidth={1.8} />
                </div>
              </div>
              <button className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-black shadow-xl">
                <Edit2 size={16} strokeWidth={2.5} />
              </button>
            </div>
            <p className="mt-4 text-[0.75rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">Sincronizacion de perfil pendiente</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Nombre completo</label>
              <div className="control-shell rounded-[0.95rem]">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ingresa tu nombre" className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Usuario</label>
              <div className="control-shell rounded-[0.95rem]">
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@usuario" className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Correo electronico</label>
              <div className="control-shell rounded-[0.95rem]">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@dominio.com" className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none" type="email" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Bio</label>
              <div className="control-shell rounded-[0.95rem]">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Agrega una descripcion breve de tu perfil." rows={4} className="w-full resize-none rounded-[0.95rem] bg-transparent px-4 py-4 text-on-surface outline-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Nivel fitness</label>
              <div className="flex flex-wrap gap-3">
                {fitnessLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFitnessLevel(level)}
                    className={`rounded-full px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] transition-all ${
                      fitnessLevel === level ? 'bg-primary text-black shadow-[0_0_24px_rgba(209,252,0,0.24)]' : 'border border-white/10 bg-surface-container-low text-on-surface'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {['Potencia', 'Resistencia', 'Agilidad'].map((label, index) => (
                <div key={label} className={`rounded-[1rem] bg-surface-container-low p-4 ${index === 0 ? 'border-l-2 border-primary' : index === 1 ? 'border-l-2 border-secondary' : 'border-l-2 border-tertiary'}`}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{label}</p>
                  <p className="mt-1 text-xl font-bold text-on-surface">--</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="neon-button w-full rounded-[0.95rem] py-4 font-sans text-sm font-bold uppercase tracking-[0.22em] transition-all active:scale-[0.985]"
            >
              Guardar cambios
            </button>
          </form>
        </section>
      ) : (
        <section className="space-y-8 pb-8">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-2 border-primary bg-surface-container-low p-1">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-container text-on-surface">
                  <User size={34} strokeWidth={1.9} />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-lg">Sin lvl</div>
            </div>

            <div className="space-y-1">
              <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">{displayName}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary">•</span>
                <span className="text-[0.72rem] font-medium uppercase tracking-[0.24em] text-on-surface-variant">{displayLevel}</span>
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <h3 className="px-1 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">Cuenta</h3>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex w-full items-center justify-between rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-left transition-colors hover:bg-surface-container-high"
            >
              <div className="flex items-center gap-4">
                <User size={18} className="text-on-surface-variant" />
                <span className="font-medium text-on-surface">Editar perfil</span>
              </div>
              <ChevronRight size={18} className="text-outline" />
            </button>
          </section>

          <section className="space-y-3">
            <h3 className="px-1 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">Preferencias</h3>
            <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Ruler size={18} className="text-on-surface-variant" />
                  <span className="font-medium text-on-surface">Sistema de unidades</span>
                </div>
                <div className="flex rounded-[0.6rem] bg-surface-container-highest p-1">
                  <button
                    onClick={() => setUnits('KG')}
                    className={`rounded-[0.45rem] px-4 py-1.5 text-[10px] font-bold uppercase transition-all ${units === 'KG' ? 'bg-primary text-black' : 'text-on-surface-variant'}`}
                  >
                    KG
                  </button>
                  <button
                    onClick={() => setUnits('LB')}
                    className={`rounded-[0.45rem] px-4 py-1.5 text-[10px] font-bold uppercase transition-all ${units === 'LB' ? 'bg-primary text-black' : 'text-on-surface-variant'}`}
                  >
                    LB
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="px-1 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">Actividad</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-[1rem] border-l-2 border-primary bg-surface-container-low p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Historial</p>
                <p className="mt-2 text-2xl font-black text-on-surface">0</p>
                <p className="text-[11px] text-on-surface-variant">Entrenamientos sincronizados</p>
              </div>
              <div className="relative overflow-hidden rounded-[1rem] border-l-2 border-secondary bg-surface-container-low p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Records</p>
                <p className="mt-2 text-2xl font-black text-on-surface">0</p>
                <p className="text-[11px] text-on-surface-variant">PR registrados</p>
              </div>
            </div>
          </section>

          <section className="pt-4">
            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="flex w-full items-center justify-center gap-3 rounded-[0.95rem] bg-surface-container-high px-4 py-4 text-on-surface transition-all hover:bg-error-container/10 hover:text-error active:scale-[0.985] disabled:opacity-60"
            >
              <LogOut size={18} />
              <span className="text-sm font-bold uppercase tracking-[0.18em]">
                {isLoggingOut ? 'Cerrando...' : 'Cerrar sesion'}
              </span>
            </button>
            <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.4em] text-on-surface-variant/40">Kinetic Engine</p>
          </section>
        </section>
      )}
    </PageShell>
  );
};
