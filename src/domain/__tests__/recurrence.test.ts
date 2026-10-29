import { cancelSeriesTargets, generateSeriesDates, planSeries } from '../recurrence';
import { makeAppointment } from './helpers';

describe('generateSeriesDates', () => {
  it('« une fois » : la date seule', () => {
    expect(generateSeriesDates('2026-11-02', 'none', 4)).toEqual(['2026-11-02']);
  });

  it('hebdo et bimensuel', () => {
    const weekly = generateSeriesDates('2026-11-02', 'weekly', 3);
    expect(weekly).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
    const biweekly = generateSeriesDates('2026-11-02', 'biweekly', 3);
    expect(biweekly).toEqual(['2026-11-02', '2026-11-16', '2026-11-30']);
  });

  it('mensuel avec clamp au dernier jour du mois cible', () => {
    const monthly = generateSeriesDates('2026-01-31', 'monthly', 3);
    expect(monthly).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('borne le nombre d’occurrences à 1 minimum et à 24 maximum', () => {
    expect(generateSeriesDates('2026-11-02', 'weekly', 0)).toHaveLength(1);
    expect(generateSeriesDates('2026-11-02', 'weekly', 100)).toHaveLength(24);
  });
});

describe('planSeries', () => {
  const base = {
    time: '10:00',
    durationMin: 30,
    recurrence: 'weekly' as const,
    occurrences: 5,
    startDate: '2026-11-02',
  };

  it('détecte les conflits sur chaque date de la série (bug historique)', () => {
    const plan = planSeries({
      ...base,
      appointments: [
        makeAppointment({ id: 'x', date: '2026-11-09', time: '10:00', durationMin: 30 }),
      ],
    });
    expect(plan.dates).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
    ]);
    expect(plan.created).toEqual(['2026-11-02', '2026-11-16', '2026-11-23', '2026-11-30']);
    expect(plan.skipped).toEqual(['2026-11-09']);
    expect(plan.requested).toBe(5);
  });

  it('chaque créneau d’une série est notifié dans l’exécution en cours', () => {
    const plan = planSeries({
      ...base,
      recurrence: 'none',
      occurrences: 1,
      appointments: [
        makeAppointment({ id: 'x', date: '2026-11-02', time: '10:20', durationMin: 30 }),
      ],
    });
    expect(plan.created).toEqual([]);
    expect(plan.skipped).toEqual(['2026-11-02']);
  });

  it('les RDV annulés ne créent pas de conflit', () => {
    const plan = planSeries({
      ...base,
      appointments: [
        makeAppointment({
          id: 'x',
          date: '2026-11-09',
          time: '10:00',
          durationMin: 30,
          status: 'canceled',
        }),
      ],
    });
    expect(plan.created).toHaveLength(5);
    expect(plan.skipped).toEqual([]);
  });
});

describe('cancelSeriesTargets', () => {
  it('retourne les prochains RDV de la série non déjà annulés', () => {
    const all = [
      makeAppointment({ id: 'a1', seriesId: 'ser-1', date: '2026-11-02', status: 'confirmed' }),
      makeAppointment({ id: 'a2', seriesId: 'ser-1', date: '2026-11-09', status: 'confirmed' }),
      makeAppointment({ id: 'a3', seriesId: 'ser-1', date: '2026-11-16', status: 'canceled' }),
      makeAppointment({ id: 'a4', seriesId: 'ser-2', date: '2026-11-16', status: 'confirmed' }),
    ];
    const targets = cancelSeriesTargets(all, 'ser-1', '2026-11-02');
    expect(targets.map(t => t.id)).toEqual(['a2']);
  });
});
