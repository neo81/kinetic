import { lazy, Suspense } from 'react';
import type { ActiveSession, Exercise, Routine, UserProfile, View } from '../types';
import type { ResolvedTheme, ThemePreference } from '../theme/theme';

const DashboardView = lazy(() => import('../views/DashboardView').then((module) => ({ default: module.DashboardView })));
const ExerciseEditorView = lazy(() => import('../views/ExerciseEditorView').then((module) => ({ default: module.ExerciseEditorView })));
const ExerciseListView = lazy(() => import('../views/ExerciseListView').then((module) => ({ default: module.ExerciseListView })));
const ExerciseSelectorKineticView = lazy(() => import('../views/ExerciseSelectorKineticView').then((module) => ({ default: module.ExerciseSelectorKineticView })));
const HistoryView = lazy(() => import('../views/HistoryView').then((module) => ({ default: module.HistoryView })));
const KineticLoginView = lazy(() => import('../views/KineticLoginView').then((module) => ({ default: module.KineticLoginView })));
const RoutineCreatorView = lazy(() => import('../views/RoutineCreatorView').then((module) => ({ default: module.RoutineCreatorView })));
const RoutineDetailKineticView = lazy(() => import('../views/RoutineDetailKineticView').then((module) => ({ default: module.RoutineDetailKineticView })));
const SettingsView = lazy(() => import('../views/SettingsView').then((module) => ({ default: module.SettingsView })));
const RoutinesListView = lazy(() => import('../views/RoutinesListView').then((module) => ({ default: module.RoutinesListView })));

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
    avatarUrl?: string;
  }) => Promise<unknown>;
  onNewRoutine: () => void;
  onSaveRoutine: (routineData: Partial<Routine>) => void;
  onEditRoutine: (routine: Routine) => void;
  onDeleteRoutineFromDashboard: (routineId: string) => void;
  onSelectMuscle: (muscle: string) => void;
  onSelectExercise: (exercise: Exercise, instanceId?: string) => void;
  onSaveExercise: (exercise: Exercise) => void;
  onDeleteRoutine: (routineId: string) => void;
  onDeleteRoutineDay: (routineDayId: string) => void;
  onDeleteExercise: (exerciseId: string, dayId?: string) => void;
  onImportRoutine: (routine: Routine) => void;
  navigationSource: View;
  setNavigationSource: (view: View) => void;
  openDayId: string | null;
  setOpenDayId: (dayId: string | null) => void;
  activeSession: ActiveSession | null;
  startSession: (routineId: string, routineName: string, routineDayId: string | string[]) => Promise<void>;
  endSession: () => Promise<void>;
  cancelSession: () => Promise<void>;
  onToggleExerciseComplete: (exerciseInstanceId: string) => void;
  onCaptureSetPerformance: (exerciseId: string, setNumber: number, reps: number | null, weight: number | null, durationMin: number | null, durationSec: number | null, totalSets?: number) => void;
  onClearCapturedSetPerformance: (exerciseId: string, setNumber: number, totalSets?: number) => void;
  onSwitchSessionDay: (dayId: string) => void;
  onCreateExerciseGroup: (dayId: string, exerciseIds: string[]) => void;
  onRemoveExerciseGroup: (dayId: string, groupId: string) => void;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onThemeChange: (theme: ThemePreference) => Promise<void>;
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
  onEditRoutine,
  onDeleteRoutineFromDashboard,
  onSelectMuscle,
  onSelectExercise,
  onSaveExercise,
  onDeleteRoutine,
  onDeleteRoutineDay,
  onDeleteExercise,
  onImportRoutine,
  navigationSource,
  setNavigationSource,
  openDayId,
  setOpenDayId,
  activeSession,
  startSession,
  endSession,
  cancelSession,
  onToggleExerciseComplete,
  onCaptureSetPerformance,
  onClearCapturedSetPerformance,
  onSwitchSessionDay,
  onCreateExerciseGroup,
  onRemoveExerciseGroup,
  themePreference,
  resolvedTheme,
  onThemeChange,
}: AppRouterProps) => {
  let content: JSX.Element | null;

  switch (view) {
    case 'login':
      content = (
        <KineticLoginView
          onLoginWithGoogle={onLoginWithGoogle}
          onLoginWithEmail={onLoginWithEmail}
          onRegisterWithEmail={onRegisterWithEmail}
        />
      );
      break;
    case 'dashboard':
      content = (
        <DashboardView
          setView={setView}
          routines={routines}
          onNewRoutine={onNewRoutine}
          profile={profile}
          currentRoutine={currentRoutine}
          onEditRoutine={onEditRoutine}
          onDeleteRoutine={onDeleteRoutineFromDashboard}
          setCurrentRoutine={(routine) => {
            setCurrentRoutine(routine);
            setSelectedRoutineDayId(null);
          }}
        />
      );
      break;
    case 'routines-list':
      content = (
        <RoutinesListView
          setView={setView}
          routines={routines}
          onNewRoutine={onNewRoutine}
          setCurrentRoutine={setCurrentRoutine}
          onDeleteRoutine={onDeleteRoutine}
          onImportRoutine={onImportRoutine}
          profile={profile}
        />
      );
      break;
    case 'routine-creator':
      content = (
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
      break;
    case 'exercise-selector':
      content = (
        <ExerciseSelectorKineticView
          setView={setView}
          onSelectMuscle={onSelectMuscle}
          selectedMuscle={selectedMuscle}
        />
      );
      break;
    case 'exercise-list':
      content = (
        <ExerciseListView
          setView={setView}
          muscle={selectedMuscle}
          onSelectExercise={onSelectExercise}
        />
      );
      break;
    case 'exercise-editor':
      content = (
        <ExerciseEditorView
          setView={setView}
          exercise={selectedExercise}
          onSave={onSaveExercise}
          onBack={() => setView(navigationSource === 'exercise-selector' ? 'routine-creator' : navigationSource)}
        />
      );
      break;
    case 'routine-detail':
      content = (
        <RoutineDetailKineticView
          setView={setView}
          routine={currentRoutine ?? routines[0] ?? null}
          activeSession={activeSession}
          onStartSession={startSession}
          onEndSession={endSession}
          onCancelSession={cancelSession}
          onToggleExerciseComplete={onToggleExerciseComplete}
          onCaptureSetPerformance={onCaptureSetPerformance}
          onClearCapturedSetPerformance={onClearCapturedSetPerformance}
          onSwitchSessionDay={onSwitchSessionDay}
          onCreateExerciseGroup={onCreateExerciseGroup}
          onRemoveExerciseGroup={onRemoveExerciseGroup}
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
      break;
    case 'history':
      content = <HistoryView setView={setView} profile={profile} />;
      break;
    case 'settings':
      content = (
        <SettingsView
          setView={setView}
          profile={profile}
          userEmail={userEmail}
          onLogout={onLogout}
          onSaveProfile={onSaveProfile}
          themePreference={themePreference}
          resolvedTheme={resolvedTheme}
          onThemeChange={onThemeChange}
        />
      );
      break;
    default:
      content = null;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      {content}
    </Suspense>
  );
};
