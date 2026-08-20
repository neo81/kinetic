import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const formatElapsedTime = (startTimeMs: number, nowMs: number) => {
  const totalSeconds = Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

export const SessionElapsedPill = ({
  startTimeMs,
  tone = 'default',
  compact = false,
  className = '',
}: {
  startTimeMs: number;
  tone?: 'default' | 'inverted' | 'embedded';
  compact?: boolean;
  className?: string;
}) => {
  const { t } = useLanguage();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const updateTime = () => setNowMs(Date.now());
    updateTime();

    const timerId = window.setInterval(updateTime, 1000);
    document.addEventListener('visibilitychange', updateTime);

    return () => {
      window.clearInterval(timerId);
      document.removeEventListener('visibilitychange', updateTime);
    };
  }, [startTimeMs]);

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));
  const toneClassName = tone === 'inverted'
    ? 'border-black/15 bg-black/10 text-black shadow-none'
    : tone === 'embedded'
      ? 'border-transparent bg-transparent text-primary shadow-none'
      : 'border-primary/25 bg-surface-container-high/95 text-primary shadow-[0_8px_24px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]';

  return (
    <div
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 ${toneClassName} ${className}`.trim()}
      title={t('session.elapsedTime')}
      aria-label={`${t('session.elapsedTime')}: ${formatElapsedTime(startTimeMs, nowMs)}`}
    >
      <Clock3
        size={14}
        strokeWidth={2.5}
        aria-hidden="true"
        className={compact ? 'hidden min-[390px]:block' : ''}
      />
      <time
        dateTime={`PT${elapsedSeconds}S`}
        className="font-mono text-[0.72rem] font-black tabular-nums tracking-[0.04em]"
      >
        {formatElapsedTime(startTimeMs, nowMs)}
      </time>
    </div>
  );
};
