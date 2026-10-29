import { Appointment, AvailabilityRule } from '../types';
import { availableMinutesForDay } from './schedule';

export interface DayStats {
  date: string;
  total: number;
  confirmed: number;
  pending: number;
  done: number;
  canceled: number;
  bookedMinutes: number;
  availableMinutes: number;
  occupancy: number | null;
}

export function dayStats(
  appointments: Appointment[],
  date: string,
  rules: AvailabilityRule[],
  establishmentId?: string
): DayStats {
  const day = appointments.filter(a => a.date === date);
  const active = day.filter(a => a.status !== 'canceled');
  const availableMinutes = availableMinutesForDay(rules, date, establishmentId);
  const bookedMinutes = active.reduce((sum, a) => sum + a.durationMin, 0);
  return {
    date,
    total: active.length,
    confirmed: day.filter(a => a.status === 'confirmed').length,
    pending: day.filter(a => a.status === 'draft').length,
    done: day.filter(a => a.status === 'done').length,
    canceled: day.filter(a => a.status === 'canceled').length,
    bookedMinutes,
    availableMinutes,
    occupancy:
      availableMinutes > 0
        ? Math.min(100, Math.round((bookedMinutes / availableMinutes) * 100))
        : null,
  };
}

export function weeklyStats(
  appointments: Appointment[],
  weekDates: string[],
  rules: AvailabilityRule[],
  establishmentId?: string
): DayStats[] {
  return weekDates.map(date => dayStats(appointments, date, rules, establishmentId));
}
