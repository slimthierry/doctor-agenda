import { dayStats } from '../stats';
import { newSeriesId, createAppointment } from '../appointment';
import { makeAppointment } from './helpers';

const RULES = [{ id: 'r', weekday: 1, start: '09:00', end: '13:00' }];

describe('dayStats', () => {
  const monday = '2026-11-02';

  const appointments = [
    makeAppointment({ id: '1', date: monday, time: '09:00', durationMin: 30, status: 'confirmed' }),
    makeAppointment({ id: '2', date: monday, time: '10:00', durationMin: 30, status: 'draft' }),
    makeAppointment({ id: '3', date: monday, time: '11:00', durationMin: 30, status: 'done' }),
    makeAppointment({ id: '4', date: monday, time: '12:00', durationMin: 30, status: 'canceled' }),
    makeAppointment({ id: '5', date: '2026-11-03', time: '09:00', durationMin: 30 }),
  ];

  it('compte les RDV du jour par statut, annulés hors total', () => {
    const stats = dayStats(appointments, monday, RULES);
    expect(stats.total).toBe(3);
    expect(stats.confirmed).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.canceled).toBe(1);
  });

  it('calcule le taux d’occupation (minutes réservées / fenêtre disponible)', () => {
    const stats = dayStats(appointments, monday, RULES);
    expect(stats.availableMinutes).toBe(240);
    expect(stats.bookedMinutes).toBe(90);
    expect(stats.occupancy).toBe(38);
  });

  it('occupation nulle sur un journé fermé (0/0 → null)', () => {
    const stats = dayStats(appointments, '2026-11-01', RULES);
    expect(stats.availableMinutes).toBe(0);
    expect(stats.occupancy).toBeNull();
  });

  it('plafonne l’occupation à 100 %', () => {
    const overbooked = [
      makeAppointment({ id: '1', date: monday, time: '09:00', durationMin: 240 }),
    ];
    expect(dayStats(overbooked, monday, RULES).occupancy).toBe(100);
  });
});

describe('createAppointment', () => {
  it('crée un RDV à confirmer avec identifiants fraîches', () => {
    const now = '2026-11-01T09:00:00.000Z';
    const appt = createAppointment(
      {
        patientName: 'Afi Sodji',
        establishmentId: 'est-1',
        date: '2026-11-02',
        time: '09:00',
        durationMin: 30,
        seriesId: 'ser-1',
      },
      now
    );
    expect(appt.status).toBe('draft');
    expect(appt.createdAt).toBe(now);
    expect(appt.updatedAt).toBe(now);
    expect(appt.id).toBeTruthy();
    expect(appt.patientPhone).toBeUndefined();
  });

  it('génère des identifiants différents', () => {
    const a = newSeriesId();
    const b = newSeriesId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^ser-/);
  });
});
