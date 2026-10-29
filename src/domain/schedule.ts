import { AvailabilityRule, AppointmentStatus } from '../types';
import { minutesOf, todayISO } from '../utils/date';
import { ValidationError } from './validation';

export function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function overlaps(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number
): boolean {
  return aStart < bStart + bDuration && bStart < aStart + aDuration;
}

export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.getDay();
}

export function defaultRules(): AvailabilityRule[] {
  const rules: AvailabilityRule[] = [];
  for (let weekday = 1; weekday <= 6; weekday++) {
    rules.push({ id: `default-${weekday}`, weekday, start: '08:00', end: '18:00' });
  }
  return rules;
}

export function rulesForDay(
  rules: AvailabilityRule[],
  date: string,
  establishmentId?: string
): AvailabilityRule[] {
  const weekday = weekdayOf(date);
  return rules.filter(
    r =>
      r.weekday === weekday &&
      (!r.establishmentId || !establishmentId || r.establishmentId === establishmentId)
  );
}

export interface SlotAppointment {
  id?: string;
  date: string;
  time: string;
  durationMin: number;
  status?: AppointmentStatus;
}

export interface FreeSlotOptions {
  rules: AvailabilityRule[];
  appointments: SlotAppointment[];
  date: string;
  durationMin: number;
  establishmentId?: string;
  nowMinutes?: number;
  bufferMin?: number;
}

export function freeSlots({
  rules,
  appointments,
  date,
  durationMin,
  establishmentId,
  nowMinutes,
  bufferMin = 0,
}: FreeSlotOptions): string[] {
  const taken = appointments.filter(a => (a.status ?? 'confirmed') !== 'canceled');
  const dayRules = rulesForDay(rules, date, establishmentId);
  const slots = new Set<string>();
  for (const rule of dayRules) {
    const frm = minutesOf(rule.start);
    const to = minutesOf(rule.end);
    let t = frm;
    while (t + durationMin <= to) {
      const time = hhmm(t);
      const busy = taken.some(a =>
        overlaps(t - bufferMin, durationMin + 2 * bufferMin, minutesOf(a.time), a.durationMin)
      );
      if (!busy) {
        slots.add(time);
      }
      t += durationMin;
    }
  }
  let result = [...slots].sort();
  if (date === todayISO() && nowMinutes !== undefined) {
    result = result.filter(t => minutesOf(t) > nowMinutes);
  }
  return result;
}

export interface SlotRef {
  date: string;
  time: string;
  durationMin: number;
}

export function conflictsWith(
  appointments: SlotAppointment[],
  slot: SlotRef,
  excludeId?: string
): boolean {
  return appointments.some(
    a =>
      a.id !== excludeId &&
      a.date === slot.date &&
      (a.status ?? 'confirmed') !== 'canceled' &&
      overlaps(minutesOf(slot.time), slot.durationMin, minutesOf(a.time), a.durationMin)
  );
}

export function availableMinutesForDay(
  rules: AvailabilityRule[],
  date: string,
  establishmentId?: string
): number {
  return rulesForDay(rules, date, establishmentId)
    .map(r => minutesOf(r.end) - minutesOf(r.start))
    .filter(m => m > 0)
    .reduce((sum, m) => sum + m, 0);
}

export const WEEKDAY_NAMES = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];

const MIN_WINDOW_MINUTES = 30;

export function validateAvailabilityRules(rules: AvailabilityRule[]): ValidationError[] {
  const issues: ValidationError[] = [];
  for (const rule of rules) {
    if (rule.start === rule.end) continue;
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.end)
    ) {
      issues.push({
        field: `availability-${rule.id}`,
        message: `Horaire invalide pour ${WEEKDAY_NAMES[rule.weekday]}.`,
      });
      continue;
    }
    if (minutesOf(rule.end) < minutesOf(rule.start)) {
      issues.push({
        field: `availability-${rule.id}`,
        message: `${WEEKDAY_NAMES[rule.weekday]} : l'horaire de fin doit être après l'horaire de début.`,
      });
      continue;
    }
    if (minutesOf(rule.end) - minutesOf(rule.start) < MIN_WINDOW_MINUTES) {
      issues.push({
        field: `availability-${rule.id}`,
        message: `${WEEKDAY_NAMES[rule.weekday]} : la plage doit durer au moins ${MIN_WINDOW_MINUTES} minutes.`,
      });
    }
  }
  return issues;
}
