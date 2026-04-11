import type { Routine } from '../../types';

const STORAGE_KEY = 'kinetic:v1:routines-local-cache';

const isRoutineLike = (item: unknown): item is Routine => {
  if (!item || typeof item !== 'object') return false;
  const r = item as any;
  if (typeof r.id !== 'string') return false;
  if (!Array.isArray(r.exercises)) return false;
  if (!Array.isArray(r.dayEntries)) return false;
  return true;
};

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
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    
    // Strict validation or clear it
    const validated = parsed.filter(isRoutineLike);
    if (parsed.length > 0 && validated.length === 0) {
      console.warn(' kinetic: Cache local incompatible detectada. Limpiando para evitar bloqueos.');
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    
    return validated;
  } catch (err) {
    console.error('Error cargando cache local:', err);
    window.localStorage.removeItem(STORAGE_KEY);
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
