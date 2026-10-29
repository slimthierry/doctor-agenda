import { isValidISODate, validateAppointmentDraft } from '../validation';

const NOW = { nowDate: '2026-11-01', nowMinutes: 600 };

function draft(extra: Record<string, unknown> = {}) {
  return {
    patientName: 'Afi Sodji',
    patientPhone: '',
    date: '2026-11-10',
    time: '10:00',
    durationMin: 30,
    establishmentId: 'est-1',
    ...extra,
  };
}

describe('isValidISODate', () => {
  it('accepte une date du calendrier réelle', () => {
    expect(isValidISODate('2026-11-10')).toBe(true);
    expect(isValidISODate('2026-02-28')).toBe(true);
  });

  it('rejette le mauvais format et les dates impossibles', () => {
    expect(isValidISODate('30/11/2026')).toBe(false);
    expect(isValidISODate('2026-2-10')).toBe(false);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2025-11-31')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
  });
});

describe('validateAppointmentDraft', () => {
  it('remonte TOUTES les erreurs d’un coup', () => {
    const errors = validateAppointmentDraft(
      {
        patientName: 'A',
        patientPhone: 'abc',
        date: '2026-02-30',
        time: '9:5',
        establishmentId: '',
      },
      NOW
    );
    const fields = errors.map(e => e.field);
    expect(fields).toEqual(
      expect.arrayContaining(['patientName', 'patientPhone', 'date', 'time', 'establishmentId'])
    );
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });

  it('refuse une date passée', () => {
    const errors = validateAppointmentDraft(draft({ date: '2026-10-31' }), NOW);
    expect(errors.some(e => e.field === 'date')).toBe(true);
  });

  it('refuse aujourd’hui une heure déjà passée', () => {
    const errors = validateAppointmentDraft(draft({ date: '2026-11-01', time: '09:00' }), NOW);
    expect(errors.some(e => e.field === 'time')).toBe(true);
  });

  it('refuse un créneau exactement à l’heure courante', () => {
    const errors = validateAppointmentDraft(draft({ date: '2026-11-01', time: '10:00' }), NOW);
    expect(errors.some(e => e.field === 'time')).toBe(true);
  });

  it('accepte un brouillon valide', () => {
    expect(validateAppointmentDraft(draft(), NOW)).toEqual([]);
  });

  it('teste la durée (hors bornes)', () => {
    const tooLong = validateAppointmentDraft(draft({ durationMin: 300 }), NOW);
    expect(tooLong.some(e => e.field === 'durationMin')).toBe(true);
    expect(validateAppointmentDraft(draft({ durationMin: 30 }), NOW)).toEqual([]);
  });

  it('sanctionne un téléphone optionnel mais invalide', () => {
    const errors = validateAppointmentDraft(draft({ patientPhone: '12' }), NOW);
    expect(errors.some(e => e.field === 'patientPhone')).toBe(true);
  });
});
