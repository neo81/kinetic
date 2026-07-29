export const buildSessionDayIds = (
  selectedWeekdayId: string,
  coreDayId?: string | null,
): string[] => (
  coreDayId && coreDayId !== selectedWeekdayId
    ? [selectedWeekdayId, coreDayId]
    : [selectedWeekdayId]
);
