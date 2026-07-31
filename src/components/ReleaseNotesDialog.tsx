import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import type { AppRelease } from '../app/releaseNotes';
import { formatAppDate } from '../i18n/locale';

type ReleaseNotesDialogProps = {
  isOpen: boolean;
  mode: 'unread' | 'history';
  releases: AppRelease[];
  onClose: () => void;
};

export const ReleaseNotesDialog = ({
  isOpen,
  mode,
  releases,
  onClose,
}: ReleaseNotesDialogProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[110] flex items-end justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:items-center sm:pb-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="theme-overlay fixed inset-0 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.section
          initial={{ opacity: 0, y: 36, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="theme-elevated-surface relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="release-notes-title"
        >
          <button
            type="button"
            onClick={onClose}
            className="theme-muted-surface absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-on-surface"
            aria-label="Cerrar novedades"
          >
            <X size={16} strokeWidth={2.5} />
          </button>

          <div className="mb-6 flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Sparkles size={22} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                {mode === 'unread' ? `${releases.length} sin leer` : `${releases.length} versiones`}
              </p>
              <h2 id="release-notes-title" className="mt-2 font-headline text-2xl font-black uppercase italic leading-none text-on-surface">
                {mode === 'unread' ? 'Novedades' : 'Historial'}
              </h2>
            </div>
          </div>

          <div className="space-y-6">
            {releases.map((release) => (
              <section key={release.version} className="space-y-3">
                <div className="flex items-end justify-between gap-4 px-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      Version {release.version}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-on-surface">{release.title}</h3>
                  </div>
                  <time className="shrink-0 text-[9px] font-medium text-on-surface-variant/70">
                    {formatAppDate(release.publishedAt, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </time>
                </div>
                <div className="space-y-3">
                  {release.notes.map((note) => (
                    <div
                      key={`${release.version}-${note.title}`}
                      className="rounded-[1.1rem] bg-surface-container-low px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.6} />
                        <div>
                          <h4 className="text-sm font-bold text-on-surface">{note.title}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{note.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-lg shadow-primary/15 transition-transform active:scale-[0.98]"
          >
            Entendido
          </button>
        </motion.section>
      </div>
    )}
  </AnimatePresence>
);
