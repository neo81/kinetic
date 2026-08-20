import { useEffect, useState } from 'react';
import { ChevronRight, Edit2, LogOut, Ruler, User, Target, Check, AlertCircle, Loader, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PageShell } from '../components/layout/PageShell';
import { AvatarSection } from '../components/AvatarSection';
import { AvatarUploadDialog } from '../components/AvatarUploadDialog';
import { routinesRepository } from '../features/routines/repository';
import { avatarStorageService } from '../services/avatarStorageService';
import { usernameValidationService, type UsernameValidationResult } from '../services/usernameValidationService';
import type { UserProfile, View, UserGoals } from '../types';
import { SyncDiagnosticsPanel } from '../components/SyncDiagnosticsPanel';
import type { ResolvedTheme, ThemePreference } from '../theme/theme';
import type { AppLanguage, TranslationKey } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageContext';

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
    heightCm?: number | null;
    bodyWeightKg?: number | null;
    avatarUrl?: string;
  }) => Promise<unknown>;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onThemeChange: (theme: ThemePreference) => Promise<void>;
  onLanguageChange: (language: AppLanguage) => Promise<void>;
  onOpenReleaseNotes: () => void;
};

type FeedbackState = 'idle' | 'saving' | 'success' | 'error';

const fitnessLevels = ['Principiante', 'Intermedio', 'Avanzado', 'Competidor'];
const goalsCache = new Map<string, UserGoals>();
const usernameValidationKeys: Record<NonNullable<UsernameValidationResult['reason']>, TranslationKey> = {
  empty: 'settings.username.empty',
  'too-short': 'settings.username.tooShort',
  'too-long': 'settings.username.tooLong',
  'invalid-characters': 'settings.username.invalidCharacters',
  taken: 'settings.username.taken',
  available: 'settings.username.available',
};

export const SettingsView = ({
  setView,
  profile,
  userEmail,
  onLogout,
  onSaveProfile,
  themePreference,
  resolvedTheme,
  onThemeChange,
  onLanguageChange,
  onOpenReleaseNotes,
}: SettingsViewProps) => {
  const { language, t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [units, setUnits] = useState<'kg' | 'lb'>('kg');
  const [heightCm, setHeightCm] = useState('');
  const [bodyWeightKg, setBodyWeightKg] = useState('');
  
  // Username validation state
  const [usernameValidation, setUsernameValidation] = useState<UsernameValidationResult | null>(null);
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);
  
  // Feedback state
  const [profileFeedback, setProfileFeedback] = useState<{ state: FeedbackState; message: string }>({ state: 'idle', message: '' });
  const [goalsFeedback, setGoalsFeedback] = useState<{ state: FeedbackState; message: string }>({ state: 'idle', message: '' });

  // Weekly goals state
  const [goals, setGoals] = useState<UserGoals | null>(() => (
    profile?.id ? goalsCache.get(profile.id) ?? null : null
  ));
  const [isLoadingGoals, setIsLoadingGoals] = useState(() => Boolean(
    profile?.id && !goalsCache.has(profile.id)
  ));
  const [editingGoals, setEditingGoals] = useState<UserGoals | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? '');
    setUsername(profile?.username ?? '');
    setBio(profile?.bio ?? '');
    setFitnessLevel(profile?.fitnessLevel ?? '');
    setUnits(profile?.unitSystem ?? 'kg');
    setHeightCm(profile?.heightCm ? String(profile.heightCm) : '');
    setBodyWeightKg(profile?.bodyWeightKg ? String(profile.bodyWeightKg) : '');
    setProfileImageError(false);
  }, [profile]);

  useEffect(() => {
    const userId = profile?.id;
    if (!userId) {
      setGoals(null);
      setIsLoadingGoals(false);
      return;
    }

    const cachedGoals = goalsCache.get(userId);
    if (cachedGoals) {
      setGoals(cachedGoals);
    }
    setIsLoadingGoals(!cachedGoals);

    let cancelled = false;
    const loadGoals = async () => {
      try {
        const loadedGoals = await routinesRepository.getUserGoals(userId);
        if (cancelled) return;

        goalsCache.set(userId, loadedGoals);
        setGoals(loadedGoals);
      } catch (error) {
        console.error('Error loading goals:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingGoals(false);
        }
      }
    };
    void loadGoals();

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

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
      heightCm: number | null;
      bodyWeightKg: number | null;
      avatarUrl: string;
    }>,
  ) => {
    const parseOptionalNumber = (value: string) => {
      const normalized = value.replace(',', '.').trim();
      if (!normalized) return null;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    };

    await onSaveProfile({
      fullName: overrides?.fullName ?? fullName,
      username: overrides?.username ?? username,
      bio: overrides?.bio ?? bio,
      fitnessLevel: overrides?.fitnessLevel ?? fitnessLevel,
      unitSystem: overrides?.unitSystem ?? units,
      heightCm: overrides?.heightCm ?? parseOptionalNumber(heightCm),
      bodyWeightKg: overrides?.bodyWeightKg ?? parseOptionalNumber(bodyWeightKg),
      avatarUrl: overrides?.avatarUrl,
    });
  };

  const handleProfileSave = async () => {
    if (isSavingProfile) {
      return;
    }

    setIsSavingProfile(true);
    setProfileFeedback({ state: 'saving', message: t('settings.savingChanges') });
    try {
      await saveProfile();
      setProfileFeedback({ state: 'success', message: t('settings.profileSaved') });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setProfileFeedback({ state: 'error', message: t('settings.profileSaveError') });
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
    setGoalsFeedback({ state: 'saving', message: t('settings.goalsSaving') });
    try {
      const userId = profile?.id;
      if (!userId) {
        throw new Error('User ID not available');
      }

      const updated = await routinesRepository.saveUserGoals(userId, editingGoals);
      goalsCache.set(userId, updated);
      setGoals(updated);
      setEditingGoals(null);
      setIsEditingGoals(false);
      setGoalsFeedback({ state: 'success', message: t('settings.goalsSaved') });
    } catch (error) {
      console.error('Error saving goals:', error);
      setGoalsFeedback({ state: 'error', message: t('settings.goalsSaveError') });
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

  const handleLanguagePreferenceChange = async (nextLanguage: AppLanguage) => {
    if (isUpdatingLanguage || language === nextLanguage) {
      return;
    }

    setIsUpdatingLanguage(true);
    try {
      await onLanguageChange(nextLanguage);
    } catch (error) {
      console.error('No se pudo actualizar el idioma:', error);
    } finally {
      setIsUpdatingLanguage(false);
    }
  };

  const themeLabel =
    themePreference === 'auto'
      ? `${t('settings.theme.auto')} (${t(resolvedTheme === 'dark' ? 'settings.theme.dark' : 'settings.theme.light')})`
      : themePreference === 'dark'
        ? t('settings.theme.dark')
        : t('settings.theme.light');

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

  const displayName = fullName.trim() || profile?.fullName?.trim() || t('settings.noProfile');
  const levelLabels = {
    Principiante: t('settings.level.beginner'),
    Intermedio: t('settings.level.intermediate'),
    Avanzado: t('settings.level.advanced'),
    Competidor: t('settings.level.competitor'),
  };
  const storedLevel = fitnessLevel || profile?.fitnessLevel || '';
  const displayLevel = levelLabels[storedLevel as keyof typeof levelLabels] || storedLevel || t('settings.noLevel');
  const displayUnits = units.toUpperCase();
  const shouldShowProfileImage = Boolean(profile?.avatarUrl && !profileImageError);
  const initialHeightCm = profile?.heightCm ? String(profile.heightCm) : '';
  const initialBodyWeightKg = profile?.bodyWeightKg ? String(profile.bodyWeightKg) : '';
  const hasUnsavedProfileChanges = isEditingProfile && (
    fullName !== (profile?.fullName ?? '')
    || username !== (profile?.username ?? '')
    || bio !== (profile?.bio ?? '')
    || fitnessLevel !== (profile?.fitnessLevel ?? '')
    || heightCm !== initialHeightCm
    || bodyWeightKg !== initialBodyWeightKg
  );
  const hasUnsavedGoalChanges = isEditingGoals
    && editingGoals !== null
    && JSON.stringify(editingGoals) !== JSON.stringify(goals);
  const cancelEditing = () => {
    if (isEditingProfile) setIsEditingProfile(false);
    if (isEditingGoals) {
      setIsEditingGoals(false);
      setEditingGoals(null);
    }
  };

  return (
    <PageShell
      activeView="settings"
      setView={setView}
      profile={profile}
      hasUnsavedChanges={hasUnsavedProfileChanges || hasUnsavedGoalChanges}
      contentClassName="pb-24"
    >
      {(isEditingProfile || isEditingGoals) && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={cancelEditing}
            className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-on-surface-variant transition-colors hover:text-secondary"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {isEditingProfile && (
        <section className="space-y-8 pb-8">
          <AvatarSection
            profile={profile}
            isEditing={true}
            onUploadClick={() => setIsAvatarDialogOpen(true)}
          />

          <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
            <div className="space-y-2">
              <label htmlFor="fullname-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.fullName')}</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  id="fullname-input"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={t('settings.fullNamePlaceholder')}
                  className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="username-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.username')}</label>
              <div className={`relative control-shell rounded-[0.95rem] ${
                usernameValidation ? (usernameValidation.available ? 'border-green-500/30' : 'border-red-500/30') : ''
              }`}>
                <input
                  id="username-input"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t('settings.usernamePlaceholder')}
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
                    {usernameValidation.reason
                      ? t(usernameValidationKeys[usernameValidation.reason])
                      : usernameValidation.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <label htmlFor="email-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.email')}</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  id="email-input"
                  value={userEmail ?? ''}
                  readOnly
                  className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface/70 outline-none"
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bio-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.bio')}</label>
              <div className="control-shell rounded-[0.95rem]">
                <textarea
                  id="bio-input"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder={t('settings.bioPlaceholder')}
                  rows={4}
                  className="w-full resize-none rounded-[0.95rem] bg-transparent px-4 py-4 text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="fitness-level" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.fitnessLevel')}</label>
              <div className="flex flex-wrap gap-3">
                {fitnessLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFitnessLevel(level)}
                    className={`rounded-full px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] transition-all ${
                      fitnessLevel === level ? 'theme-primary-shadow-soft bg-primary text-black' : 'theme-hairline-border border bg-surface-container-low text-on-surface'
                    }`}
                  >
                    {levelLabels[level as keyof typeof levelLabels]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="height-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.height')}</label>
                <div className="control-shell rounded-[0.95rem]">
                  <input
                    id="height-input"
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value.replace(',', '.'))}
                    placeholder="cm"
                    inputMode="decimal"
                    className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="body-weight-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.weight')}</label>
                <div className="control-shell rounded-[0.95rem]">
                  <input
                    id="body-weight-input"
                    value={bodyWeightKg}
                    onChange={(event) => setBodyWeightKg(event.target.value.replace(',', '.'))}
                    placeholder="kg"
                    inputMode="decimal"
                    className="h-14 w-full rounded-[0.95rem] bg-transparent px-4 text-on-surface outline-none"
                  />
                </div>
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
                    {t('settings.savingChanges')}
                  </>
                ) : (
                  t('settings.saveChanges')
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
                        : 'theme-primary-border-soft theme-primary-text border theme-primary-tint'
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
            <div className="theme-primary-orbit h-20 w-20 rounded-full p-1">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-container text-primary">
                <Target size={32} strokeWidth={1.8} />
              </div>
            </div>
            <p className="mt-4 text-[10px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant">
              {t('settings.weeklyGoalsHint')}
            </p>
          </div>

          <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
            <div className="space-y-3">
              <label htmlFor="volume-target-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.volumeGoal')}</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  id="volume-target-input"
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
              <p className="text-[9px] text-on-surface-variant/60">{t('settings.volumeGoalHint')}</p>
            </div>

            <div className="space-y-3">
              <label htmlFor="exercises-target-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.exerciseGoal')}</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  id="exercises-target-input"
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
              <p className="text-[9px] text-on-surface-variant/60">{t('settings.exerciseGoalHint')}</p>
            </div>

            <div className="space-y-3">
              <label htmlFor="duration-target-input" className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('settings.timeGoal')}</label>
              <div className="control-shell rounded-[0.95rem]">
                <input
                  id="duration-target-input"
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
              <p className="text-[9px] text-on-surface-variant/60">{t('settings.timeGoalHint')}</p>
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
                    {t('settings.goalsSaving')}
                  </>
                ) : (
                  t('settings.saveGoals')
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
                        : 'theme-primary-border-soft theme-primary-text border theme-primary-tint'
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
              <div className="h-24 w-24 overflow-hidden rounded-full border border-on-surface-variant/20 bg-surface-container-low p-1">
                {shouldShowProfileImage ? (
                  <img
                    src={profile?.avatarUrl}
                    alt={t('header.profilePhoto')}
                    className="h-full w-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-container text-on-surface">
                    <User size={34} strokeWidth={1.9} />
                  </div>
                )}
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
              <p className="text-sm text-on-surface-variant">{userEmail ?? t('settings.noEmail')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('settings.account')}</h3>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex w-full items-center justify-between rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-left transition-colors hover:bg-surface-container-high"
            >
              <div className="flex items-center gap-4">
                <User size={18} className="text-on-surface-variant" />
                <span className="font-medium text-on-surface">{t('settings.editProfile')}</span>
              </div>
              <ChevronRight size={18} className="text-outline" />
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('settings.trainingGoals')}</h3>
            <div className="space-y-3" aria-busy={isLoadingGoals}>
              <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">{t('settings.volume')}</p>
                    <p className="mt-1 text-2xl font-black text-primary">{goals ? `${Math.round(goals.weeklyVolumeTarget / 1000)}k kg` : '--'}</p>
                  </div>
                </div>
                <div className="border-t theme-hairline-border pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">{t('settings.exercises')}</p>
                    <p className="mt-1 text-2xl font-black text-secondary">{goals?.weeklyExercisesTarget ?? '--'}</p>
                  </div>
                </div>
                <div className="border-t theme-hairline-border pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">{t('settings.time')}</p>
                    <p className="mt-1 text-2xl font-black text-primary">{goals ? `${goals.weeklyDurationTarget}m` : '--'}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleGoalsEdit}
                disabled={!goals}
                className="flex w-full items-center justify-between rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-left transition-colors hover:bg-surface-container-high disabled:cursor-default"
              >
                <div className="flex items-center gap-4">
                  <Target size={18} className="text-on-surface-variant" />
                  <span className="font-medium text-on-surface">{t('settings.editGoals')}</span>
                </div>
                <ChevronRight size={18} className="text-outline" />
              </button>
              {isLoadingGoals ? (
                <span className="sr-only" role="status" aria-live="polite">{t('settings.loadingGoals')}</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('settings.preferences')}</h3>
            <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Ruler size={18} className="text-on-surface-variant" />
                  <span className="font-medium text-on-surface">{t('settings.units')}</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">{t('settings.height')}</p>
                <p className="mt-1 text-2xl font-black text-on-surface">{profile?.heightCm ? `${profile.heightCm} cm` : '--'}</p>
              </div>
              <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">{t('settings.weight')}</p>
                <p className="mt-1 text-2xl font-black text-on-surface">{profile?.bodyWeightKg ? `${profile.bodyWeightKg} kg` : '--'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('settings.preferences')}</h3>
            <div className="space-y-3">
              <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-on-surface">{t('settings.theme')}</span>
                  <div className="text-sm text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full">
                    {themeLabel}
                  </div>
                </div>
                <div className="mt-3 flex rounded-[0.75rem] bg-surface-container-highest p-1">
                  {([
                    { value: 'light', label: t('settings.theme.light') },
                    { value: 'dark', label: t('settings.theme.dark') },
                    { value: 'auto', label: t('settings.theme.auto') },
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
                    ? `${t('settings.theme.autoDescription')} ${t(resolvedTheme === 'dark' ? 'settings.theme.dark' : 'settings.theme.light').toLocaleLowerCase(language)}.`
                    : t('settings.theme.description')}
                </p>
              </div>
              
              <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-on-surface">{t('settings.language.title')}</span>
                  <div className="text-sm text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full">
                    {t(`settings.language.current.${language}`)}
                  </div>
                </div>
                <div className="mt-3 flex rounded-[0.75rem] bg-surface-container-highest p-1">
                  {(['es-419', 'en'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => void handleLanguagePreferenceChange(option)}
                      disabled={isUpdatingLanguage}
                      aria-pressed={language === option}
                      className={`flex-1 rounded-[0.55rem] px-3 py-2 text-[10px] font-bold uppercase transition-all ${
                        language === option
                          ? 'bg-primary text-black'
                          : 'text-on-surface-variant theme-interactive-hover'
                      }`}
                    >
                      {t(`settings.language.option.${option}`)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[9px] text-on-surface-variant/60">
                  {t(`settings.language.description.${language}`)}
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenReleaseNotes}
                className="flex w-full items-center justify-between rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-left transition-colors hover:bg-surface-container-high"
              >
                <div className="flex items-center gap-4">
                  <Sparkles size={18} className="text-primary" />
                  <div>
                    <span className="font-medium text-on-surface">{t('release.news')}</span>
                    <p className="mt-1 text-[9px] text-on-surface-variant/60">{t('settings.releaseDescription')}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-outline" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('settings.activity')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-[1rem] border-l-2 border-primary bg-surface-container-low p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{t('nav.history')}</p>
                <p className="mt-2 text-2xl font-black text-on-surface">0</p>
                <p className="text-[11px] text-on-surface-variant">{t('settings.workouts')}</p>
              </div>
              <div className="relative overflow-hidden rounded-[1rem] border-l-2 border-secondary bg-surface-container-low p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{t('settings.records')}</p>
                <p className="mt-2 text-2xl font-black text-on-surface">0</p>
                <p className="text-[11px] text-on-surface-variant">{t('settings.registeredPrs')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('settings.sync')}</h3>
            <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4">
              <SyncDiagnosticsPanel />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('settings.profile')}</h3>
            <div className="rounded-[0.95rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
              {bio?.trim() ? bio : t('settings.noBio')}
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
                {isLoggingOut ? t('settings.signingOut') : t('settings.signOut')}
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
