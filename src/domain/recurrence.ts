import { Appointment } from '../types';
import { addDays, addMonths } from '../utils/date';
import { SlotAppointment, SlotRef, conflictsWith } from './schedule';

export type RecurrenceKind = 'none' | 'weekly' | 'biweekly' | 'monthly';

export interface SeriesPlanInput {
  startDate: string;
  time: string;
  durationMin: number;
  recurrence: RecurrenceKind;
  occurrences: number;
  appointments: SlotAppointment[];
}

export interface SeriesPlan {
  requested: number;
  dates: string[];
  created: string[];
  skipped: string[];
}

export function generateSeriesDates(
  startDate: string,
  recurrence: RecurrenceKind,
  occurrences: number
): string[] {
  if (recurrence === 'none') return [startDate];
  const step = recurrence === 'weekly' ? 7 : recurrence === 'biweekly' ? 14 : null;
  const count = Math.max(1, Math.min(occurrences, 24));
  return Array.from({ length: count }, (_, k) =>
    step ? addDays(startDate, k * step) : addMonths(startDate, k)
  );
}

export function planSeries({
  startDate,
  time,
  durationMin,
  recurrence,
  occurrences,
  appointments,
}: SeriesPlanInput): SeriesPlan {
  const dates = generateSeriesDates(startDate, recurrence, occurrences);
  const created: string[] = [];
  const skipped: string[] = [];
  const scheduled = appointments.map(a => ({ ...a }));
  for (const date of dates) {
    const slot: SlotRef = { date, time, durationMin };
    if (conflictsWith(scheduled, slot)) {
      skipped.push(date);
      continue;
    }
    created.push(date);
    scheduled.push({ ...slot, status: 'draft' });
  }
  return { requested: dates.length, dates, created, skipped };
}

export function cancelSeriesTargets(
  appointments: Appointment[],
  seriesId: string,
  anchorDate: string
): Appointment[] {
  return appointments.filter(
    a => a.seriesId === seriesId && a.date > anchorDate && a.status !== 'canceled'
  );
}
