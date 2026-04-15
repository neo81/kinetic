import { AnimatePresence, motion } from 'motion/react';
import { Play } from 'lucide-react';
import { AppRouter } from './app/AppRouter';
import { useAppState } from './app/useAppState';
import { useSync } from './hooks/useSync';
import { useSyncState } from './hooks/useSyncState';
import { AppErrorBanner } from './components/layout/AppErrorBanner';
import { SyncStatusBanner } from './components/layout/SyncStatusBanner';
import { SplashScreen } from './components/layout/SplashScreen';

export default function AppRoot() {
  const app = useAppState();
  useSync();
  const syncState = useSyncState();

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

      <AnimatePresence mode="wait">
        {app.isAppLoading && <SplashScreen key="splash" />}
      </AnimatePresence>
      
      {app.activeSession && app.view !== 'routine-detail' && (
        <div className="fixed top-4 left-0 right-0 z-[100] px-4 pointer-events-none">
           <button 
             onClick={handleReturnToSession}
             className="mx-auto max-w-sm w-full flex items-center justify-between gap-3 rounded-full bg-primary text-black px-4 py-2 pointer-events-auto shadow-[0_8px_30px_rgba(209,252,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-transform border border-white/20"
           >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-primary animate-pulse">
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-black/70 leading-none mb-0.5">Entrenamiento Activo</p>
                  <p className="text-xs font-bold leading-tight">{app.activeSession.routineName}</p>
                </div>
              </div>
           </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={app.view}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
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
            onSelectMuscle={app.handleSelectMuscle}
            onSelectExercise={app.handleSelectExercise}
            onSaveExercise={app.handleSaveExercise}
            onDeleteRoutine={app.handleDeleteRoutine}
            onDeleteRoutineDay={app.handleDeleteRoutineDay}
            onDeleteExercise={app.handleDeleteExercise}
            navigationSource={app.navigationSource}
            setNavigationSource={app.setNavigationSource}
            openDayId={app.openDayId}
            setOpenDayId={app.setOpenDayId}
            activeSession={app.activeSession}
            startSession={app.startSession}
            endSession={app.endSession}
            onToggleExerciseComplete={app.toggleExerciseComplete}
            onCaptureSetPerformance={app.captureSetPerformance}
            onSwitchSessionDay={app.switchSessionDay}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
