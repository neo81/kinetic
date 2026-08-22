import { useEffect, useState, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { Database, Json } from '../lib/supabase/database.types';
import { initialRoutines } from './initialData';
import { consumeRoutinesRepositoryNotice, routinesRepository } from '../features/routines/repository';
import { RoutineRepositoryError } from '../features/routines/errors';
import type { ActiveSession, Exercise, Routine, UserProfile, View } from '../types';
import { syncQueue, syncStatusManager } from '../services/syncQueue';
import { exportSessionDataForRPC } from '../services/sessionCompletion/exportSessionData';
import { invokeEndSession } from '../services/sessionCompletion/invokeEndSession';
import { ensureWeeklyStatsBackfilled } from '../services/dataBackfill/backfillWeeklyStats';
import { preferencesService } from '../services/preferencesService';
import { normalizeRestTimerPresets } from '../features/restTimer/presets';
import { reorderRoutineDayExercises } from '../features/routines/reorderExercises';
import { useTheme } from '../hooks/useTheme';
import type { ThemePreference } from '../theme/theme';
import { useLanguage } from '../i18n/LanguageContext';
import { normalizeLanguage } from '../i18n/languageStorage';
import type { AppLanguage } from '../i18n/translations';

type AppBannerState = {
  level: 'error' | 'warning';
  title: string;
  message: string;
};

const ACTIVE_SESSION_STORAGE_KEY = 'kinetic.activeSession';
const LAST_ROUTINE_STORAGE_KEY = 'kinetic.lastRoutineId';

const getDefaultRoutineDayId = (routine: Routine | null) =>
  routine?.dayEntries?.find((day) => day.dayType === 'core')?.id ||
  routine?.dayEntries?.[0]?.id ||
  null;

const getUserProfilePayload = (user: User): Database['public']['Tables']['profiles']['Insert'] => ({
  id: user.id,
  full_name:
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null,
  avatar_url:
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null,
});

const mapProfileRow = (
  profile: Database['public']['Tables']['profiles']['Row'],
): UserProfile => ({
  id: profile.id,
  fullName: profile.full_name,
  username: profile.username,
  avatarUrl: profile.avatar_url,
  unitSystem: profile.unit_system === 'lb' ? 'lb' : 'kg',
  bio: profile.bio,
  fitnessLevel: profile.fitness_level,
  heightCm: profile.height_cm === null ? null : Number(profile.height_cm),
  bodyWeightKg: profile.body_weight_kg === null ? null : Number(profile.body_weight_kg),
});

const loadPersistedActiveSession = (): ActiveSession | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ActiveSession & { exerciseGroupsByDay?: unknown };
    if (!parsed?.id || !parsed.routineId || !parsed.activeRoutineDayId || !Array.isArray(parsed.routineDayIds)) {
      return null;
    }
    if ('exerciseGroupsByDay' in parsed) {
      delete parsed.exerciseGroupsByDay;
      window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(parsed));
    }
    if (!Array.isArray(parsed.skippedExercises)) {
      parsed.skippedExercises = [];
    }
    return parsed;
  } catch {
    return null;
  }
};

const persistActiveSession = (session: ActiveSession | null) => {
  if (typeof window === 'undefined') return;

  try {
    if (!session) {
      window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    // Handle QuotaExceededError specifically
    if (error instanceof DOMException && error.code === 22) {
      console.error('[persistActiveSession] localStorage quota exceeded, attempting cleanup');
      
      // Try to free up space by clearing routines cache (non-critical data)
      try {
        window.localStorage.removeItem('kinetic:v1:routines-local-cache');
        // Retry persisting the session after cleanup
        window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
        console.log('[persistActiveSession] Session saved after cache cleanup');
      } catch (retryError) {
        console.error('[persistActiveSession] Failed to save session even after cache cleanup:', retryError);
        throw new Error('Unable to save session: storage quota exceeded');
      }
    } else {
      console.error('[persistActiveSession] Unexpected error:', error);
      throw error;
    }
  }
};

const loadLastRoutineId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_ROUTINE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const persistLastRoutineId = (routineId: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (!routineId) {
      window.localStorage.removeItem(LAST_ROUTINE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(LAST_ROUTINE_STORAGE_KEY, routineId);
  } catch {
    // ignore storage write errors
  }
};

export const useAppState = () => {
  const {
    themePreference,
    resolvedTheme,
    setThemePreference,
  } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (error instanceof RoutineRepositoryError) {
      switch (error.code) {
        case 'SUPABASE_AUTH':
          return t('error.sessionInvalid');
        case 'SUPABASE_NETWORK':
          return t('error.unstableConnection');
        case 'SUPABASE_QUERY':
          return t('error.serverUnavailable');
        default:
          return fallbackMessage;
      }
    }

    return fallbackMessage;
  }, [t]);
  const [view, setView] = useState<View>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [currentRoutine, setCurrentRoutine] = useState<Routine | null>(null);
  const [selectedRoutineDayId, setSelectedRoutineDayId] = useState<string | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [navigationSource, setNavigationSource] = useState<View>('dashboard');
  const [appBanner, setAppBanner] = useState<AppBannerState | null>(null);
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [restTimerPresets, setRestTimerPresets] = useState<number[]>([]);
  
  // Ref para evitar ciclos de renderizado y rastrear inicializacion
  const authInitialized = useRef(false);

  const syncRoutines = useCallback(async () => {
    try {
      const routines = await routinesRepository.list();
      setRoutines(routines);
      const repositoryNotice = consumeRoutinesRepositoryNotice();
      if (repositoryNotice) {
        setAppBanner({
          level: repositoryNotice.level,
          title: t(repositoryNotice.code === 'partialSync' ? 'routines.partialSyncTitle' : 'routines.localSaveTitle'),
          message: t(repositoryNotice.code === 'partialSync' ? 'routines.partialSyncMessage' : 'routines.localSaveMessage'),
        });
      }
    } catch (error) {
      console.error('No se pudieron sincronizar las rutinas:', error);
      setAppBanner({
        level: 'error',
        title: t('banner.syncFailed'),
        message: getErrorMessage(error, t('banner.checkConnection')),
      });
    }
  }, [getErrorMessage, t]);

  const syncRoutinesRef = useRef(syncRoutines);
  useEffect(() => {
    syncRoutinesRef.current = syncRoutines;
  }, [syncRoutines]);

  const ensureProfileExists = useCallback(async (user: User) => {
    if (!supabase) return;

    const { data: existingProfile, error: profileQueryError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileQueryError) throw profileQueryError;
    if (existingProfile) return;

    const payload = getUserProfilePayload(user);
    const { error: insertError } = await supabase
      .from('profiles')
      .insert(payload);

    if (insertError) throw insertError;
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const mapped = mapProfileRow(data);
    setProfile(mapped);
    return mapped;
  }, []);

  const loadUserPreferences = useCallback(async (userId: string) => {
    const preferences = await preferencesService.getPreferences(userId);
    if (preferences?.theme) {
      setThemePreference(preferences.theme);
    } else {
      setThemePreference('dark');
    }

    const remoteLanguage = normalizeLanguage(preferences?.language);
    if (remoteLanguage) {
      setLanguage(remoteLanguage);
    }

    setRestTimerPresets(normalizeRestTimerPresets(preferences?.rest_timer_presets_seconds));

    return preferences;
  }, [setLanguage, setThemePreference]);

  const handleRestTimerPresetsChange = useCallback(async (nextValues: number[]) => {
    if (!user?.id) return;

    const normalizedValues = normalizeRestTimerPresets(nextValues);
    const previousValues = restTimerPresets;
    setRestTimerPresets(normalizedValues);

    try {
      await preferencesService.updatePreferences(user.id, {
        rest_timer_presets_seconds: normalizedValues,
      });
    } catch (error) {
      setRestTimerPresets(previousValues);
      setAppBanner({
        level: 'error',
        title: t('session.presetSaveFailed'),
        message: t('session.presetSaveFailedHint'),
      });
    }
  }, [restTimerPresets, t, user?.id]);

  const syncActiveSessionFromStorage = useCallback(async () => {
    if (!supabase) return;

    const persisted = loadPersistedActiveSession();
    if (!persisted?.id) {
      setActiveSession(null);
      return;
    }

    const { data, error } = await supabase
      .from('routine_sessions')
      .select('id, routine_id, status')
      .eq('id', persisted.id)
      .maybeSingle();

    if (error || !data || data.status !== 'in_progress' || !data.routine_id) {
      persistActiveSession(null);
      setActiveSession(null);
      return;
    }

    setActiveSession({
      ...persisted,
      routineId: data.routine_id,
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    if (view === 'routine-creator') return;
    if (currentRoutine || routines.length === 0) return;
    const lastRoutineId = loadLastRoutineId();
    if (!lastRoutineId) return;
    const matched = routines.find((routine) => routine.id === lastRoutineId) ?? null;
    if (matched) {
      setCurrentRoutine(matched);
    }
  }, [currentRoutine, routines, view]);

  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      setIsAppLoading((loading) => {
        if (loading) console.warn('Forcing splash screen hide after timeout');
        return false;
      });
    }, 6000); // Dar un poco más de margen en iOS

    if (!supabase) {
      // Si supabase no está configurado, no hacer nada más
      return () => {
        clearTimeout(fallbackTimeout);
      };
    }

    const handleAuthState = async (session: any) => {
      try {
        const isNowLoggedIn = !!session;
        setIsLoggedIn(isNowLoggedIn);
        setUser(session?.user ?? null);

        if (isNowLoggedIn) {
          try {
            await ensureProfileExists(session.user);
            // Parallelize profile, theme, and backfill operations
            await Promise.all([
              loadProfile(session.user.id),
              loadUserPreferences(session.user.id),
              ensureWeeklyStatsBackfilled(session.user.id),
            ]);
          } catch (error) {
            console.error('Error cargando perfil o backfill:', error);
          }
          // Parallelize routine and session sync
          await Promise.all([
            syncRoutinesRef.current(),
            syncActiveSessionFromStorage(),
          ]);
          setView((current) => current === 'login' ? 'dashboard' : current);
        } else {
          setRoutines(initialRoutines);
          setProfile(null);
          setActiveSession(null);
          persistActiveSession(null);
          // Solo redirigir si no estamos en medio de un flujo de OAuth
          if (!window.location.hash.includes('access_token') && !window.location.search.includes('code=')) {
            setView('login');
          }
        }
      } finally {
        authInitialized.current = true;
        // Un pequeño delay para que React procese los cambios de estado antes de quitar el splash
        setTimeout(() => setIsAppLoading(false), 500);
      }
    };

    // 1. Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // En iOS PWA, a veces el evento INITIAL_SESSION no llega rapido
      handleAuthState(session);
    });

    // 2. Verificación inmediata
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authInitialized.current) {
         handleAuthState(session);
      }
    });

    return () => {
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [ensureProfileExists, loadProfile, loadUserPreferences, syncActiveSessionFromStorage]);

  const handleThemeChange = useCallback(async (nextTheme: ThemePreference) => {
    const previousTheme = themePreference;
    setThemePreference(nextTheme);

    if (!user?.id) {
      return;
    }

    try {
      const existingPreferences = await preferencesService.getPreferences(user.id);
      if (!existingPreferences) {
        await preferencesService.createDefaultPreferences(user.id);
      }

      await preferencesService.updatePreferences(user.id, { theme: nextTheme });
    } catch (error) {
      console.error('No se pudo actualizar el tema:', error);
      setThemePreference(previousTheme);
      throw error;
    }
  }, [setThemePreference, themePreference, user?.id]);

  const handleLanguageChange = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);

    if (!user?.id) {
      return;
    }

    try {
      const existingPreferences = await preferencesService.getPreferences(user.id);
      if (!existingPreferences) {
        await preferencesService.createDefaultPreferences(user.id, {
          language: nextLanguage,
          theme: themePreference,
        });
        return;
      }

      await preferencesService.updatePreferences(user.id, { language: nextLanguage });
    } catch (error) {
      console.error('No se pudo actualizar el idioma:', error);
      throw error;
    }
  }, [setLanguage, themePreference, user?.id]);

  const handleLoginWithGoogle = async (): Promise<{ started: boolean; error?: string }> => {
    if (!supabase) {
      const message = t('login.configError');
      setAppBanner({ level: 'error', title: t('common.error'), message });
      return { started: false, error: message };
    }

    setIsAppLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setIsAppLoading(false);
      setAppBanner({ level: 'error', title: t('login.authError'), message: t('login.authFailedMessage') });
      return { started: false, error: error.message };
    }

    return { started: true };
  };

  const handleLoginWithEmail = async (email: string, pass: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      setAppBanner({ level: 'error', title: t('login.accessDenied'), message: t('login.invalidCredentials') });
    }
  };

  const handleRegisterWithEmail = async (email: string, pass: string) => {
    if (!supabase) return;
    const { error, data } = await supabase.auth.signUp({ email, password: pass });
    if (error) {
      setAppBanner({ level: 'error', title: t('login.registrationError'), message: t('login.registrationFailedMessage') });
    } else if (data.session || data.user) {
      setAppBanner({ level: 'warning', title: t('login.confirmAccount'), message: t('login.checkEmail') });
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut({ scope: 'global' }).catch(console.error);
    }

    setIsLoggedIn(false);
    setUser(null);
    setRoutines(initialRoutines);
    setCurrentRoutine(null);
    setSelectedRoutineDayId(null);
    setSelectedExercise(null);
    setEditingInstanceId(null);
    setNavigationSource('dashboard');
    setOpenDayId(null);
    setActiveSession(null);
    setAppBanner(null);
    setProfile(null);
    persistActiveSession(null);
    setView('login');
  };

  const handleSetCurrentRoutine = useCallback((routine: Routine | null) => {
    setCurrentRoutine(routine);
    if (routine?.id) {
      persistLastRoutineId(routine.id);
    }
  }, []);

  const handleSaveProfile = async (input: {
    fullName: string;
    username: string;
    bio: string;
    fitnessLevel: string;
    unitSystem: 'kg' | 'lb';
    heightCm?: number | null;
    bodyWeightKg?: number | null;
    avatarUrl?: string;
  }) => {
    if (!supabase || !user) throw new Error('No hay una sesión activa.');

    const updateData: Database['public']['Tables']['profiles']['Update'] = {
      full_name: input.fullName.trim() || null,
      username: input.username.trim() || null,
      bio: input.bio.trim() || null,
      fitness_level: input.fitnessLevel || null,
      unit_system: input.unitSystem,
      height_cm: input.heightCm ?? null,
      body_weight_kg: input.bodyWeightKg ?? null,
    };

    // Only update avatar_url if provided
    if (input.avatarUrl !== undefined) {
      updateData.avatar_url = input.avatarUrl;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    const mapped = mapProfileRow(data);
    setProfile(mapped);
    setAppBanner({
      level: 'warning',
      title: t('banner.profileUpdated'),
      message: t('banner.changesSaved'),
    });
    return mapped;
  };

  const startSession = async (routineId: string, routineName: string, routineDayIds: string | string[]) => {
    if (!supabase || !user) return;
    if (activeSession) {
      setAppBanner({
        level: 'warning',
        title: t('banner.sessionInProgress'),
        message: t('banner.finishCurrentFirst'),
      });
      return;
    }
    try {
      // Support both single string (backward compat) and array
      const dayIdsArray = Array.isArray(routineDayIds) ? routineDayIds : [routineDayIds];

      const { data, error } = await supabase.from('routine_sessions').insert({
        routine_id: routineId,
        user_id: user.id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }).select('id').single();

      if (error) throw error;

      const nextSession: ActiveSession = {
        id: data.id,
        routineId,
        routineName,
        routineDayIds: dayIdsArray,
        activeRoutineDayId: dayIdsArray[0],
        startTimeMs: Date.now(),
        completedExercises: [],
        skippedExercises: [],
        completedDayIds: [],
        performanceData: {}
      };
      setActiveSession(nextSession);
      persistActiveSession(nextSession);
      persistLastRoutineId(routineId);
      setAppBanner({
        level: 'warning',
        title: t('banner.workoutStarted'),
        message: t('banner.sessionBackground'),
      });
    } catch (error) {
      console.error('Error al iniciar sesión', error);
      setAppBanner({
        level: 'error',
        title: t('banner.startFailed'),
        message: t('banner.tryConnection'),
      });
    }
  };

  const cancelSession = async () => {
    if (!supabase || !activeSession) return;

    try {
      const { error } = await supabase
        .from('routine_sessions')
        .update({
          status: 'cancelled',
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      setActiveSession(null);
      persistActiveSession(null);
      setAppBanner({
        level: 'warning',
        title: t('banner.workoutCanceled'),
        message: t('banner.canceledNoProgress'),
      });
    } catch (error) {
      console.error('Error al cancelar sesión', error);
      setAppBanner({
        level: 'error',
        title: t('banner.cancelFailed'),
        message: t('banner.tryAgainSoon'),
      });
    }
  };

  const toggleExerciseComplete = useCallback((exerciseInstanceId: string) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const skippedExercises = prev.skippedExercises ?? [];
      const isSkipped = skippedExercises.includes(exerciseInstanceId);
      const nextPerformanceData = { ...prev.performanceData };
      delete nextPerformanceData[exerciseInstanceId];
      const nextSession = {
        ...prev,
        skippedExercises: isSkipped
          ? skippedExercises.filter(id => id !== exerciseInstanceId)
          : [...skippedExercises, exerciseInstanceId],
        completedExercises: prev.completedExercises.filter(id => id !== exerciseInstanceId),
        performanceData: nextPerformanceData,
      };
      persistActiveSession(nextSession);
      return nextSession;
    });
  }, []);

  const captureSetPerformance = useCallback((
    exerciseId: string,
    setNumber: number,
    actualReps: number | null,
    actualWeight: number | null,
    actualDurationMinutes: number | null,
    actualDurationSeconds: number | null,
    totalSets?: number
  ) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const currentExercisePerformance = {
        ...(prev.performanceData[exerciseId] || {}),
        [setNumber]: {
          actualReps,
          actualWeight,
          actualDurationMinutes,
          actualDurationSeconds,
          captured: true
        }
      };
      const skippedExercises = (prev.skippedExercises ?? []).filter((id) => id !== exerciseId);
      const completedSetCount = Object.values(currentExercisePerformance).filter(
        (set): set is typeof currentExercisePerformance[number] => !!set && typeof set === 'object' && 'captured' in set && !!set.captured,
      ).length;
      const shouldMarkExerciseComplete = typeof totalSets === 'number' && totalSets > 0 && completedSetCount >= totalSets;
      const nextSession = {
        ...prev,
        completedExercises: shouldMarkExerciseComplete
          ? Array.from(new Set([...prev.completedExercises, exerciseId]))
          : prev.completedExercises.filter((id) => id !== exerciseId),
        skippedExercises,
        performanceData: {
          ...prev.performanceData,
          [exerciseId]: currentExercisePerformance,
        }
      };
      persistActiveSession(nextSession);
      return nextSession;
    });
  }, []);

  const clearCapturedSetPerformance = useCallback((
    exerciseId: string,
    setNumber: number,
    totalSets?: number,
  ) => {
    setActiveSession((prev) => {
      if (!prev?.performanceData[exerciseId]?.[setNumber]) return prev;

      const nextExercisePerformance = { ...prev.performanceData[exerciseId] };
      delete nextExercisePerformance[setNumber];

      const nextPerformanceData = { ...prev.performanceData };
      if (Object.keys(nextExercisePerformance).length === 0) {
        delete nextPerformanceData[exerciseId];
      } else {
        nextPerformanceData[exerciseId] = nextExercisePerformance;
      }

      const completedSetCount = Object.values(nextExercisePerformance).filter(
        (set): set is typeof nextExercisePerformance[number] => !!set && typeof set === 'object' && 'captured' in set && !!set.captured,
      ).length;
      const shouldKeepExerciseComplete = typeof totalSets === 'number' && totalSets > 0 && completedSetCount >= totalSets;

      const nextSession = {
        ...prev,
        completedExercises: shouldKeepExerciseComplete
          ? Array.from(new Set([...prev.completedExercises, exerciseId]))
          : prev.completedExercises.filter((id) => id !== exerciseId),
        performanceData: nextPerformanceData,
      };

      persistActiveSession(nextSession);
      return nextSession;
    });
  }, []);

  const switchSessionDay = useCallback((dayId: string) => {
    setActiveSession((prev) => {
      if (!prev || !prev.routineDayIds.includes(dayId)) return prev;
      const nextSession = {
        ...prev,
        activeRoutineDayId: dayId,
      };
      persistActiveSession(nextSession);
      return nextSession;
    });
  }, []);

  const endSession = async () => {
    if (!supabase || !activeSession) return;
    let didQueueSuccessfully = false;
    let wasDirectlySaved = false;
    const endedAt = new Date().toISOString();

    try {
      // IMPROVED: Better routine lookup with validation
      let activeRoutine: Routine | null = null;
      try {
        // First try: currentRoutine if ID matches
        if (currentRoutine?.id === activeSession.routineId) {
          activeRoutine = currentRoutine;
        } else {
          // Second try: find in routines array
          activeRoutine = routines.find((routine) => routine.id === activeSession.routineId) ?? null;
        }
        
        if (!activeRoutine) {
          console.warn('[endSession] WARNING: Could not find active routine, data may be incomplete');
          // Continue anyway with null - exportSessionDataForRPC handles this
        }
      } catch (lookupError) {
        console.error('[endSession] Error looking up active routine:', lookupError);
        activeRoutine = null;
      }

      if (activeSession.id) {
        // Prepare session data for RPC transaction
        const sessionData = exportSessionDataForRPC(activeSession, activeRoutine);
        const payloadSize = JSON.stringify(sessionData).length;
        const payloadSizeKB = (payloadSize / 1024).toFixed(2);
        console.log(`[endSession] Session payload size: ${payloadSizeKB}KB`);

        // IMPROVED: Warn if payload is large
        if (payloadSize > 500 * 1024) {
          console.warn(`[endSession] WARNING: Payload is ${payloadSizeKB}KB, may cause issues. Queuing instead of direct invoke.`);
          throw new Error('Payload too large, will queue instead');
        }

        console.log('[endSession] Attempting direct invoke of end-session function');
        await invokeEndSession({
          sessionId: activeSession.id,
          endedAt,
          sessionData: sessionData as unknown as Json,
        });

        console.log('[endSession] ✓ Session saved directly to server');
        syncStatusManager.recordSyncSuccess();
        didQueueSuccessfully = true;
        wasDirectlySaved = true;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[endSession] Failed to save directly, queuing for retry:', errorMsg);

      // CRITICAL: Ensure session is queued even if everything fails
      if (activeSession) {
        let queueAttempts = 0;
        const maxQueueAttempts = 3;

        while (queueAttempts < maxQueueAttempts && !didQueueSuccessfully) {
          queueAttempts++;
          try {
            // IMPROVED: Same routine lookup logic
            let activeRoutine: Routine | null = null;
            try {
              if (currentRoutine?.id === activeSession.routineId) {
                activeRoutine = currentRoutine;
              } else {
                activeRoutine = routines.find((routine) => routine.id === activeSession.routineId) ?? null;
              }
            } catch (lookupError) {
              console.error('[endSession] Error looking up routine during queue attempt:', lookupError);
            }
            
            const sessionData = exportSessionDataForRPC(activeSession, activeRoutine);

            console.log(
              `[endSession] Queuing session (attempt ${queueAttempts}/${maxQueueAttempts})`
            );

            // Ensure syncQueue is available
            if (!syncQueue) {
              throw new Error('SyncQueue not available');
            }

            syncQueue.add({
              type: 'session_end',
              priority: 'high',
              payload: {
                sessionId: activeSession.id,
                endedAt,
                sessionData,
              },
              createdAt: Date.now(),
              attemptCount: 1,
            });

            console.log('[endSession] ✓ Session queued successfully for retry');
            didQueueSuccessfully = true;
          } catch (queueError) {
            const queueErrorMsg = queueError instanceof Error ? queueError.message : String(queueError);
            console.error(
              `[endSession] Queue attempt ${queueAttempts}/${maxQueueAttempts} failed: ${queueErrorMsg}`
            );

            if (queueAttempts < maxQueueAttempts) {
              // Exponential backoff before retrying
              const delay = Math.pow(2, queueAttempts) * 500; // 1s, 2s, 4s
              console.log(`[endSession] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        if (!didQueueSuccessfully) {
          // FALLBACK: Try one last time with minimal payload
          try {
            console.log('[endSession] CRITICAL: Attempting minimal queue payload');
            syncQueue.add({
              type: 'session_end',
              priority: 'high',
              payload: {
                sessionId: activeSession.id,
                endedAt,
                sessionData: { days: [], exercises: [], sets: [] }, // Minimal valid payload
              },
              createdAt: Date.now(),
              attemptCount: 1,
            });
            console.log('[endSession] ✓ Minimal payload queued');
            didQueueSuccessfully = true;
          } catch (fallbackError) {
            console.error('[endSession] CRITICAL: All queue attempts failed:', fallbackError);
            // IMPROVED: Record error even if queue fails
            syncStatusManager.recordSyncError(
              fallbackError instanceof Error 
                ? fallbackError 
                : new Error('[endSession] Failed to queue session: ' + String(fallbackError))
            );
          }
        }
      }

      // Always show banner, even if queueing failed
      if (!didQueueSuccessfully) {
        setAppBanner({
          level: 'error',
          title: t('banner.saveSessionError'),
          message: t('banner.saveSessionErrorMessage'),
        });
        // IMPROVED: Record error in sync status manager
        syncStatusManager.recordSyncError(
          new Error(error instanceof Error ? error.message : String(error))
        );
      } else {
        setAppBanner({
          level: 'warning',
          title: t('banner.sessionQueued'),
          message: t('banner.sessionQueuedMessage'),
        });
      }
    } finally {
      // IMPROVED: Clean up session only after successful direct save or successful queue
      if (didQueueSuccessfully || wasDirectlySaved) {
        try {
          setActiveSession(null);
          persistActiveSession(null);
          syncRoutines();
          
          if (wasDirectlySaved) {
            setAppBanner({
              level: 'warning',
              title: t('banner.workoutFinished'),
              message: t('banner.workoutFinishedMessage'),
            });
          }
        } catch (persistError) {
          console.error('[endSession] Error cleaning up session:', persistError);
        }
      }
    }
  };

  const handleStartNewRoutine = () => {
    setCurrentRoutine(null);
    setSelectedRoutineDayId(null);
    setView('routine-creator');
  };

  const handleSaveRoutine = async (routineData: Partial<Routine>, targetSelection?: { dayNum?: number | 'core' }, shouldSync = true) => {
    try {
      const savedRoutine = await routinesRepository.saveRoutine(currentRoutine, {
        name: routineData.name || currentRoutine?.name || 'Nueva Rutina',
        days: routineData.days || currentRoutine?.days || [],
        focus: routineData.focus || currentRoutine?.focus,
        notes: routineData.notes || currentRoutine?.notes,
      }, shouldSync);

      setCurrentRoutine(savedRoutine);
      setRoutines((prev) =>
        prev.some((routine) => routine.id === savedRoutine.id)
          ? prev.map((routine) => (routine.id === savedRoutine.id ? savedRoutine : routine))
          : [savedRoutine, ...prev],
      );

      let targetDayId = null;
      if (targetSelection?.dayNum === 'core') {
        targetDayId = savedRoutine.dayEntries?.find(d => d.dayType === 'core')?.id;
      } else if (typeof targetSelection?.dayNum === 'number') {
        targetDayId = savedRoutine.dayEntries?.find(d => d.dayType === 'weekday' && d.dayNumber === targetSelection.dayNum)?.id;
      } else if (routineData.focus === 'Dia core') {
        targetDayId = savedRoutine.dayEntries?.find(d => d.dayType === 'core')?.id;
      } else if (routineData.days && routineData.days.length === 1) {
        targetDayId = savedRoutine.dayEntries?.find(d => d.dayType === 'weekday' && d.dayNumber === routineData.days[0])?.id;
      }

      if (targetDayId) {
        setSelectedRoutineDayId(targetDayId);
      } else if (!selectedRoutineDayId || !savedRoutine.dayEntries?.some(d => d.id === selectedRoutineDayId)) {
        setSelectedRoutineDayId(getDefaultRoutineDayId(savedRoutine));
      }
      
      const repositoryNotice = consumeRoutinesRepositoryNotice();
      setAppBanner(repositoryNotice ? {
        level: repositoryNotice.level,
        title: t(repositoryNotice.code === 'partialSync' ? 'routines.partialSyncTitle' : 'routines.localSaveTitle'),
        message: t(repositoryNotice.code === 'partialSync' ? 'routines.partialSyncMessage' : 'routines.localSaveMessage'),
      } : null);
      return savedRoutine;
    } catch (error) {
      console.error('Error guardando rutina:', error);
      setAppBanner({
        level: 'error',
        title: t('common.error'),
        message: getErrorMessage(error, t('error.tryAgain')),
      });
    }
  };

  const handleSelectMuscle = (muscle: string) => {
    setSelectedMuscle(muscle);
  };

  const handleSelectExercise = (exercise: Exercise, instanceId?: string) => {
    setSelectedExercise({
      ...exercise,
      sets: exercise.sets.length > 0 ? [...exercise.sets] : [],
    });
    setEditingInstanceId(instanceId || null);
    setView('exercise-editor');
  };

  const handleSaveExercise = async (exercise: Exercise) => {
    if (!currentRoutine || !selectedRoutineDayId) return;

    try {
      const updatedRoutine = await routinesRepository.saveExercise(currentRoutine, exercise, selectedRoutineDayId, editingInstanceId || undefined);
      setCurrentRoutine(updatedRoutine);
      setRoutines((prev) =>
        prev.map((routine) => (routine.id === updatedRoutine.id ? updatedRoutine : routine)),
      );
      
      setView(navigationSource === 'exercise-selector' ? 'routine-creator' : navigationSource);
      setEditingInstanceId(null);
      setAppBanner(null);
    } catch (error) {
      console.error('Error guardando ejercicio:', error);
      setAppBanner({
        level: 'error',
        title: t('common.error'),
        message: getErrorMessage(error, t('error.checkData')),
      });
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    try {
      await routinesRepository.deleteRoutine(routineId);
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
      if (loadLastRoutineId() === routineId) {
        persistLastRoutineId(null);
      }
      if (currentRoutine?.id === routineId) {
        setCurrentRoutine(null);
        setSelectedRoutineDayId(null);
      }
      setAppBanner(null);
    } catch (error) {
      console.error('Error eliminando rutina:', error);
      setAppBanner({
        level: 'error',
        title: t('common.error'),
        message: getErrorMessage(error, t('error.tryLater')),
      });
    }
  };

  const handleDeleteRoutineDay = async (routineDayId: string) => {
    if (!currentRoutine) return;
    try {
      const updatedRoutine = await routinesRepository.deleteRoutineDay(currentRoutine.id, routineDayId);
      setCurrentRoutine(updatedRoutine);
      setRoutines((prev) => prev.map((r) => r.id === updatedRoutine.id ? updatedRoutine : r));
      if (selectedRoutineDayId === routineDayId) {
        setSelectedRoutineDayId(getDefaultRoutineDayId(updatedRoutine));
      }
      setAppBanner(null);
    } catch (error) {
      console.error('Error eliminando día:', error);
      setAppBanner({ level: 'error', title: t('common.error'), message: getErrorMessage(error, t('error.tryLater')) });
    }
  };

  const handleDeleteExercise = async (exerciseId: string, dayId?: string) => {
    const targetDayId = dayId || selectedRoutineDayId;
    if (!currentRoutine || !targetDayId) return;
    try {
      const updatedRoutine = await routinesRepository.deleteExercise(currentRoutine.id, targetDayId, exerciseId);
      setCurrentRoutine(updatedRoutine);
      setRoutines((prev) => prev.map((r) => r.id === updatedRoutine.id ? updatedRoutine : r));
      if (dayId && selectedRoutineDayId !== dayId) {
        setSelectedRoutineDayId(dayId);
      }
      setAppBanner(null);
    } catch (error) {
      console.error('Error eliminando ejercicio:', error);
      setAppBanner({ level: 'error', title: t('common.error'), message: getErrorMessage(error, t('error.tryLater')) });
    }
  };

  const handleReorderDayExercises = async (dayId: string, orderedExerciseIds: string[]) => {
    if (!currentRoutine) return;

    const previousRoutine = currentRoutine;
    const optimisticRoutine = reorderRoutineDayExercises(
      previousRoutine,
      dayId,
      orderedExerciseIds,
    );

    setCurrentRoutine(optimisticRoutine);
    setRoutines((prev) => prev.map((routine) => (
      routine.id === optimisticRoutine.id ? optimisticRoutine : routine
    )));

    try {
      const updatedRoutine = await routinesRepository.reorderDayExercises(
        previousRoutine,
        dayId,
        orderedExerciseIds,
      );
      setCurrentRoutine(updatedRoutine);
      setRoutines((prev) => prev.map((routine) => (
        routine.id === updatedRoutine.id ? updatedRoutine : routine
      )));
      setAppBanner(null);
    } catch (error) {
      setCurrentRoutine(previousRoutine);
      setRoutines((prev) => prev.map((routine) => (
        routine.id === previousRoutine.id ? previousRoutine : routine
      )));
      setAppBanner({
        level: 'error',
        title: t('error.reorderTitle'),
        message: getErrorMessage(error, t('error.orderRestored')),
      });
      throw error;
    }
  };

  /**
   * Agrega al estado local una rutina que ya fue persistida por routineImport.ts.
   * No hace llamadas adicionales a Supabase; simplemente prepende la rutina
   * al array y la establece como rutina actual.
   */
  const handleImportRoutine = useCallback((importedRoutine: Routine) => {
    setRoutines((prev) => [importedRoutine, ...prev]);
    setCurrentRoutine(importedRoutine);
    persistLastRoutineId(importedRoutine.id);
  }, []);

  return {
    view,
    setView,
    isLoggedIn,
    user,
    profile,
    routines,
    currentRoutine,
    setCurrentRoutine: handleSetCurrentRoutine,
    selectedRoutineDayId,
    setSelectedRoutineDayId,
    selectedMuscle,
    selectedExercise,
    appBanner,
    clearAppBanner: () => setAppBanner(null),
    handleLoginWithGoogle,
    handleLoginWithEmail,
    handleRegisterWithEmail,
    handleLogout,
    handleSaveProfile,
    handleStartNewRoutine,
    handleSaveRoutine,
    handleSelectMuscle,
    handleSelectExercise,
    handleSaveExercise,
    handleDeleteRoutine,
    handleDeleteRoutineDay,
    handleDeleteExercise,
    handleReorderDayExercises,
    handleImportRoutine,
    editingInstanceId,
    navigationSource,
    setNavigationSource,
    openDayId,
    setOpenDayId,
    activeSession,
    restTimerPresets,
    startSession,
    endSession,
    cancelSession,
    toggleExerciseComplete,
    captureSetPerformance,
    clearCapturedSetPerformance,
    switchSessionDay,
    isAppLoading,
    themePreference,
    resolvedTheme,
    handleThemeChange,
    handleLanguageChange,
    handleRestTimerPresetsChange,
  };
};
