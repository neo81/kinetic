import { useEffect, useState } from 'react';
import { ChevronDown, History, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase/client';
import { PageShell } from '../components/layout/PageShell';
import { routinesRepository } from '../features/routines/repository';
import type { View, CompletedSession, CompletedSessionSet, UserProfile } from '../types';
import { formatSessionDate, formatSessionDuration, formatSessionVolume } from '../utils/formatting';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { getExerciseDisplayName } from '../i18n/exerciseLocalization';

const formatSessionSetValue = (set: CompletedSessionSet, t: (key: TranslationKey) => string) => {
  const parts: string[] = [];

  if (set.targetType === 'failure') {
    parts.push(`${set.reps ?? '-'} ${t('history.toFailure')}`);
  } else if (set.reps !== null) {
    parts.push(`${set.reps} reps`);
  }

  if (set.durationMinutes || set.durationSeconds) {
    const minutes = set.durationMinutes ?? 0;
    const seconds = set.durationSeconds ?? 0;
    parts.push(minutes > 0 ? `${minutes} min` : `${seconds} ${t('exerciseEditor.secondsShort')}`);
  } else if (set.loadType === 'bodyweight') {
    parts.push(set.bodyWeightKgSnapshot ? `${set.bodyWeightKgSnapshot} ${t('session.bodyweightKg')}` : t('exerciseEditor.bodyweight'));
  } else if (set.weight !== null) {
    parts.push(`${set.weight} kg`);
  }

  return parts.length > 0 ? parts.join(' · ') : t('history.noValues');
};

export const HistoryView = ({ setView, profile }: { setView: (v: View) => void; profile?: UserProfile | null }) => {
  const { language, t } = useLanguage();
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const getDayLabel = (day: CompletedSession['days'][number]) => day.dayType === 'core'
    ? 'Core'
    : `${t('routines.day')} ${day.dayNumber ?? '-'}`;
  const getSessionDayInfo = (session: CompletedSession) => session.days
    .map((day) => `${day.dayType === 'core' ? '⚡ ' : ''}${getDayLabel(day)}`)
    .join(', ');

  const loadSessions = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setHasError(false);
      const completedSessions = await routinesRepository.getCompletedSessions(session.user.id);
      setSessions(completedSessions);
    } catch (err) {
      console.error('Error loading completed sessions:', err);
      setHasError(true);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <PageShell
      activeView="history"
      setView={setView}
      profile={profile}
      contentClassName=""
    >
      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">{t('history.activityLog')}</span>
        </div>
        <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-on-surface">
          {t('history.title')}
        </h1>
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center space-y-6 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 animate-spin">
            <History size={32} className="text-primary/60" />
          </div>
          <p className="font-headline text-sm font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            {t('history.loading')}
          </p>
        </div>
      )}

      {hasError && !loading && (
        <div className="flex flex-col items-center justify-center space-y-6 py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-secondary/40 bg-secondary/5">
            <History size={40} className="text-secondary/70" />
          </div>
          <div className="space-y-3 text-center">
            <p className="font-headline text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
              {t('history.loadError')}
            </p>
            <button
              onClick={loadSessions}
              className="inline-flex items-center gap-2 rounded-[0.8rem] border border-secondary/40 px-4 py-2 text-sm font-bold uppercase tracking-[0.15em] text-secondary transition-colors hover:bg-secondary/10"
            >
              <RotateCcw size={14} />
              {t('history.retry')}
            </button>
          </div>
        </div>
      )}

      {!loading && !hasError && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center space-y-6 py-20 opacity-50">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-on-surface-variant">
            <History size={40} />
          </div>
          <p className="font-headline text-sm font-black uppercase italic tracking-[0.3em]">
            {t('history.empty')}
          </p>
          <p className="max-w-xs text-center text-xs text-on-surface-variant">
            {t('history.emptyHint')}
          </p>
        </div>
      )}

      {!loading && !hasError && sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {sessions.map((session, idx) => {
            const isExpanded = expandedSessionId === session.id;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="overflow-hidden rounded-[1.2rem] border theme-hairline-border bg-surface-container-high text-left transition-all hover:border-outline hover:bg-surface-container-high/80"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                  className="w-full p-4 text-left transition-all active:scale-[0.99]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.75rem] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                        {formatSessionDate(session.endedAt, language)}
                      </p>
                      <h3 className="mt-1 truncate font-headline text-[1.1rem] font-semibold uppercase text-on-surface">
                        {session.routineName || t('history.unnamedRoutine')}
                      </h3>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`mt-1 shrink-0 text-on-surface-variant transition-transform ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                    />
                  </div>

                  <p className="mb-3 text-[0.8rem] font-bold uppercase tracking-[0.12em] text-primary">
                    {getSessionDayInfo(session)}
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[0.7rem] bg-surface-container p-2 text-center">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                        {t('history.duration')}
                      </p>
                      <p className="font-headline text-[0.95rem] font-semibold text-on-surface">
                        {formatSessionDuration(session.startedAt.getTime(), session.endedAt.getTime())}
                      </p>
                    </div>
                    <div className="rounded-[0.7rem] bg-surface-container p-2 text-center">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                        {t('settings.volume')}
                      </p>
                      <p className="font-headline text-[0.95rem] font-semibold text-secondary">
                        {formatSessionVolume(session.totalVolumeWeight, session.totalVolumeMinutes, language)}
                      </p>
                    </div>
                    <div className="rounded-[0.7rem] bg-surface-container p-2 text-center">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
                        {t('routines.exercisePlural')}
                      </p>
                      <p className="font-headline text-[0.95rem] font-semibold text-on-surface">
                        {session.exerciseCount}
                      </p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t theme-hairline-border px-4 pb-4 pt-2">
                    {session.days.length === 0 ? (
                      <p className="rounded-[0.8rem] bg-surface-container p-3 text-sm text-on-surface-variant">
                        {t('history.noDetails')}
                      </p>
                    ) : (
                      session.days.map((day) => (
                        <section key={day.id} className="rounded-[0.9rem] bg-surface-container p-3">
                          <p className="mb-3 text-[0.72rem] font-black uppercase tracking-[0.18em] text-primary">
                            {getDayLabel(day)}
                          </p>
                          <div className="space-y-3">
                            {day.exercises.map((exercise) => (
                              <div key={exercise.id} className="rounded-[0.8rem] bg-surface-container-high/70 p-3">
                                <div className="mb-2 flex items-start justify-between gap-3">
                                  <h4 className="font-headline text-[1rem] font-semibold uppercase leading-tight text-on-surface">
                                    {getExerciseDisplayName(exercise, language) || t('history.unnamedExercise')}
                                  </h4>
                                  <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                                    {exercise.sets.length} {t(exercise.sets.length === 1 ? 'routines.setSingular' : 'routines.setPlural')}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {exercise.sets.map((set) => (
                                    <div key={set.id} className="flex items-center justify-between gap-3 rounded-[0.65rem] bg-background/40 px-3 py-2">
                                      <span className="font-headline text-[0.95rem] font-semibold uppercase text-primary">
                                        {t('exerciseEditor.set')} {set.setNumber}
                                      </span>
                                      <span className="text-right text-[0.8rem] font-bold text-on-surface">
                                        {formatSessionSetValue(set, t)}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {exercise.notes && (
                                  <p className="mt-2 text-xs italic leading-relaxed text-on-surface-variant">
                                    {exercise.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageShell>
  );
};
