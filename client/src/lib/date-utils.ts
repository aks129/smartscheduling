import { format, formatDistance as fnsFormatDistance, parseISO, isToday, isTomorrow } from "date-fns";

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return `Today, ${format(dateObj, 'h:mm a')}`;
  }
  
  if (isTomorrow(dateObj)) {
    return `Tomorrow, ${format(dateObj, 'h:mm a')}`;
  }
  
  return format(dateObj, 'EEEE, MMM d, yyyy \'at\' h:mm a');
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
}

export function formatDistance(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return fnsFormatDistance(dateObj, new Date(), { addSuffix: true });
}

export function getWeekDays(): string[] {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

export function getMonthName(date: Date): string {
  return format(date, 'MMMM');
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function getDateRange(days: number): { start: Date; end: Date } {
  const start = startOfDay(new Date());
  const end = endOfDay(addDays(start, days));
  return { start, end };
}
