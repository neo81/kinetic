import type { ActiveSession, Routine, RoutineDayExercise } from '../../types';

export type SessionReturnTarget = {
  sessionId: string;
  dayId: string;
  exerciseId: string | null;
};

const capturedSetCount = (session: ActiveSession, exerciseId: string) =>
  Object.values(session.performanceData[exerciseId] ?? {}).filter((set) => set?.captured).length;

export function findSessionReturnTarget(
  routine: Routine,
  session: ActiveSession,
): Omit<SessionReturnTarget, 'sessionId'> | null {
  if (routine.id !== session.routineId) return null;

  const dayIds = session.routineDayIds;
  const activeIndex = dayIds.indexOf(session.activeRoutineDayId);
  const orderedDayIds = activeIndex < 0
    ? dayIds
    : [...dayIds.slice(activeIndex), ...dayIds.slice(0, activeIndex)];

  for (const dayId of orderedDayIds) {
    const day = routine.dayEntries?.find((entry) => entry.id === dayId);
    if (!day) continue;

    const remaining = day.exercises.filter((entry: RoutineDayExercise) => {
      if ((session.skippedExercises ?? []).includes(entry.id) || entry.exercise.sets.length === 0) return false;
      return capturedSetCount(session, entry.id) < entry.exercise.sets.length;
    });
    const ongoing = remaining.find((entry) => capturedSetCount(session, entry.id) > 0);
    const target = ongoing ?? remaining[0];
    if (target) return { dayId, exerciseId: target.id };
  }

  return null;
}
