import React, { useState } from 'react';
import { PageShell } from '../components/layout/PageShell';

export const KineticLoginView = ({
  onLoginWithGoogle,
  onLoginWithEmail,
  onRegisterWithEmail,
}: {
  onLoginWithGoogle: () => Promise<{ started: boolean; error?: string }>;
  onLoginWithEmail: (email: string, pass: string) => void;
  onRegisterWithEmail: (email: string, pass: string) => void;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      if (isRegistering) {
        await onRegisterWithEmail(email, password);
      } else {
        await onLoginWithEmail(email, password);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      const result = await onLoginWithGoogle();
      if (!result.started) {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      activeView="login"
      setView={() => undefined}
      showFooter={false}
      showSettings={false}
      showProfile={false}
      contentClassName="max-w-6xl px-0 pb-0 pt-4 md:pt-20 sm:px-0"
    >
      <div className="relative overflow-hidden rounded-b-[2rem] border-b theme-hairline-border md:rounded-[2rem] md:border md:theme-hairline-border md:bg-surface-container-low/35 md:shadow-[0_30px_90px_color-mix(in_srgb,var(--strong-foreground)_16%,transparent)]">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-primary/12 blur-[110px]"></div>
          <div className="absolute bottom-[-3rem] right-[-4rem] h-72 w-72 rounded-full bg-secondary/10 blur-[140px]"></div>
        </div>

        <div className="relative z-10 grid min-h-[calc(100dvh-5rem)] grid-cols-1 md:min-h-[calc(100dvh-8rem)] md:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
          <section className="relative min-h-[15rem] overflow-hidden md:min-h-full">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAD9EXvQ6Oh0Ilv_TZqXrRdI0WQCxNgtvZDNX_MsZYFLiHp0_TDuKkVLzFv3JUJfv-Rcmzhgmv7YpzhW4icKHKcczQTHpDkrxEP6CTOcN8vptnZ_xOd4cbR5zUrVagt6256Dg1u4X5sEJOolIrcSiNY5vZ3eIjx7Ui_WFX0Ie-N5FzHjWRTqYS0VhvF5emyeKPZLHjAVFB3NqcNmdERoREr6WLPO2AVIUq4ma7Tv_IesIod1plMsG_rPSFTK7Gxa4FKuTSpwTEa1oFb"
              alt="Atleta entrenando"
              className="theme-hero-image h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="theme-hero-image-overlay absolute inset-0"></div>
            <div className="absolute inset-x-0 bottom-0 p-6 pb-8 sm:p-8 md:inset-0 md:flex md:flex-col md:justify-end md:p-12 lg:p-16">
              <div className="max-w-xl">
                <span className="tech-pill mb-5">Telemetria de rendimiento</span>
                <h1 className="font-headline text-[3.4rem] font-semibold uppercase leading-[0.82] tracking-[0.02em] text-on-background sm:text-[4.8rem] md:text-[6rem] lg:text-[7.5rem]">
                  Lleva tu
                  <br />
                  <span className="text-primary">limite</span>
                </h1>
              </div>
            </div>
          </section>

          <section className="relative z-20 flex items-start justify-center rounded-t-[2rem] bg-surface-container-low px-5 pb-8 pt-6 sm:px-6 md:min-h-full md:items-center md:rounded-none md:border-l md:theme-hairline-border md:bg-surface-container-low/92 md:px-8 md:py-10 lg:px-10">
            <div className="w-full max-w-md">
              <div className="mb-5">
                <div className="mb-1 font-headline text-[1.8rem] font-semibold uppercase tracking-[0.05em] text-primary sm:text-[2.2rem]">Kinetic Volt</div>
                <h2 className="font-sans text-[2.15rem] font-extrabold leading-none tracking-[-0.03em] text-on-surface sm:text-[2.7rem]">
                  {isRegistering ? 'Únete al motor' : 'Bienvenido de nuevo'}
                </h2>
                <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-on-surface-variant">
                  {isRegistering 
                    ? 'Crea tu cuenta de atleta para empezar a trackear tu rendimiento.' 
                    : 'Ingresa tus credenciales para acceder al motor de entrenamiento.'}
                </p>
              </div>

              <button
                onClick={handleGoogleClick}
                disabled={isLoading}
                className="control-shell mb-4 flex h-15 w-full items-center justify-center gap-3 rounded-[1.15rem] px-5 text-on-surface transition-all duration-200 hover:bg-surface-container-highest active:scale-[0.985] sm:h-16 disabled:opacity-50"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" />
                <span className="font-headline text-[1.2rem] font-semibold uppercase tracking-[0.16em] sm:text-[1.35rem]">
                  {isLoading ? 'Conectando...' : (isRegistering ? 'Registrarse con Google' : 'Ingresar con Google')}
                </span>
              </button>

              <div className="mb-4 flex items-center gap-4">
                <div className="theme-divider h-px flex-1"></div>
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-on-surface-variant/80 sm:text-[0.72rem]">
                  O mediante correo
                </span>
                <div className="theme-divider h-px flex-1"></div>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <div className="mb-2 text-[0.78rem] font-medium uppercase tracking-[0.22em] text-on-surface-variant">
                    Correo electrónico
                  </div>
                  <div className="control-shell rounded-[1.15rem]">
                    <input
                      className="h-15 w-full rounded-[1.15rem] bg-transparent px-5 text-[1rem] text-on-surface outline-none sm:h-16"
                      placeholder="atleta@kineticvolt.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-[0.78rem] font-medium uppercase tracking-[0.22em] text-on-surface-variant">
                      Contraseña
                    </div>
                  </div>
                  <div className="control-shell rounded-[1.15rem]">
                    <input
                      className="h-15 w-full rounded-[1.15rem] bg-transparent px-5 text-[1rem] text-on-surface outline-none sm:h-16"
                      placeholder="Mínimo 6 caracteres"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="neon-button mt-2 h-15 w-full rounded-[1.15rem] font-headline text-[1.4rem] font-semibold uppercase tracking-[0.16em] transition-all active:scale-[0.985] sm:h-16 sm:text-[1.55rem] disabled:opacity-50"
                >
                  {isLoading ? 'Procesando...' : (isRegistering ? 'Crear cuenta' : 'Iniciar sesión')}
                </button>
              </form>

              <p className="mt-8 text-center text-[0.98rem] text-on-surface-variant">
                {isRegistering ? '¿Ya tienes cuenta?' : '¿Primera vez en Kinetic?'}
                {' '}
                <button 
                  type="button" 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  {isRegistering ? 'Inicia sesión' : 'Regístrate aquí'}
                </button>
              </p>

              <div className="mt-10 grid grid-cols-2 gap-4 border-t theme-hairline-border pt-6 text-center sm:gap-6 sm:pt-8">
                <div>
                  <div className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-on-surface-variant">Estado</div>
                  <div className="flex items-center justify-center gap-2 text-on-surface-variant">
                    <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(212,255,0,0.8)]"></div>
                    <span className="text-[0.92rem]">Sistema nominal</span>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-on-surface-variant">Versión</div>
                  <div className="text-[0.92rem] text-on-surface-variant">v2.4.0-kinetic</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
};
