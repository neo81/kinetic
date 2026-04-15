/**
 * Formatting utilities for session history display
 */

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const SPANISH_WEEKDAYS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

export const formatSessionDate = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();

  // Check if it's today
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Hoy a las ${hours}:${minutes}`;
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Ayer a las ${hours}:${minutes}`;
  }

  // Format as "14 de Abril, 2026 a las 14:30"
  const day = date.getDate();
  const month = SPANISH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} de ${month}, ${year} a las ${hours}:${minutes}`;
};

export const formatSessionDuration = (startMs: number, endMs: number): string => {
  const durationMs = endMs - startMs;
  const totalSeconds = Math.floor(durationMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  return `${minutes}m`;
};

export const formatSessionVolume = (totalKg: number, totalMinutes: number = 0): string => {
  const parts: string[] = [];

  // Add weight volume if present
  if (totalKg > 0) {
    const formatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(totalKg));
    parts.push(`${formatted} kg`);
  }

  // Add time volume if present
  if (totalMinutes > 0) {
    const minutes = Math.floor(totalMinutes);
    const seconds = Math.round((totalMinutes - minutes) * 60);
    const timeStr = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    parts.push(timeStr);
  }

  // If no volume at all
  if (parts.length === 0) {
    return '0 kg';
  }

  return parts.join(' + ');
};
