import { DashboardView } from '../views/DashboardView';
import { ExerciseEditorView } from '../views/ExerciseEditorView';
import { ExerciseListView } from '../views/ExerciseListView';
import { ExerciseSelectorKineticView } from '../views/ExerciseSelectorKineticView';
import { HistoryView } from '../views/HistoryView';
import { KineticLoginView } from '../views/KineticLoginView';
import { RoutineCreatorView } from '../views/RoutineCreatorView';
import { RoutineDetailKineticView } from '../views/RoutineDetailKineticView';
import { SettingsView } from '../views/SettingsView';
import { RoutinesListView } from '../views/RoutinesListView';
import type { ActiveSession, Exercise, Routine, UserProfile, View } from '../types';

type AppRouterProps = {
  view: View;
  setView: (view: View) => void;
  routines: Routine[];
  currentRoutine: Routine | null;
  setCurrentRoutine: (routine: Routine | null) => void;
  selectedRoutineDayId: string | null;
  setSelectedRoutineDayId: (dayId: string | null) => void;
  userEmail: string | null;
  selectedMuscle: string;
  selectedExercise: Exercise | null;
  profile: UserProfile | null;
  onLoginWithGoogle: () => Promise<{ started: boolean; error?: string }>;
  onLoginWithEmail: (email: string, pass: string) => void;
  onRegisterWithEmail: (email: string, pass: string) => void;
  onLogout: () => void;
  onSaveProfile: (input: {
    fullName: string;
    username: string;
    bio: string;
    fitnessLevel: string;
    unitSystem: 'kg' | 'lb';
  }) => Promise<unknown>;
  onNewRoutine: () => void;
  onSaveRoutine: (routineData: Partial<Routine>) => void;
  onSelectMuscle: (muscle: string) => void;
  onSelectExercise: (exercise: Exercise, instanceId?: string) => void;
  onSaveExercise: (exercise: Exercise) => void;
  onDeleteRoutine: (routineId: string) => void;
  onDeleteRoutineDay: (routineDayId: string) => void;
  onDeleteExercise: (exerciseId: string, dayId?: string) => void;
  navigationSource: View;
  setNavigationSource: (view: View) => void;
  openDayId: string | null;
  setOpenDayId: (dayId: string | null) => void;
  activeSession: ActiveSession | null;
  startSession: (routineId: string, routineName: string, routineDayId: string) => Promise<void>;
  endSession: () => Promise<void>;
  onToggleExerciseComplete: (exerciseInstanceId: string) => void;
  onCaptureSetPerformance: (exerciseId: string, setNumber: number, reps: number | null, weight: number | null, durationMin: number | null, durationSec: number | null) => void;
  onSwitchSessionDay: (dayId: string) => void;
};

export const AppRouter = ({
  view,
  setView,
  routines,
  currentRoutine,
  setCurrentRoutine,
  selectedRoutineDayId,
  setSelectedRoutineDayId,
  userEmail,
  selectedMuscle,
  selectedExercise,
  profile,
  onLoginWithGoogle,
  onLoginWithEmail,
  onRegisterWithEmail,
  onLogout,
  onSaveProfile,
  onNewRoutine,
  onSaveRoutine,
  onSelectMuscle,
  onSelectExercise,
  onSaveExercise,
  onDeleteRoutine,
  onDeleteRoutineDay,
  onDeleteExercise,
  navigationSource,
  setNavigationSource,
  openDayId,
  setOpenDayId,
  activeSession,
  startSession,
  endSession,
  onToggleExerciseComplete,
  onCaptureSetPerformance,
  onSwitchSessionDay,
}: AppRouterProps) => {
  switch (view) {
    case 'login':
      return (
        <KineticLoginView
          onLoginWithGoogle={onLoginWithGoogle}
          onLoginWithEmail={onLoginWithEmail}
          onRegisterWithEmail={onRegisterWithEmail}
        />
      );
    case 'dashboard':
      return (
        <DashboardView
          setView={setView}
          routines={routines}
          onNewRoutine={onNewRoutine}
          setCurrentRoutine={(routine) => {
            setCurrentRoutine(routine);
            setSelectedRoutineDayId(null);
          }}
        />
      );
    case 'routines-list':
      return (
        <RoutinesListView
          setView={setView}
          routines={routines}
          onNewRoutine={onNewRoutine}
          setCurrentRoutine={setCurrentRoutine}
          onDeleteRoutine={onDeleteRoutine}
        />
      );
    case 'routine-creator':
      return (
        <RoutineCreatorView
          setView={setView}
          onSave={onSaveRoutine}
          currentRoutine={currentRoutine}
          selectedRoutineDayId={selectedRoutineDayId}
          onSelectRoutineDay={setSelectedRoutineDayId}
          onDeleteRoutineDay={onDeleteRoutineDay}
          onDeleteExercise={onDeleteExercise}
          onEditExercise={(ex, instanceId) => {
            setNavigationSource('routine-creator');
            onSelectExercise(ex, instanceId);
            setView('exercise-editor');
          }}
          onSelectMuscle={(muscle) => {
            setNavigationSource('routine-creator');
            onSelectMuscle(muscle);
          }}
          navigationSource={navigationSource}
          setNavigationSource={setNavigationSource}
        />
      );
    case 'exercise-selector':
      return (
        <ExerciseSelectorKineticView
          setView={setView}
          onSelectMuscle={onSelectMuscle}
        />
      );
    case 'exercise-list':
      return (
        <ExerciseListView
          setView={setView}
          muscle={selectedMuscle}
          onSelectExercise={onSelectExercise}
        />
      );
    case 'exercise-editor':
      return (
        <ExerciseEditorView
          setView={setView}
          exercise={selectedExercise}
          onSave={onSaveExercise}
          onBack={() => setView(navigationSource === 'exercise-selector' ? 'routine-creator' : navigationSource)}
        />
      );
    case 'routine-detail':
      return (
        <RoutineDetailKineticView
          setView={setView}
          routine={currentRoutine ?? routines[0] ?? null}
          activeSession={activeSession}
          onStartSession={startSession}
          onEndSession={endSession}
          onToggleExerciseComplete={onToggleExerciseComplete}
          onCaptureSetPerformance={onCaptureSetPerformance}
          onSwitchSessionDay={onSwitchSessionDay}
          onDeleteRoutine={onDeleteRoutine}
          onDeleteRoutineDay={onDeleteRoutineDay}
          onDeleteExercise={onDeleteExercise}
          onEditExercise={(ex, instanceId, dayId) => {
            setNavigationSource('routine-detail');
            setSelectedRoutineDayId(dayId);
            onSelectExercise(ex, instanceId);
            setView('exercise-editor');
          }}
          onEditRoutine={(r) => {
            setNavigationSource('routine-detail');
            setCurrentRoutine(r);
            setSelectedRoutineDayId(null);
            setView('routine-creator');
          }}
          onSelectRoutineDay={setSelectedRoutineDayId}
          openDayId={openDayId}
          onOpenDayChange={setOpenDayId}
        />
      );
    case 'history':
      return <HistoryView setView={setView} />;
    case 'settings':
      return (
        <SettingsView
          setView={setView}
          profile={profile}
          userEmail={userEmail}
          onLogout={onLogout}
          onSaveProfile={onSaveProfile}
        />
      );
    default:
      return null;
  }
};
