import { describe, expect, it } from 'vitest';
import { translate } from './translations';

describe('diccionarios de traducción', () => {
  it('resuelve el selector en español latinoamericano', () => {
    expect(translate('es-419', 'settings.language.title')).toBe('Idioma');
    expect(translate('es-419', 'settings.language.description.es-419')).toBe('Español latinoamericano');
  });

  it('resuelve el selector en inglés', () => {
    expect(translate('en', 'settings.language.title')).toBe('Language');
    expect(translate('en', 'settings.language.saving')).toBe('Saving language...');
  });

  it('traduce validaciones de usuario y diagnósticos de sincronización', () => {
    expect(translate('es-419', 'settings.username.taken')).toBe('Este usuario ya está en uso');
    expect(translate('en', 'settings.username.taken')).toBe('This username is already in use');
    expect(translate('en', 'sync.clearConfirm')).toContain('cannot be undone');
  });

  it('traduce el flujo de rutinas y el editor sin alterar nombres de ejercicios', () => {
    expect(translate('es-419', 'routines.create')).toBe('Crear nueva rutina');
    expect(translate('en', 'routines.create')).toBe('Create new routine');
    expect(translate('en', 'exerciseEditor.toFailure')).toBe('To failure');
  });

  it('traduce el registro y la finalización de una sesión activa', () => {
    expect(translate('es-419', 'session.finishWorkout')).toBe('Finalizar entrenamiento');
    expect(translate('en', 'session.finishWorkout')).toBe('Finish workout');
    expect(translate('en', 'session.failureGoal')).toBe('Goal: to failure');
  });

  it('traduce los avisos globales de guardado y el historial', () => {
    expect(translate('en', 'banner.workoutFinishedMessage')).toBe('Great work. Session saved.');
    expect(translate('en', 'banner.sessionQueued')).toBe('⏱️ Session queued');
    expect(translate('en', 'history.title')).toBe('History');
  });

  it('traduce Motor, grupos musculares y equipos sin cambiar sus valores internos', () => {
    expect(translate('en', 'engine.movementLibrary')).toBe('Movement library');
    expect(translate('en', 'muscle.pectorales')).toBe('Chest');
    expect(translate('en', 'equipment.bodyweight')).toBe('Body weight');
  });

  it('localiza la frecuencia visual de las rutinas', () => {
    expect(translate('es-419', 'routines.frequencyOnce')).toBe('vez / semana');
    expect(translate('en', 'routines.frequencyMany')).toBe('times / week');
  });

  it('traduce errores de importación sin traducir nombres personalizados', () => {
    expect(translate('en', 'routines.import.invalidJson')).toBe('The file is not valid JSON.');
    expect(translate('en', 'routines.import.warning.customReused')).toContain('custom exercise');
  });
});
