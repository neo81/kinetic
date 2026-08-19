export const MAX_REST_TIMER_PRESETS = 8;
export const MIN_REST_TIMER_SECONDS = 5;
export const MAX_REST_TIMER_SECONDS = 3599;

export const normalizeRestTimerPresets = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  const uniqueValues = new Set<number>();
  for (const item of value) {
    const seconds = Number(item);
    if (
      Number.isInteger(seconds)
      && seconds >= MIN_REST_TIMER_SECONDS
      && seconds <= MAX_REST_TIMER_SECONDS
    ) {
      uniqueValues.add(seconds);
    }

    if (uniqueValues.size === MAX_REST_TIMER_PRESETS) break;
  }

  return [...uniqueValues];
};

export const formatRestTimerPreset = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
