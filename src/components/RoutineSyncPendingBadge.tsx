import { CloudOff, CloudCheck, AlertCircle, Loader2 } from 'lucide-react';

type RoutineSyncPendingBadgeProps = {
  className?: string;
  status?: 'pending' | 'syncing' | 'error';
  attemptCount?: number;
  maxAttempts?: number;
};

export const RoutineSyncPendingBadge = ({
  className = '',
  status = 'pending',
  attemptCount = 0,
  maxAttempts = 5,
}: RoutineSyncPendingBadgeProps) => {
  const bgColorClass = {
    pending: 'bg-secondary/12 border-secondary/50 text-secondary',
    syncing: 'bg-info/12 border-info/50 text-info',
    error: 'bg-error/12 border-error/50 text-error',
  }[status];

  const iconComponent = {
    pending: CloudOff,
    syncing: Loader2,
    error: AlertCircle,
  }[status];

  const Icon = iconComponent;
  const isSpinning = status === 'syncing';
  const shouldShowAttempts = status !== 'syncing' && attemptCount > 0;

  const statusText = {
    pending: 'Sin sincronizar',
    syncing: 'Sincronizando...',
    error: 'Fallo al sincronizar',
  }[status];

  return (
    <span
      role="status"
      title={`Estado: ${statusText}${shouldShowAttempts ? ` (Intento ${attemptCount} de ${maxAttempts})` : ''}`}
      className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border ${bgColorClass} px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] sm:text-[9px] sm:tracking-[0.18em] transition-colors`.trim()}
    >
      <Icon
        className={`h-3 w-3 shrink-0 opacity-90 sm:h-3.5 sm:w-3.5 ${isSpinning ? 'animate-spin' : ''}`}
        strokeWidth={2.2}
        aria-hidden
      />
      <span className="truncate">
        {statusText}
        {shouldShowAttempts && ` (${attemptCount}/${maxAttempts})`}
      </span>
    </span>
  );
};
