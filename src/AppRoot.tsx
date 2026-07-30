import { Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { remoteLogger } from './services/remoteLogger';
import { AppRouter } from './app/AppRouter';
import { useAppState } from './app/useAppState';
import { useSync } from './hooks/useSync';
import { useSyncState } from './hooks/useSyncState';
import { AppErrorBanner } from './components/layout/AppErrorBanner';
import { SyncStatusBanner } from './components/layout/SyncStatusBanner';
import { SplashScreen } from './components/layout/SplashScreen';
import { ReleaseNotesDialog } from './components/ReleaseNotesDialog';
import { fallbackReleaseHistory, type AppRelease } from './app/releaseNotes';
import { releaseNotesRepository } from './features/releaseNotes/repository';

export default function AppRoot() {
  const app = useAppState();
  useSync();
  const syncState = useSyncState();
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [releaseNotesMode, setReleaseNotesMode] = useState<'unread' | 'history'>('unread');
  const [releaseHistory, setReleaseHistory] = useState<AppRelease[]>([]);
  const [unreadReleases, setUnreadReleases] = useState<AppRelease[]>([]);
  const [releaseNotesLoaded, setReleaseNotesLoaded] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_REMOTE_LOGGER !== 'true') {
      return;
    }

    // Enable remote logging for diagnostics (optional)
    try {
      remoteLogger.enable();
    } catch (err) {
      // ignore
    }

    return () => {
      try {
        remoteLogger.disable();
      } catch (_e) {}
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!app.user?.id) {
      setReleaseHistory([]);
      setUnreadReleases([]);
      setReleaseNotesLoaded(false);
      setShowReleaseNotes(false);
      return;
    }

    setReleaseNotesLoaded(false);
    void releaseNotesRepository
      .getReleaseState(app.user.id)
      .then(({ releases, unreadReleases: nextUnreadReleases }) => {
        if (isCancelled) return;
        setReleaseHistory(releases);
        setUnreadReleases(nextUnreadReleases);
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('[ReleaseNotes] No se pudo cargar el historial:', error);
        setReleaseHistory(fallbackReleaseHistory);
        setUnreadReleases([]);
      })
      .finally(() => {
        if (!isCancelled) setReleaseNotesLoaded(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [app.user?.id]);

  useEffect(() => {
    if (
      app.isAppLoading ||
      !app.user ||
      app.activeSession ||
      app.appBanner ||
      syncState.status !== 'idle' ||
      !releaseNotesLoaded ||
      unreadReleases.length === 0 ||
      showReleaseNotes
    ) {
      return;
    }

    setReleaseNotesMode('unread');
    setShowReleaseNotes(true);
  }, [
    app.activeSession,
    app.appBanner,
    app.isAppLoading,
    app.user,
    releaseNotesLoaded,
    showReleaseNotes,
    syncState.status,
    unreadReleases.length,
  ]);

  const handleCloseReleaseNotes = () => {
    const versionsToMark = unreadReleases.map((release) => release.version);
    setUnreadReleases([]);
    setShowReleaseNotes(false);

    if (app.user?.id && versionsToMark.length > 0) {
      void releaseNotesRepository.markReleasesRead(app.user.id, versionsToMark).catch((error) => {
        console.error('[ReleaseNotes] No se pudieron marcar las novedades como leidas:', error);
      });
    }
  };

  const handleOpenReleaseHistory = () => {
    setReleaseNotesMode('history');
    setShowReleaseNotes(true);
  };

  const handleReturnToSession = () => {
    if (app.activeSession?.routineId) {
      if (app.currentRoutine?.id !== app.activeSession.routineId) {
        const targetRoutine = app.routines.find(r => r.id === app.activeSession!.routineId);
        if (targetRoutine) {
          app.setCurrentRoutine(targetRoutine);
        }
      }
      app.setView('routine-detail');
    }
  };

  return (
    <div className="app-shell min-h-screen bg-background text-on-background relative">
      {app.appBanner && (
        <AppErrorBanner
          level={app.appBanner.level}
          title={app.appBanner.title}
          message={app.appBanner.message}
          onDismiss={app.clearAppBanner}
        />
      )}

      <SyncStatusBanner syncState={syncState} />

      <ReleaseNotesDialog
        isOpen={showReleaseNotes}
        mode={releaseNotesMode}
        releases={releaseNotesMode === 'unread' ? unreadReleases : releaseHistory}
        onClose={handleCloseReleaseNotes}
      />

      {app.isAppLoading && <SplashScreen key="splash" />}
      
      {app.activeSession && app.view !== 'routine-detail' && (
        <div className="fixed top-4 left-0 right-0 z-[100] px-4 pointer-events-none">
           <button 
             onClick={handleReturnToSession}
             className="mx-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-full border border-primary/25 bg-primary px-4 py-2 text-black pointer-events-auto shadow-[0_8px_30px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
           >
              <div className="flex items-center gap-3">
                <div className="theme-inverted-surface flex h-7 w-7 items-center justify-center rounded-full text-primary animate-pulse">
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                </div>
                <div className="text-left">
                  <p className="mb-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-black/70">Entrenamiento Activo</p>
                  <p className="text-xs font-bold leading-tight">{app.activeSession.routineName}</p>
                </div>
              </div>
           </button>
        </div>
      )}

      <AppRouter
        view={app.view}
        setView={app.setView}
        routines={app.routines}
        currentRoutine={app.currentRoutine}
        setCurrentRoutine={app.setCurrentRoutine}
        selectedRoutineDayId={app.selectedRoutineDayId}
        setSelectedRoutineDayId={app.setSelectedRoutineDayId}
        userEmail={app.user?.email ?? null}
        selectedMuscle={app.selectedMuscle}
        selectedExercise={app.selectedExercise}
        profile={app.profile}
        onLoginWithGoogle={app.handleLoginWithGoogle}
        onLoginWithEmail={app.handleLoginWithEmail}
        onRegisterWithEmail={app.handleRegisterWithEmail}
        onLogout={app.handleLogout}
        onSaveProfile={app.handleSaveProfile}
        onNewRoutine={app.handleStartNewRoutine}
        onSaveRoutine={app.handleSaveRoutine}
        onEditRoutine={(routine) => {
          app.setCurrentRoutine(routine);
          app.setSelectedRoutineDayId(null);
          app.setNavigationSource('dashboard');
          app.setView('routine-creator');
        }}
        onDeleteRoutineFromDashboard={app.handleDeleteRoutine}
        onSelectMuscle={app.handleSelectMuscle}
        onSelectExercise={app.handleSelectExercise}
        onSaveExercise={app.handleSaveExercise}
        onDeleteRoutine={app.handleDeleteRoutine}
        onDeleteRoutineDay={app.handleDeleteRoutineDay}
        onDeleteExercise={app.handleDeleteExercise}
        onReorderDayExercises={app.handleReorderDayExercises}
        onImportRoutine={app.handleImportRoutine}
        navigationSource={app.navigationSource}
        setNavigationSource={app.setNavigationSource}
        openDayId={app.openDayId}
        setOpenDayId={app.setOpenDayId}
        activeSession={app.activeSession}
        startSession={app.startSession}
        endSession={app.endSession}
        cancelSession={app.cancelSession}
        onToggleExerciseComplete={app.toggleExerciseComplete}
        onCaptureSetPerformance={app.captureSetPerformance}
        onClearCapturedSetPerformance={app.clearCapturedSetPerformance}
        onSwitchSessionDay={app.switchSessionDay}
        onCreateExerciseGroup={app.createExerciseGroup}
        onRemoveExerciseGroup={app.removeExerciseGroup}
        themePreference={app.themePreference}
        resolvedTheme={app.resolvedTheme}
        onThemeChange={app.handleThemeChange}
        onOpenReleaseNotes={handleOpenReleaseHistory}
      />
    </div>
  );
}
