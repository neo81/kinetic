import type { Routine } from '../../types';

const STORAGE_KEY = 'kinetic:v1:routines-local-cache';

const isRoutineLike = (item: unknown): item is Routine =>
  Boolean(item && typeof item === 'object' && typeof (item as Routine).id === 'string');

export const loadCachedRoutines = (): Routine[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isRoutineLike);
  } catch {
    return [];
  }
};

export const saveCachedRoutines = (routines: Routine[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
  } catch (error) {
    console.warn('No se pudo guardar la cache local de rutinas:', error);
  }
};
