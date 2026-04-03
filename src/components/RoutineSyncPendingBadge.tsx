import { CloudOff } from 'lucide-react';

type RoutineSyncPendingBadgeProps = {
  className?: string;
};

export const RoutineSyncPendingBadge = ({ className = '' }: RoutineSyncPendingBadgeProps) => (
  <span
    role="status"
    title="Guardado solo en este dispositivo; pendiente de sincronizar con el servidor"
    className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border border-secondary/50 bg-secondary/12 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-secondary sm:text-[9px] sm:tracking-[0.18em] ${className}`.trim()}
  >
    <CloudOff className="h-3 w-3 shrink-0 opacity-90 sm:h-3.5 sm:w-3.5" strokeWidth={2.2} aria-hidden />
    <span className="truncate">Sin sincronizar</span>
  </span>
);
