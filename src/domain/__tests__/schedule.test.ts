import type { AvailabilityRule } from '../../types';
import {
  availableMinutesForDay,
  conflictsWith,
  defaultRules,
  freeSlots,
  hhmm,
  overlaps,
  rulesForDay,
  weekdayOf,
  type SlotAppointment,
} from '../schedule';
import { todayISO } from '../../utils/date';

const RULES: AvailabilityRule[] = [
  { id: 'r-lun', weekday: 1, start: '08:00', end: '12:00' },
  { id: 'r-mar', weekday: 2, start: '09:00', end: '18:00' },
  { id: 'r-lun-est', establishmentId: 'est-1', weekday: 1, start: '14:00', end: '16:00' },
];

describe('hhmm', () => {
  it('formate 8h30 et 10h en HH:mm', () => {
    expect(hhmm(510)).toBe('08:30');
    expect(hhmm(600)).toBe('10:00');
  });
});

describe('overlaps', () => {
  it('ne compte pas deux créneaux qui se touchent', () => {
    expect(overlaps(540, 30, 570, 30)).toBe(false);
    expect(overlaps(540, 30, 500, 40)).toBe(false);
  });

  it('détecte les chevauchements et l’inclusion', () => {
    expect(overlaps(540, 30, 550, 30)).toBe(true);
    expect(overlaps(540, 60, 570, 30)).toBe(true);
    expect(overlaps(570, 30, 540, 60)).toBe(true);
  });
});

describe('weekdayOf', () => {
  it('retourne la convention 0=dimanche', () => {
    expect(weekdayOf('2026-11-01')).toBe(0);
    expect(weekdayOf('2026-11-02')).toBe(1);
    expect(weekdayOf('2026-11-07')).toBe(6);
  });
});

describe('rulesForDay', () => {
  it('filtre par jour de la semaine', () => {
    const mondayRules = rulesForDay(RULES, '2026-11-02');
    expect(mondayRules.map(r => r.id)).toEqual(['r-lun', 'r-lun-est']);
  });

  it('précisé avec un établissement, applique les règles spécifiques', () => {
    const rules = rulesForDay(RULES, '2026-11-02', 'est-1');
    expect(rules.map(r => r.id)).toEqual(['r-lun', 'r-lun-est']);
    const other = rulesForDay(RULES, '2026-11-02', 'est-2');
    expect(other.map(r => r.id)).toEqual(['r-lun']);
  });
});

describe('freeSlots', () => {
  const monday = '2026-11-02';

  it('liste les créneaux libres d’une journée selon les règles', () => {
    const slots = freeSlots({
      rules: [{ id: 'r', weekday: 1, start: '09:00', end: '10:30' }],
      appointments: [],
      date: monday,
      durationMin: 30,
    });
    expect(slots).toEqual(['09:00', '09:30', '10:00']);
  });

  it('exclut les slots occupés par un RDV (bords inclus)', () => {
    const slots = freeSlots({
      rules: [{ id: 'r', weekday: 1, start: '09:00', end: '11:00' }],
      appointments: [{ date: monday, time: '09:30', durationMin: 30, status: 'confirmed' }],
      date: monday,
      durationMin: 30,
    });
    expect(slots).toEqual(['09:00', '10:00', '10:30']);
  });

  it('ignore les RDV annulés', () => {
    const slots = freeSlots({
      rules: [{ id: 'r', weekday: 1, start: '09:00', end: '10:30' }],
      appointments: [{ date: monday, time: '09:00', durationMin: 30, status: 'canceled' }],
      date: monday,
      durationMin: 30,
    });
    expect(slots).toEqual(['09:00', '09:30', '10:00']);
  });

  it('retire les créneaux passés pour aujourd’hui', () => {
    const today = todayISO();
    const slots = freeSlots({
      rules: [{ id: 'r', weekday: weekdayOf(today), start: '08:00', end: '11:00' }],
      appointments: [],
      date: today,
      durationMin: 30,
      nowMinutes: 9 * 60 + 15,
    });
    expect(slots).toEqual(['09:30', '10:00', '10:30']);
  });

  it('applique un buffer entre les RDV', () => {
    const slots = freeSlots({
      rules: [{ id: 'r', weekday: 1, start: '09:00', end: '11:00' }],
      appointments: [{ date: monday, time: '09:30', durationMin: 30, status: 'confirmed' }],
      date: monday,
      durationMin: 30,
      bufferMin: 15,
    });
    expect(slots).toEqual(['10:30']);
  });
});

describe('conflictsWith', () => {
  const list: SlotAppointment[] = [
    { id: 'a', date: '2026-11-02', time: '09:00', durationMin: 30, status: 'confirmed' },
    { id: 'b', date: '2026-11-02', time: '10:00', durationMin: 30, status: 'canceled' },
    { id: 'c', date: '2026-11-03', time: '09:00', durationMin: 30, status: 'confirmed' },
  ];

  it('détecte le chevauchement même-dates non annulé', () => {
    expect(conflictsWith(list, { date: '2026-11-02', time: '09:20', durationMin: 30 })).toBe(true);
  });

  it('rien après un créneau terminé, rien pour un RDV annulé, pas d’autres dates', () => {
    expect(conflictsWith(list, { date: '2026-11-02', time: '09:30', durationMin: 30 })).toBe(false);
    expect(conflictsWith(list, { date: '2026-11-02', time: '10:00', durationMin: 30 })).toBe(false);
    expect(conflictsWith(list, { date: '2026-11-03', time: '09:00', durationMin: 30 })).toBe(true);
  });

  it('exclut un RDV donné via excludeId', () => {
    const conflict =
      conflictsWith(list, { date: '2026-11-02', time: '09:20', durationMin: 30 }, 'a') === false &&
      conflictsWith(list, { date: '2026-11-02', time: '09:20', durationMin: 30 }) === true;
    expect(conflict).toBe(true);
  });
});

describe('availableMinutesForDay', () => {
  it('additionne les fenêtres applicables du jour', () => {
    expect(availableMinutesForDay(RULES, '2026-11-02')).toBe(240 + 120);
    expect(availableMinutesForDay(RULES, '2026-11-02', 'est-1')).toBe(240 + 120);
    expect(availableMinutesForDay(RULES, '2026-11-01')).toBe(0);
  });
});

describe('defaultRules', () => {
  it('couvre lundi à samedi 08:00–18:00', () => {
    const rules = defaultRules();
    expect(rules.map(r => r.weekday)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rules[0]).toMatchObject({ start: '08:00', end: '18:00' });
  });
});
