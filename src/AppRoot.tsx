import { AnimatePresence, motion } from 'motion/react';
import { AppRouter } from './app/AppRouter';
import { useAppState } from './app/useAppState';
import { AppErrorBanner } from './components/layout/AppErrorBanner';

export default function AppRoot() {
  const app = useAppState();

  return (
    <div className="app-shell min-h-screen bg-background text-on-background">
      {app.appBanner && (
        <AppErrorBanner
          level={app.appBanner.level}
          title={app.appBanner.title}
          message={app.appBanner.message}
          onDismiss={app.clearAppBanner}
        />
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
            selectedMuscle={app.selectedMuscle}
            selectedExercise={app.selectedExercise}
            onLogin={app.handleLogin}
            onLogout={app.handleLogout}
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
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
