import type { ActiveSession } from '../types';

type RemoteSession = { routine_id: string | null; status: string } | null;

// A remote status check must never restore the snapshot taken before its await.
export function reconcileActiveSession(
  current: ActiveSession | null,
  latestStored: ActiveSession | null,
  checkedSessionId: string,
  remote: RemoteSession,
  failed: boolean,
): ActiveSession | null {
  if (failed || latestStored?.id !== checkedSessionId) return current;
  if (current && current.id !== checkedSessionId) return current;
  if (!remote || remote.status !== 'in_progress' || !remote.routine_id) return null;

  const latest = current ?? latestStored;
  return latest.routineId === remote.routine_id
    ? latest
    : { ...latest, routineId: remote.routine_id };
}
