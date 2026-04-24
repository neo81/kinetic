import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Edit2, LogOut, Ruler, User, Target, Check, AlertCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase/client';
import { PageShell } from '../components/layout/PageShell';
import { AvatarSection } from '../components/AvatarSection';
import { AvatarUploadDialog } from '../components/AvatarUploadDialog';
import { routinesRepository } from '../features/routines/repository';
import { avatarStorageService } from '../services/avatarStorageService';
import { usernameValidationService, type UsernameValidationResult } from '../services/usernameValidationService';
import type { UserProfile, View, UserGoals } from '../types';
import type { ResolvedTheme, ThemePreference } from '../theme/theme';

type SettingsViewProps = {
  setView: (view: View) => void;
  profile: UserProfile | null;
  userEmail: string | null;
  onLogout: () => void;
  onSaveProfile: (input: {
    fullName: string;
    username: string;
    bio: string;
    fitnessLevel: string;
    unitSystem: 'kg' | 'lb';
    avatarUrl?: string;
  }) => Promise<unknown>;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onThemeChange: (theme: ThemePreference) => Promise<void>;
};

type FeedbackState = 'idle' | 'saving' | 'success' | 'error';

const fitnessLevels = ['Principiante', 'Intermedio', 'Avanzado', 'Competidor'];

export const SettingsView = ({
  setView,
  profile,
  userEmail,
  onLogout,
  onSaveProfile,
  themePreference,
  resolvedTheme,
  onThemeChange,
}: SettingsViewProps) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [units, setUnits] = useState<'kg' | 'lb'>('kg');
  
  // Username validation state
  const [usernameValidation, setUsernameValidation] = useState<UsernameValidationResult | null>(null);
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);
  
  // Feedback state
  const [profileFeedback, setProfileFeedback] = useState<{ state: FeedbackState; message: string }>({ state: 'idle', message: '' });
  const [goalsFeedback, setGoalsFeedback] = useState<{ state: FeedbackState; message: string }>({ state: 'idle', message: '' });

  // Weekly goals state
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [editingGoals, setEditingGoals] = useState<UserGoals | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? '');
    setUsername(profile?.username ?? '');
    setBio(profile?.bio ?? '');
    setFitnessLevel(profile?.fitnessLevel ?? '');
    setUnits(profile?.unitSystem ?? 'kg');
  }, [profile]);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user.id) return;

        const loadedGoals = await routinesRepository.getUserGoals(session.user.id);
        setGoals(loadedGoals);
      } catch (error) {
        console.error('Error loading goals:', error);
      }
    };
    loadGoals();
  }, []);

  // Auto-clear profile feedback after 3 seconds
  useEffect(() => {
    if (profileFeedback.state !== 'idle' && profileFeedback.state !== 'saving') {
      const timer = setTimeout(() => {
        setProfileFeedback({ state: 'idle', message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [profileFeedback.state]);

  // Auto-clear goals feedback after 3 seconds
  useEffect(() => {
    if (goalsFeedback.state !== 'idle' && goalsFeedback.state !== 'saving') {
      const timer = setTimeout(() => {
        setGoalsFeedback({ state: 'idle', message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [goalsFeedback.state]);

  // Validate username in real-time when it changes
  useEffect(() => {
    if (!isEditingProfile || !username.trim()) {
      setUsernameValidation(null);
      return;
    }

    // Only validate if different from original
    if (username === profile?.username) {
      setUsernameValidation(null);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsValidatingUsername(true);
      try {
        const result = await usernameValidationService.validate(username, profile?.id);
        setUsernameValidation(result);
      } finally {
        setIsValidatingUsername(false);
      }
    }, 800); // Debounce 800ms

    return () => clearTimeout(debounceTimer);
  }, [username, isEditingProfile, profile?.username, profile?.id]);

  const saveProfile = async (
    overrides?: Partial<{
      fullName: string;
      username: string;
      bio: string;
      fitnessLevel: string;
      unitSystem: 'kg' | 'lb';
      avatarUrl: string;
    }>,
  ) => {
    await onSaveProfile({
      fullName: overrides?.fullName ?? fullName,
      username: overrides?.username ?? username,
      bio: overrides?.bio ?? bio,
      fitnessLevel: overrides?.fitnessLevel ?? fitnessLevel,
      unitSystem: overrides?.unitSystem ?? units,
      avatarUrl: overrides?.avatarUrl,
    });
  };

  const handleProfileSave = async () => {
    if (isSavingProfile) {
      return;
    }

    setIsSavingProfile(true);
    setProfileFeedback({ state: 'saving', message: 'Guardando cambios...' });
    try {
      await saveProfile();
      setProfileFeedback({ state: 'success', message: 'Perfil actualizado correctamente' });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setProfileFeedback({ state: 'error', message: 'No se pudo guardar el perfil. Intenta de nuevo.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGoalsEdit = () => {
    if (goals) {
      setEditingGoals({ ...goals });
      setIsEditingGoals(true);
    }
  };

  const handleGoalsSave = async () => {
    if (isSavingGoals || !editingGoals) {
      return;
    }

    setIsSavingGoals(true);
    setGoalsFeedback({ state: 'saving', message: 'Guardando objetivos...' });
    try {
      const userId = profile?.id;
      if (!userId) {
        throw new Error('User ID not available');
      }

      const updated = await routinesRepository.saveUserGoals(userId, editingGoals);
      setGoals(updated);
      setEditingGoals(null);
      setIsEditingGoals(false);
      setGoalsFeedback({ state: 'success', message: 'Objetivos actualizados correctamente' });
    } catch (error) {
      console.error('Error saving goals:', error);
      setGoalsFeedback({ state: 'error', message: 'No se pudieron guardar los objetivos. Intenta de nuevo.' });
    } finally {
      setIsSavingGoals(false);
    }
  };

  const handleUnitsChange = async (nextUnits: 'kg' | 'lb') => {
    if (units === nextUnits || isSavingProfile) {
      return;
    }

    const previousUnits = units;
    setUnits(nextUnits);
    setIsSavingProfile(true);
    try {
      await saveProfile({ unitSystem: nextUnits });
    } catch (error) {
      console.error('No se pudo actualizar el sistema de unidades:', error);
      setUnits(previousUnits);
    } finally {
      setIsSavingProfile(false);
    }
  };

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

  const handleThemePreferenceChange = async (nextTheme: ThemePreference) => {
    if (isUpdatingTheme || themePreference === nextTheme) {
      return;
    }

    setIsUpdatingTheme(true);
    try {
      await onThemeChange(nextTheme);
    } catch (error) {
      console.error('No se pudo actualizar el tema:', error);
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  const themeLabel =
    themePreference === 'auto'
      ? `Auto (${resolvedTheme === 'dark' ? 'oscuro' : 'claro'})`
      : themePreference === 'dark'
        ? 'Oscuro'
        : 'Claro';

  const handleAvatarUpload = async (file: File): Promise<string> => {
    if (!profile?.id) {
      throw new Error('User ID not available');
    }

    try {
      setIsUploadingAvatar(true);
      const newAvatarUrl = await avatarStorageService.uploadAvatar(profile.id, file);
      
      // Delete old avatar if it exists
      if (profile.avatarUrl) {
        await avatarStorageService.deleteOldAvatar(profile.id, profile.avatarUrl);
      }

      // Update profile with new avatar URL
      await saveProfile({ avatarUrl: newAvatarUrl });
      
      return newAvatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error instanceof Error ? error : new Error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const displayName = fullName.trim() || profile?.fullName?.trim() || 'Perfil sin configurar';
  const displayLevel = fitnessLevel || profile?.fitnessLevel || 'Sin nivel asignado';
  const displayUnits = units.toUpperCase();

  const isInAnyEditMode = isEditingProfile || isEditingGoals;

  return (
    <PageShell
      activeView="settings"
      setView={setView}
      showHeader={false}
      contentClassName="pt-24 pb-24"
    >
      <div className="fixed top-0 left-0 z-[60] w-full border-b theme-hairline-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-2xl items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (isEditingProfile) {
                  setIsEditingProfile(false);
                } else if (isEditingGoals) {
                  setIsEditingGoals(false);
                  setEditingGoals(null);
                } else {
                  setView('dashboard');
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-all theme-interactive-hover hover:text-primary active:scale-95"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <h1 className={`font-headline text-lg font-semibold uppercase italic tracking-[0.16em] ${isInAnyEditMode ? 'text-on-surface' : 'text-primary'}`}>
              {isEditingProfile ? 'Editar perfil' : isEditingGoals ? 'Editar objetivos' : 'Configuracion'}
            </h1>
          </div>

          {isEditingProfile ? (
            <button
              onClick={handleProfileSave}
              disabled={isSavingProfile}
              className="font-headline text-sm font-bold uppercase italic tracking-[0.18em] text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
            >
              {isSavingProfile ? 'Guardando...' : 'Guardar'}
            </button>
          ) : isEditingGoals ? (
            <button
              onClick={handleGoalsSave}
              disabled={isSavingGoals}
              className="font-headline text-sm font-bold uppercase italic tracking-[0.18em] text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
            >
              {isSavingGoals ? 'Guardando...' : 'Guardar'}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(212,255,0,0.9)]"></div>
              <div className="leading-none text-right">
                <span className="block font-headline text-[1.6rem] font-semibold uppercase tracking-[0.16em] text-primary">KINETIC</span>
                <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.34em] text-on-surface-variant/70">Performance Engine</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {isEditingProfile && (
        <section className="space-y-8 pb-8">
          <AvatarSection
            profile={profile}
            isEditing={true}
            onUploadClick={() => setIsAvatarDialogOpen(true)}
          />

          <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Nombre completo</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ingresa tu nombre"
                  className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Usuario</label>
              <div className={`relative control-shell rounded-[0.95rem] ${
                usernameValidation ? (usernameValidation.available ? 'border-green-500/30' : 'border-red-500/30') : ''
              }`}>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="@usuario"
                  className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 pr-10 text-on-surface outline-none"
                />
                {isValidatingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader size={18} className="animate-spin text-primary" />
                  </div>
                )}
                {usernameValidation && !isValidatingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameValidation.available ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <AlertCircle size={18} className="text-red-400" />
                    )}
                  </div>
                )}
              </div>
              <AnimatePresence>
                {usernameValidation && !isValidatingUsername && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`text-xs font-semibold ${
                      usernameValidation.available ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {usernameValidation.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Correo electronico</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  value={userEmail ?? ''}
                  readOnly
                  className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface/70 outline-none"
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Bio</label>
              <div className="control-shell rounded-[0.95rem]">
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Agrega una descripcion breve de tu perfil."
                  rows={4}
                  className="w-full resize-none rounded-[0.95rem] bg-transparent px-4 py-4 text-on-surface outline-none"
                />
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
                      fitnessLevel === level ? 'bg-primary text-black shadow-[0_0_24px_rgba(209,252,0,0.24)]' : 'theme-hairline-border border bg-surface-container-low text-on-surface'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={isSavingProfile}
                className="neon-button w-full rounded-[0.95rem] py-4 font-headline text-sm font-black uppercase italic tracking-[0.22em] transition-all active:scale-[0.985] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSavingProfile ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Guardando cambios...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </button>
              <AnimatePresence>
                {profileFeedback.state !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${
                      profileFeedback.state === 'success'
                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                        : profileFeedback.state === 'error'
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                        : 'bg-primary/10 border border-primary/30 text-primary'
                    }`}
                  >
                    {profileFeedback.state === 'success' && <Check size={16} />}
                    {profileFeedback.state === 'error' && <AlertCircle size={16} />}
                    {profileFeedback.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </section>
      )}

      {isEditingGoals && (
        <section className="space-y-8 pb-8">
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-[conic-gradient(from_210deg,#ff7439,#d1fc00,#ff7439)] p-1 shadow-[0_0_30px_rgba(209,252,0,0.16)]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-container text-primary">
                <Target size={32} strokeWidth={1.8} />
              </div>
            </div>
            <p className="mt-4 text-[10px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant">
              Establece tus objetivos semanales
            </p>
          </div>

          <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Volumen Objetivo (kg/semana)</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  type="number"
                  value={editingGoals?.weeklyVolumeTarget ?? 20000}
                  onChange={(event) => {
                    if (editingGoals) {
                      setEditingGoals({
                        ...editingGoals,
                        weeklyVolumeTarget: parseInt(event.target.value) || 0,
                      });
                    }
                  }}
                  placeholder="20000"
                  min="0"
                  step="1000"
                  className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none"
                />
              </div>
              <p className="text-[9px] text-on-surface-variant/60">Meta semanal de kilogramos a levantar</p>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Ejercicios Objetivo (cantidad/semana)</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  type="number"
                  value={editingGoals?.weeklyExercisesTarget ?? 30}
                  onChange={(event) => {
                    if (editingGoals) {
                      setEditingGoals({
                        ...editingGoals,
                        weeklyExercisesTarget: parseInt(event.target.value) || 0,
                      });
                    }
                  }}
                  placeholder="30"
                  min="0"
                  step="5"
                  className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none"
                />
              </div>
              <p className="text-[9px] text-on-surface-variant/60">Meta semanal de ejercicios a completar</p>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Tiempo Objetivo (minutos/semana)</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  type="number"
                  value={editingGoals?.weeklyDurationTarget ?? 300}
                  onChange={(event) => {
                    if (editingGoals) {
                      setEditingGoals({
                        ...editingGoals,
                        weeklyDurationTarget: parseInt(event.target.value) || 0,
                      });
                    }
                  }}
                  placeholder="300"
                  min="0"
                  step="30"
                  className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none"
                />
              </div>
              <p className="text-[9px] text-on-surface-variant/60">Meta semanal de minutos de entrenamiento</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoalsSave}
                disabled={isSavingGoals}
                className="neon-button w-full rounded-[0.95rem] py-4 font-headline text-sm font-black uppercase italic tracking-[0.22em] transition-all active:scale-[0.985] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSavingGoals ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Guardando objetivos...
                  </>
                ) : (
                  'Guardar objetivos'
                )}
              </button>
              <AnimatePresence>
                {goalsFeedback.state !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${
                      goalsFeedback.state === 'success'
                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                        : goalsFeedback.state === 'error'
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                        : 'bg-primary/10 border border-primary/30 text-primary'
                    }`}
                  >
                    {goalsFeedback.state === 'success' && <Check size={16} />}
                    {goalsFeedback.state === 'error' && <AlertCircle size={16} />}
                    {goalsFeedback.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </section>
      )}

      {!isEditingProfile && !isEditingGoals && (
        <section className="space-y-8 pb-8">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-2 border-primary bg-surface-container-low p-1">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-container text-on-surface">
                  <User size={34} strokeWidth={1.9} />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-lg">
                {displayUnits}
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="font-headline text-4xl font-black uppercase italic tracking-tight text-on-background sm:text-5xl">{displayName}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary">•</span>
                <span className="text-[0.72rem] font-medium uppercase tracking-[0.24em] text-on-surface-variant">{displayLevel}</span>
              </div>
              <p className="text-sm text-on-surface-variant">{userEmail ?? 'Sin correo disponible'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">Cuenta</h3>
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
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">Objetivos de Entrenamiento</h3>
            {goals ? (
              <div className="space-y-3">
                <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">Volumen</p>
                      <p className="mt-1 text-2xl font-black text-primary">{Math.round(goals.weeklyVolumeTarget / 1000)}k kg</p>
                    </div>
                  </div>
                  <div className="border-t theme-hairline-border pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">Ejercicios</p>
                      <p className="mt-1 text-2xl font-black text-secondary">{goals.weeklyExercisesTarget}</p>
                    </div>
                  </div>
                  <div className="border-t theme-hairline-border pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">Tiempo</p>
                      <p className="mt-1 text-2xl font-black text-primary">{goals.weeklyDurationTarget}m</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleGoalsEdit}
                  className="flex w-full items-center justify-between rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-left transition-colors hover:bg-surface-container-high"
                >
                  <div className="flex items-center gap-4">
                    <Target size={18} className="text-on-surface-variant" />
                    <span className="font-medium text-on-surface">Editar objetivos</span>
                  </div>
                  <ChevronRight size={18} className="text-outline" />
                </button>
              </div>
            ) : (
              <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-center">
                <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">Cargando objetivos...</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">Preferencias</h3>
            <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Ruler size={18} className="text-on-surface-variant" />
                  <span className="font-medium text-on-surface">Sistema de unidades</span>
                </div>
                <div className="flex rounded-[0.6rem] bg-surface-container-highest p-1">
                  <button
                    type="button"
                    onClick={() => void handleUnitsChange('kg')}
                    className={`rounded-[0.45rem] px-4 py-1.5 text-[10px] font-bold uppercase transition-all ${units === 'kg' ? 'bg-primary text-black' : 'text-on-surface-variant'}`}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUnitsChange('lb')}
                    className={`rounded-[0.45rem] px-4 py-1.5 text-[10px] font-bold uppercase transition-all ${units === 'lb' ? 'bg-primary text-black' : 'text-on-surface-variant'}`}
                  >
                    LB
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">Preferencias</h3>
            <div className="space-y-3">
              <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-on-surface">Tema</span>
                  <div className="text-sm text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full">
                    {themeLabel}
                  </div>
                </div>
                <div className="mt-3 flex rounded-[0.75rem] bg-surface-container-highest p-1">
                  {([
                    { value: 'light', label: 'Claro' },
                    { value: 'dark', label: 'Oscuro' },
                    { value: 'auto', label: 'Auto' },
                  ] as { value: ThemePreference; label: string }[]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => void handleThemePreferenceChange(option.value)}
                      disabled={isUpdatingTheme}
                      className={`flex-1 rounded-[0.55rem] px-3 py-2 text-[10px] font-bold uppercase transition-all ${
                        themePreference === option.value
                          ? 'bg-primary text-black'
                          : 'text-on-surface-variant theme-interactive-hover'
                      } ${isUpdatingTheme ? 'opacity-60' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[9px] text-on-surface-variant/60">
                  {themePreference === 'auto'
                    ? `Se adapta al sistema. Tema efectivo actual: ${resolvedTheme === 'dark' ? 'oscuro' : 'claro'}.`
                    : 'Preferencia visual aplicada en toda la app.'}
                </p>
              </div>
              
              <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-on-surface">Idioma</span>
                  <div className="text-sm text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full">
                    Español
                  </div>
                </div>
                <p className="text-[9px] text-on-surface-variant/60 mt-2">Idioma de la aplicación (coming soon)</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">Actividad</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-[1rem] border-l-2 border-primary bg-surface-container-low p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Historial</p>
                <p className="mt-2 text-2xl font-black text-on-surface">0</p>
                <p className="text-[11px] text-on-surface-variant">Entrenamientos</p>
              </div>
              <div className="relative overflow-hidden rounded-[1rem] border-l-2 border-secondary bg-surface-container-low p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Records</p>
                <p className="mt-2 text-2xl font-black text-on-surface">0</p>
                <p className="text-[11px] text-on-surface-variant">PR registrados</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">Perfil</h3>
            <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
              {bio?.trim() ? bio : 'Aun no agregaste una bio a tu perfil.'}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="flex w-full items-center justify-center gap-3 rounded-[0.95rem] bg-surface-container-high px-4 py-4 text-on-surface transition-all hover:bg-error-container/10 hover:text-error active:scale-[0.985] disabled:opacity-60"
            >
              <LogOut size={18} />
              <span className="font-headline text-sm font-black italic uppercase tracking-[0.18em]">
                {isLoggingOut ? 'Cerrando...' : 'Cerrar sesion'}
              </span>
            </button>
            <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.4em] text-on-surface-variant/40">Kinetic Engine</p>
          </div>
        </section>
      )}

      <AvatarUploadDialog
        isOpen={isAvatarDialogOpen}
        onClose={() => setIsAvatarDialogOpen(false)}
        onUpload={handleAvatarUpload}
        isLoading={isUploadingAvatar}
      />
    </PageShell>
  );
};
