import { Appointment } from '../types';
import { fromISO, minutesOf } from '../utils/date';

export interface ReminderPlanOptions {
  leadMin: number;
  nowMs: number;
  horizonHours?: number;
  maxCount?: number;
}

export function startMsOf(appointment: Appointment): number {
  const startsAt = fromISO(appointment.date);
  startsAt.setMinutes(minutesOf(appointment.time));
  return startsAt.getTime();
}

export function pendingPushReminders(
  appointments: Appointment[],
  { leadMin, nowMs, horizonHours = 48, maxCount = 10 }: ReminderPlanOptions
): Appointment[] {
  const horizon = nowMs + horizonHours * 3_600_000;
  const leadMs = leadMin * 60_000;
  return appointments
    .filter(a => a.status === 'draft' || a.status === 'confirmed')
    .filter(a => !a.reminderId)
    .map(a => ({ appointment: a, triggerAt: startMsOf(a) - leadMs }))
    .filter(({ triggerAt }) => triggerAt > nowMs && triggerAt <= horizon)
    .sort((x, y) => x.triggerAt - y.triggerAt)
    .slice(0, maxCount)
    .map(({ appointment }) => appointment);
}
