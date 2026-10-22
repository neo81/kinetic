import { useEffect, useRef, useState } from 'react';

export function useStopwatch(open: boolean) {
  const accumulated = useRef(0);
  const startedAt = useRef<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const readElapsed = () => accumulated.current + (
    startedAt.current === null ? 0 : Math.max(0, Date.now() - startedAt.current)
  );

  useEffect(() => {
    if (!open) return;
    let frame: number | undefined;
    const cancel = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    };
    const update = () => {
      setElapsedMs(readElapsed());
      if (startedAt.current !== null && document.visibilityState === 'visible') {
        frame = requestAnimationFrame(update);
      }
    };
    const onVisibilityChange = () => {
      cancel();
      if (document.visibilityState === 'visible') update();
    };
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancel();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [open, isRunning]);

  const toggleRunning = () => {
    if (startedAt.current === null) {
      startedAt.current = Date.now();
      setIsRunning(true);
    } else {
      accumulated.current = readElapsed();
      startedAt.current = null;
      setElapsedMs(accumulated.current);
      setIsRunning(false);
    }
  };

  const reset = () => {
    accumulated.current = 0;
    startedAt.current = null;
    setElapsedMs(0);
    setIsRunning(false);
  };

  return { elapsedMs, isRunning, toggleRunning, reset };
}
