import { motion } from 'motion/react';

type AppErrorBannerProps = {
  level?: 'error' | 'warning';
  title: string;
  message: string;
  onDismiss: () => void;
};

export const AppErrorBanner = ({ level = 'error', title, message, onDismiss }: AppErrorBannerProps) => {
  const titleClassName = level === 'warning' ? 'text-secondary' : 'text-error';
  const borderClassName = level === 'warning' ? 'border-secondary/60' : 'border-error/60';
  const dismissLabel = level === 'warning' ? 'Cerrar aviso' : 'Cerrar mensaje de error';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex justify-center px-3 sm:top-24 sm:px-4"
    >
      <div
        className={`pointer-events-auto w-full max-w-screen-md rounded-xl border bg-surface-container-high/98 px-3 py-2 text-on-surface shadow-2xl backdrop-blur sm:px-4 sm:py-3 ${borderClassName}`}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold tracking-wide ${titleClassName}`}>{title}</p>
            <p className="mt-1 text-xs text-on-surface-variant sm:text-sm">{message}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-outline-variant px-2 py-1 text-xs text-on-surface-variant transition hover:border-outline hover:text-on-surface"
            aria-label={dismissLabel}
          >
            Cerrar
          </button>
        </div>
      </div>
    </motion.div>
  );
};
