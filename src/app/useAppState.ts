import { useEffect, useState, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/database.types';
import { initialRoutines } from './initialData';
import { consumeRoutinesRepositoryNotice, routinesRepository } from '../features/routines/repository';
import { RoutineRepositoryError } from '../features/routines/errors';
import type { ActiveSession, Exercise, Routine, UserProfile, View } from '../types';

type AppBannerState = {
  level: 'error' | 'warning';
  title: string;
  message: string;
};

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

export const useAppState = () => {
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
            await loadProfile(session.user.id);
          } catch (error) {
            console.error('Error cargando perfil:', error);
          }
          await syncRoutines();
          setView((current) => current === 'login' ? 'dashboard' : current);
        } else {
          setRoutines(initialRoutines);
          setProfile(null);
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
  }, [ensureProfileExists, loadProfile, syncRoutines]);

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
    setAppBanner(null);
    setProfile(null);
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
  }) => {
    if (!supabase || !user) throw new Error('No hay sesion activa.');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: input.fullName.trim() || null,
        username: input.username.trim() || null,
        bio: input.bio.trim() || null,
        fitness_level: input.fitnessLevel || null,
        unit_system: input.unitSystem,
      })
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

  const startSession = async (routineId: string, routineName: string, routineDayId?: string) => {
    if (!supabase || !user) return;
    try {
      const { data, error } = await supabase.from('routine_sessions').insert({
        routine_id: routineId,
        user_id: user.id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }).select('id').single();

      if (error) throw error;
      
      setActiveSession({
        id: data.id,
        routineId,
        routineName,
        routineDayId,
        startTimeMs: Date.now(),
        completedExercises: []
      });
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

  const toggleExerciseComplete = (exerciseInstanceId: string) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const isCompleted = prev.completedExercises.includes(exerciseInstanceId);
      return {
        ...prev,
        completedExercises: isCompleted
          ? prev.completedExercises.filter(id => id !== exerciseInstanceId)
          : [...prev.completedExercises, exerciseInstanceId]
      };
    });
  };

  const endSession = async () => {
    if (!supabase || !activeSession) return;
    try {
      if (activeSession.id) {
        const { error } = await supabase.from('routine_sessions').update({
          status: 'completed',
          ended_at: new Date().toISOString()
        }).eq('id', activeSession.id);
        
        if (error) throw error;

        if (activeSession.completedExercises.length > 0 && activeSession.routineDayId && currentRoutine) {
          const currentDay = currentRoutine.dayEntries?.find(d => d.id === activeSession.routineDayId);
          if (currentDay) {
            const { data: dayLog, error: dayLogError } = await supabase.from('session_day_logs').insert({
               session_id: activeSession.id,
               routine_day_id: currentDay.id,
               started_at: new Date(activeSession.startTimeMs).toISOString(),
               ended_at: new Date().toISOString()
            }).select('id').single();

            if (!dayLogError && dayLog) {
               for (const rdeId of activeSession.completedExercises) {
                 const exDef = currentDay.exercises.find(e => e.id === rdeId);
                 if (!exDef) continue;

                 const { data: exLog, error: exLogError } = await supabase
                   .from('session_exercise_logs')
                   .insert({
                     session_day_log_id: dayLog.id,
                     exercise_id: exDef.exerciseId,
                     position: exDef.position,
                     notes: exDef.notes
                   })
                   .select('id')
                   .single();

                 if (!exLogError && exLog && exDef.exercise.sets) {
                   const setLogs = exDef.exercise.sets.map(s => ({
                     session_exercise_log_id: exLog.id,
                     set_number: s.setNumber || 1,
                     reps: s.reps || 0,
                     weight: s.weight || 0,
                     completed: true
                   }));
                   if (setLogs.length > 0) {
                     await supabase.from('session_set_logs').insert(setLogs);
                   }
                 }
               }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error finalizando sesión', error);
    } finally {
      setActiveSession(null);
      syncRoutines();
      setAppBanner({
        level: 'warning',
        title: 'Entrenamiento Finalizado',
        message: '¡Excelente trabajo! Sesión guardada.',
      });
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
    isAppLoading,
  };
};
