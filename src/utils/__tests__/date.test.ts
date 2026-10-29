import { addDays, addMonths, fromISO, todayISO, toISO, weekDays } from '../date';

describe('addDays', () => {
  it('traverse les mois et les années', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-30', 5)).toBe('2027-01-04');
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01');
  });
});

describe('addMonths', () => {
  it('clamp au dernier jour du mois ciblé', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonths('2027-01-31', 2)).toBe('2027-03-31');
  });
});

describe('weekDays', () => {
  it('retourne lundi → dimanche de la semaine contenant la date', () => {
    expect(weekDays('2026-11-01')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
  });
});

describe('toISO / fromISO / todayISO', () => {
  it('effectuent des allers-retours localement, sans décalage UTC', () => {
    const d = new Date(2026, 10, 2);
    const iso = toISO(d);
    expect(iso).toBe('2026-11-02');
    const back = fromISO(iso);
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(10);
    expect(back.getDate()).toBe(2);
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
