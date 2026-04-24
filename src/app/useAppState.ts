import { useEffect, useState, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { Database, Json } from '../lib/supabase/database.types';
import { initialRoutines } from './initialData';
import { consumeRoutinesRepositoryNotice, routinesRepository } from '../features/routines/repository';
import { RoutineRepositoryError } from '../features/routines/errors';
import type { ActiveSession, Exercise, Routine, UserProfile, View } from '../types';
import { syncQueue } from '../services/syncQueue';
import { exportSessionDataForRPC } from '../services/sessionCompletion/exportSessionData';
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
    return parsed;
  } catch {
    return null;
  }
};

const persistActiveSession = (session: ActiveSession | null) => {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
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
    if (!supabase) return;

    const fallbackTimeout = setTimeout(() => {
      setIsAppLoading((loading) => {
        if (loading) console.warn('Forcing splash screen hide after timeout');
        return false;
      });
    }, 6000); // Dar un poco mas de margen en iOS

    const handleAuthState = async (session: any) => {
      try {
        const isNowLoggedIn = !!session;
        setIsLoggedIn(isNowLoggedIn);
        setUser(session?.user ?? null);

        if (isNowLoggedIn) {
          try {
            await ensureProfileExists(session.user);
            await Promise.all([
              loadProfile(session.user.id),
              loadThemePreference(session.user.id),
            ]);
            // Backfill weekly statistics from completed sessions on first login
            await ensureWeeklyStatsBackfilled(session.user.id);
          } catch (error) {
            console.error('Error cargando perfil o backfill:', error);
          }
          await syncRoutines();
          await syncActiveSessionFromStorage();
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

    if (supabase) {
      supabase.auth.signOut().catch(console.error);
    }
  };

  const handleSaveProfile = async (input: {
    fullName: string;
    username: string;
    bio: string;
    fitnessLevel: string;
    unitSystem: 'kg' | 'lb';
    avatarUrl?: string;
  }) => {
    if (!supabase || !user) throw new Error('No hay sesion activa.');

    const updateData: Record<string, any> = {
      full_name: input.fullName.trim() || null,
      username: input.username.trim() || null,
      bio: input.bio.trim() || null,
      fitness_level: input.fitnessLevel || null,
      unit_system: input.unitSystem,
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
        completedDayIds: [],
        exerciseGroupsByDay: {},
        performanceData: {}
      };
      setActiveSession(nextSession);
      persistActiveSession(nextSession);
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

  const toggleExerciseComplete = useCallback((exerciseInstanceId: string) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const isCompleted = prev.completedExercises.includes(exerciseInstanceId);
      const nextSession = {
        ...prev,
        completedExercises: isCompleted
          ? prev.completedExercises.filter(id => id !== exerciseInstanceId)
          : [...prev.completedExercises, exerciseInstanceId]
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
      const completedSetCount = Object.values(currentExercisePerformance).filter(
        (set): set is typeof currentExercisePerformance[number] => !!set && typeof set === 'object' && 'captured' in set && !!set.captured,
      ).length;
      const shouldMarkExerciseComplete = typeof totalSets === 'number' && totalSets > 0 && completedSetCount >= totalSets;
      const nextSession = {
        ...prev,
        completedExercises: shouldMarkExerciseComplete
          ? Array.from(new Set([...prev.completedExercises, exerciseId]))
          : prev.completedExercises.filter((id) => id !== exerciseId),
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
    try {
      const endedAt = new Date().toISOString();
      const activeRoutine =
        currentRoutine?.id === activeSession.routineId
          ? currentRoutine
          : routines.find((routine) => routine.id === activeSession.routineId) ?? null;

      if (activeSession.id) {
        // Prepare session data for RPC transaction
        const sessionData = exportSessionDataForRPC(activeSession, activeRoutine);

        // Call atomic RPC transaction
        const { error: rpcError } = await supabase.rpc('end_session_transaction', {
          p_session_id: activeSession.id,
          p_ended_at: endedAt,
          p_session_data: sessionData as unknown as Json,
        });

        if (rpcError) {
          throw rpcError;
        }

        didQueueSuccessfully = true;
      }
    } catch (error) {
      console.error('Error finalizando sesión', error);

      // Add to sync queue for retry with exponential backoff
      if (activeSession) {
        const endedAt = new Date().toISOString();
        const activeRoutine =
          currentRoutine?.id === activeSession.routineId
            ? currentRoutine
            : routines.find((routine) => routine.id === activeSession.routineId) ?? null;
        const sessionData = exportSessionDataForRPC(activeSession, activeRoutine);

        syncQueue.add({
          type: 'session_end',
          priority: 'high',
          payload: {
            sessionId: activeSession.id,
            endedAt,
            sessionData,
          },
          createdAt: Date.now(),
          attemptCount: 1
        });

        console.log('[endSession] Session end queued for retry');
        didQueueSuccessfully = true;  // Mark as queued, not failed
      }

      setAppBanner({
        level: 'warning',
        title: 'Sesión en cola',
        message: 'Tu entrenamiento se guardará cuando haya conexión.',
      });
      return;
    } finally {
      if (didQueueSuccessfully) {
        setActiveSession(null);
        persistActiveSession(null);
        syncRoutines();
        setAppBanner({
          level: 'warning',
          title: 'Entrenamiento Finalizado',
          message: 'Excelente trabajo. Sesion guardada.',
        });
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

  return {
    view,
    setView,
    isLoggedIn,
    user,
    profile,
    routines,
    currentRoutine,
    setCurrentRoutine,
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
    editingInstanceId,
    navigationSource,
    setNavigationSource,
    openDayId,
    setOpenDayId,
    activeSession,
    startSession,
    endSession,
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
