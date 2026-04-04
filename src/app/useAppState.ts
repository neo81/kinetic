import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { initialRoutines } from './initialData';
import { consumeRoutinesRepositoryNotice, routinesRepository } from '../features/routines/repository';
import { RoutineRepositoryError } from '../features/routines/errors';
import type { Exercise, Routine, View } from '../types';

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    if (!supabase) return;

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isNowLoggedIn = !!session;
      setIsLoggedIn(isNowLoggedIn);
      setUser(session?.user ?? null);

      if (isNowLoggedIn) {
        await syncRoutines();
        if (view === 'login') {
          setView('dashboard');
        }
      } else {
        setRoutines(initialRoutines);
        setView('login');
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        setUser(session.user);
        syncRoutines();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncRoutines]);

  const handleLoginWithGoogle = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setAppBanner({
        level: 'error',
        title: 'Error de autenticacion',
        message: error.message,
      });
    }
  };

  const handleLoginWithEmail = async (email: string, pass: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      setAppBanner({
        level: 'error',
        title: 'Acceso denegado',
        message: 'Credenciales invalidas o error de servidor.',
      });
    }
  };

  const handleRegisterWithEmail = async (email: string, pass: string) => {
    if (!supabase) return;
    const { error, data } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    if (error) {
      setAppBanner({
        level: 'error',
        title: 'Error de registro',
        message: error.message,
      });
    } else if (data.session || data.user) {
      setAppBanner({
        level: 'warning',
        title: 'Confirma tu cuenta',
        message: 'Te hemos enviado un correo. Confirmalo para activar tu perfil.',
      });
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    setUser(null);
    setRoutines(initialRoutines);
    setView('login');
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
      console.error('No se pudo guardar la rutina:', error);
      setAppBanner({
        level: 'error',
        title: 'No se pudo guardar la rutina',
        message: getErrorMessage(error, 'Intentalo de nuevo en unos segundos.'),
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
    if (!currentRoutine || !selectedRoutineDayId) {
      return;
    }

    try {
      const updatedRoutine = await routinesRepository.saveExercise(currentRoutine, exercise, selectedRoutineDayId, editingInstanceId || undefined);
      setCurrentRoutine(updatedRoutine);
      setRoutines((prev) =>
        prev.map((routine) => (routine.id === updatedRoutine.id ? updatedRoutine : routine)),
      );
      
      // Volver a la pantalla de origen (Creator o Detail)
      setView(navigationSource === 'exercise-selector' ? 'routine-creator' : navigationSource);
      setEditingInstanceId(null);
      setAppBanner(null);
    } catch (error) {
      console.error('No se pudo guardar el ejercicio:', error);
      setAppBanner({
        level: 'error',
        title: 'No se pudo guardar el ejercicio',
        message: getErrorMessage(error, 'Verifica los datos e intentalo nuevamente.'),
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
      console.error('No se pudo borrar la rutina:', error);
      setAppBanner({
        level: 'error',
        title: 'Error eliminando rutina',
        message: getErrorMessage(error, 'Intentalo otra vez mas tarde.'),
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
      console.error('No se pudo borrar el dia:', error);
      setAppBanner({
        level: 'error',
        title: 'Error eliminando dia',
        message: getErrorMessage(error, 'Intentalo otra vez mas tarde.'),
      });
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!currentRoutine || !selectedRoutineDayId) return;
    try {
      const updatedRoutine = await routinesRepository.deleteExercise(currentRoutine.id, selectedRoutineDayId, exerciseId);
      setCurrentRoutine(updatedRoutine);
      setRoutines((prev) => prev.map((r) => r.id === updatedRoutine.id ? updatedRoutine : r));
      setAppBanner(null);
    } catch (error) {
      console.error('No se pudo borrar el ejercicio:', error);
      setAppBanner({
        level: 'error',
        title: 'Error eliminando ejercicio',
        message: getErrorMessage(error, 'Intentalo otra vez mas tarde.'),
      });
    }
  };

  return {
    view,
    setView,
    isLoggedIn,
    user,
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
  };
};
