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
import { useTheme } from '../hooks/useTheme';
import type { ThemePreference } from '../theme/theme';

type AppBannerState = {
  level: 'error' | 'warning';
  title: string;
  message: string;
};

const ACTIVE_SESSION_STORAGE_KEY = 'kinetic.activeSession';
const LAST_ROUTINE_STORAGE_KEY = 'kinetic.lastRoutineId';

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof RoutineRepositoryError) {
    switch (error.code) {
      case 'SUPABASE_AUTH':
        return 'Tu sesion no pudo validarse. Inicia sesion nuevamente.';
      case 'SUPABASE_NETWORK':
        return 'No hay conexion estable. Se usaran datos locales cuando sea posible.';
      case 'SUPABASE_QUERY':
        return 'Hubo un problema con el servidor. Intentalo nuevamente en unos minutos.';
      default:
        return fallbackMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

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
  unitSystem: profile.unit_system,
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

    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed?.id || !parsed.routineId || !parsed.activeRoutineDayId || !Array.isArray(parsed.routineDayIds)) {
      return null;
    }
    if (!parsed.exerciseGroupsByDay || typeof parsed.exerciseGroupsByDay !== 'object') {
      parsed.exerciseGroupsByDay = {};
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
  
  // Ref para evitar ciclos de renderizado y rastrear inicializacion
  const authInitialized = useRef(false);

  const syncRoutines = useCallback(async () => {
    try {
      const routines = await routinesRepository.list();
      setRoutines(routines);
      const repositoryNotice = consumeRoutinesRepositoryNotice();
      if (repositoryNotice) {
        setAppBanner(repositoryNotice);
      }
    } catch (error) {
      console.error('No se pudieron sincronizar las rutinas:', error);
      setAppBanner({
        level: 'error',
        title: 'No se pudo sincronizar',
        message: getErrorMessage(error, 'Revisa tu conexion e intentalo nuevamente.'),
      });
    }
  }, []);

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

  const loadThemePreference = useCallback(async (userId: string) => {
    const preferences = await preferencesService.getPreferences(userId);
    if (!preferences?.theme) {
      setThemePreference('dark');
      return 'dark' as ThemePreference;
    }

    setThemePreference(preferences.theme);
    return preferences.theme;
  }, [setThemePreference]);

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
    }, 6000); // Dar un poco mas de margen en iOS

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
              loadThemePreference(session.user.id),
              ensureWeeklyStatsBackfilled(session.user.id),
            ]);
          } catch (error) {
            console.error('Error cargando perfil o backfill:', error);
          }
          // Parallelize routine and session sync
          await Promise.all([
            syncRoutines(),
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
  }, [ensureProfileExists, loadProfile, loadThemePreference, syncActiveSessionFromStorage, syncRoutines]);

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

  const handleLoginWithGoogle = async (): Promise<{ started: boolean; error?: string }> => {
    if (!supabase) {
      const message = 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.';
      setAppBanner({ level: 'error', title: 'Error', message });
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
      setAppBanner({ level: 'error', title: 'Error Auth', message: error.message });
      return { started: false, error: error.message };
    }

    return { started: true };
  };

  const handleLoginWithEmail = async (email: string, pass: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      setAppBanner({ level: 'error', title: 'Acceso denegado', message: 'Credenciales invalidas.' });
    }
  };

  const handleRegisterWithEmail = async (email: string, pass: string) => {
    if (!supabase) return;
    const { error, data } = await supabase.auth.signUp({ email, password: pass });
    if (error) {
      setAppBanner({ level: 'error', title: 'Error registro', message: error.message });
    } else if (data.session || data.user) {
      setAppBanner({ level: 'warning', title: 'Confirma tu cuenta', message: 'Revisa tu correo.' });
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
    if (!supabase || !user) throw new Error('No hay sesion activa.');

    const updateData: Record<string, any> = {
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
      title: 'Perfil actualizado',
      message: 'Tus cambios se guardaron correctamente.',
    });
    return mapped;
  };

  const startSession = async (routineId: string, routineName: string, routineDayIds: string | string[]) => {
    if (!supabase || !user) return;
    if (activeSession) {
      setAppBanner({
        level: 'warning',
        title: 'Sesion en curso',
        message: 'Finaliza el entrenamiento activo antes de iniciar otro.',
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
        exerciseGroupsByDay: {},
        performanceData: {}
      };
      setActiveSession(nextSession);
      persistActiveSession(nextSession);
      persistLastRoutineId(routineId);
      setAppBanner({
        level: 'warning',
        title: 'Entrenamiento Iniciado',
        message: 'Tu sesión está activa en segundo plano.',
      });
    } catch (error) {
      console.error('Error al iniciar sesión', error);
      setAppBanner({
        level: 'error',
        title: 'No se pudo iniciar',
        message: 'Verifica tu conexión y prueba nuevamente.',
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
        title: 'Entrenamiento cancelado',
        message: 'La sesión fue cancelada y no se guardó progreso.',
      });
    } catch (error) {
      console.error('Error al cancelar sesión', error);
      setAppBanner({
        level: 'error',
        title: 'No se pudo cancelar',
        message: 'Intenta nuevamente en unos segundos.',
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

  const createExerciseGroup = useCallback((dayId: string, exerciseIds: string[]) => {
    setActiveSession((prev) => {
      if (!prev || exerciseIds.length < 2) return prev;

      const sanitizedIds = Array.from(new Set(exerciseIds));
      const existingGroups = prev.exerciseGroupsByDay[dayId] || [];
      const availableIds = sanitizedIds.filter((exerciseId) =>
        !existingGroups.some((group) => group.exerciseIds.includes(exerciseId))
      );

      if (availableIds.length < 2) return prev;

      const nextGroup = {
        id: `${dayId}-${Date.now()}`,
        exerciseIds: availableIds,
      };

      const nextSession = {
        ...prev,
        exerciseGroupsByDay: {
          ...prev.exerciseGroupsByDay,
          [dayId]: [...existingGroups, nextGroup],
        },
      };

      persistActiveSession(nextSession);
      return nextSession;
    });
  }, []);

  const removeExerciseGroup = useCallback((dayId: string, groupId: string) => {
    setActiveSession((prev) => {
      if (!prev) return prev;

      const existingGroups = prev.exerciseGroupsByDay[dayId] || [];
      const nextGroups = existingGroups.filter((group) => group.id !== groupId);
      if (nextGroups.length === existingGroups.length) return prev;

      const nextSession = {
        ...prev,
        exerciseGroupsByDay: {
          ...prev.exerciseGroupsByDay,
          [dayId]: nextGroups,
        },
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
          title: '⚠️ Error al guardar sesión',
          message: 'No pudimos guardar tu entrenamiento. Intenta nuevamente desde Configuración.',
        });
        // IMPROVED: Record error in sync status manager
        syncStatusManager.recordSyncError(
          new Error(error instanceof Error ? error.message : String(error))
        );
      } else {
        setAppBanner({
          level: 'warning',
          title: '⏱️ Sesión en cola',
          message: 'Tu entrenamiento se guardará cuando haya conexión.',
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
              title: '✅ Entrenamiento Finalizado',
              message: 'Excelente trabajo. Sesión guardada.',
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
      setAppBanner(repositoryNotice);
      return savedRoutine;
    } catch (error) {
      console.error('Error guardando rutina:', error);
      setAppBanner({
        level: 'error',
        title: 'Error',
        message: getErrorMessage(error, 'Intentalo de nuevo.'),
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
        title: 'Error',
        message: getErrorMessage(error, 'Revisa los datos.'),
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
        title: 'Error',
        message: getErrorMessage(error, 'Intentalo mas tarde.'),
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
      console.error('Error eliminando dia:', error);
      setAppBanner({ level: 'error', title: 'Error', message: getErrorMessage(error, 'Intentalo mas tarde.') });
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
      setAppBanner({ level: 'error', title: 'Error', message: getErrorMessage(error, 'Intentalo mas tarde.') });
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
    handleImportRoutine,
    editingInstanceId,
    navigationSource,
    setNavigationSource,
    openDayId,
    setOpenDayId,
    activeSession,
    startSession,
    endSession,
    cancelSession,
    toggleExerciseComplete,
    captureSetPerformance,
    clearCapturedSetPerformance,
    switchSessionDay,
    createExerciseGroup,
    removeExerciseGroup,
    isAppLoading,
    themePreference,
    resolvedTheme,
    handleThemeChange,
  };
};
