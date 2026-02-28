
'use client';

import { format, parse, isWithinInterval, startOfToday, isSameDay } from 'date-fns';

export interface DaySchedule {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface OperatingHours {
  isAlwaysOpen: boolean;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  holidays: Array<{ date: string; reason: string }>;
}

export const DEFAULT_OPERATING_HOURS: OperatingHours = {
  isAlwaysOpen: true,
  schedule: {
    monday: { open: '09:00', close: '22:00', isClosed: false },
    tuesday: { open: '09:00', close: '22:00', isClosed: false },
    wednesday: { open: '09:00', close: '22:00', isClosed: false },
    thursday: { open: '09:00', close: '22:00', isClosed: false },
    friday: { open: '09:00', close: '23:00', isClosed: false },
    saturday: { open: '10:00', close: '23:00', isClosed: false },
    sunday: { open: '10:00', close: '21:00', isClosed: false },
  },
  holidays: [],
};

/**
 * Checks if the restaurant is currently open based on the provided operating hours.
 */
export function checkIsRestaurantOpen(hours: OperatingHours | null | undefined): boolean {
  if (!hours || hours.isAlwaysOpen) return true;

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // 1. Check Holidays
  const isHoliday = hours.holidays?.some(h => h.date === todayStr);
  if (isHoliday) return false;

  // 2. Check Weekly Schedule
  const dayName = format(now, 'eeee').toLowerCase() as keyof OperatingHours['schedule'];
  const daySchedule = hours.schedule[dayName];

  if (daySchedule.isClosed) return false;

  const currentTime = format(now, 'HH:mm');
  
  // Basic HH:mm comparison
  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
}
