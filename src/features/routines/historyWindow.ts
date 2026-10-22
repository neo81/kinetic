export const HISTORY_PAGE_SIZE = 20;

// Match the dashboard's existing Sunday-to-Saturday week boundary in local time.
export function dashboardHistoryStart(now = new Date()): Date {
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay() - 7);
  start.setHours(0, 0, 0, 0);
  return start;
}
