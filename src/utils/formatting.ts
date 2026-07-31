/**
 * Formatting utilities for session history display
 */
import { formatAppDate, formatAppNumber, formatAppTime } from '../i18n/locale';

export const formatSessionDate = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();

  // Check if it's today
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return `Hoy a las ${formatAppTime(date)}`;
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return `Ayer a las ${formatAppTime(date)}`;
  }

  // Formato latinoamericano: "14 de abril de 2026 a las 14:30".
  const day = date.getDate();
  const month = formatAppDate(date, { month: 'long' });
  const year = date.getFullYear();

  return `${day} de ${month} de ${year} a las ${formatAppTime(date)}`;
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
    const formatted = formatAppNumber(Math.round(totalKg), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
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
