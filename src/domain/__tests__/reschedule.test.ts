import { buildUpdatePatch, slotChanged } from '../appointment';
import { validateAvailabilityRules, type AvailabilityRule } from '../schedule';
import type { ValidationError } from '../validation';
import { makeAppointment } from './helpers';

const CURRENT = makeAppointment({
  date: '2026-11-02',
  time: '10:00',
  durationMin: 30,
  reminderId: 'push-1',
  reminderSentAt: undefined,
});

describe('slotChanged', () => {
  it('détecte un déplacement de date, d’heure ou de durée', () => {
    expect(slotChanged(CURRENT, { date: '2026-11-03' })).toBe(true);
    expect(slotChanged(CURRENT, { time: '10:30' })).toBe(true);
    expect(slotChanged(CURRENT, { durationMin: 45 })).toBe(true);
    expect(slotChanged(CURRENT, { status: 'confirmed' })).toBe(false);
  });
});

describe('buildUpdatePatch', () => {
  it('hors déplacement : ne touche pas aux rappels', () => {
    const patch = buildUpdatePatch(
      CURRENT,
      { reason: 'Nouveau motif' },
      '2026-11-01T08:00:00.000Z'
    );
    expect(patch.reminderId).toBeUndefined();
    expect(patch.updatedAt).toBe('2026-11-01T08:00:00.000Z');
  });

  it('sur déplacement : débranche rappel push et miroir serveur', () => {
    const patch = buildUpdatePatch(CURRENT, { time: '14:00' }, '2026-11-01T08:00:00.000Z');
    expect(patch.time).toBe('14:00');
    expect(patch.reminderId).toBeUndefined();
    expect(patch.reminderSentAt).toBeUndefined();
    expect(patch.updatedAt).toBe('2026-11-01T08:00:00.000Z');
  });
});

describe('validateAvailabilityRules', () => {
  const ok: AvailabilityRule[] = [{ id: 'r1', weekday: 1, start: '08:00', end: '12:00' }];

  it('accepte une plage ouverte standard et un jour fermé', () => {
    expect(
      validateAvailabilityRules([...ok, { id: 'r2', weekday: 0, start: '09:00', end: '09:00' }])
    ).toEqual([]);
  });

  it('rejette l’inversion et les plages courtes', () => {
    const issues: ValidationError[] = validateAvailabilityRules([
      { id: 'r1', weekday: 1, start: '14:00', end: '08:00' },
      { id: 'r2', weekday: 2, start: '09:00', end: '09:15' },
    ]);
    expect(issues).toHaveLength(2);
    expect(issues[0].message).toContain('lundi');
    expect(issues[1].message).toContain('au moins 30 minutes');
  });

  it('rejette les horaires malformés', () => {
    const issues = validateAvailabilityRules([
      { id: 'r1', weekday: 3, start: '8:00', end: '12:00' },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('mercredi');
  });
});
