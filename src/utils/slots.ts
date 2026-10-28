import { AvailabilityRule } from '../types';
import { minutesOf } from './date';

export function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Chevauchement d'intervalle — équivalent backend `overlaps`. */
export function overlaps(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number,
): boolean {
  return aStart < bStart + bDuration && bStart < aStart + aDuration;
}

/** Jour de la semaine 0 (dimanche) … 6 (samedi) — équivalent backend `weekday_of`. */
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

/** Règles applicables à un jour donné (filtre établissement). */
export function rulesForDay(
  rules: AvailabilityRule[],
  date: string,
  establishmentId?: string,
): AvailabilityRule[] {
  const weekday = weekdayOf(date);
  return rules.filter(
    (r) => r.weekday === weekday && (!r.establishmentId || !establishmentId || r.establishmentId === establishmentId),
  );
}

export interface FreeSlotOptions {
  /** Règles de disponibilité (local-first ; fallback : defaultRules si vide) */
  rules: AvailabilityRule[];
  /** Rendez-vous du médecin pour la journée sélectionnée (une seule vérité métier) */
  appointments: Array<{ time: string; durationMin: number; status?: string }>;
  date: string;
  durationMin: number;
  establishmentId?: string;
  /** Minutes du jour courantes — pour masquer les créneaux passés (aujourd'hui) */
  nowMinutes?: number;
}

/**
 * Créneaux libres — portage exact de `app/slots.py::free_slots`
 * (free_slots / overlaps / weekday_of / default_rules).
 */
export function freeSlots({
  rules,
  appointments,
  date,
  durationMin,
  establishmentId,
  nowMinutes,
}: FreeSlotOptions): string[] {
  const taken = appointments.filter((a) => (a.status ?? 'confirmed') !== 'canceled');
  const dayRules = rulesForDay(rules, date, establishmentId);
  const slots = new Set<string>();
  for (const rule of dayRules) {
    const frm = minutesOf(rule.start);
    const to = minutesOf(rule.end);
    let t = frm;
    while (t + durationMin <= to) {
      const time = hhmm(t);
      const busy = taken.some((a) => overlaps(t, durationMin, minutesOf(a.time), a.durationMin));
      if (!busy) {
        slots.add(time);
      }
      t += durationMin;
    }
  }
  let result = [...slots].sort();
  const isToday = date === new Date().toISOString().slice(0, 10);
  if (isToday && nowMinutes !== undefined) {
    result = result.filter((t) => minutesOf(t) > nowMinutes);
  }
  return result;
}
