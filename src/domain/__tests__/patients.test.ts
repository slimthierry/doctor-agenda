import { aggregatePatients, normalizePhone, patientKey } from '../patients';
import type { Appointment } from '../../types';

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a',
    patientName: 'Test Patient',
    establishmentId: 'est-1',
    date: '2026-11-02',
    time: '09:00',
    durationMin: 30,
    status: 'done',
    createdAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('normalizePhone', () => {
  it('nettoie les séparateurs et convertit 00 → +', () => {
    expect(normalizePhone('+228 90 00 00 01')).toBe('+22890000001');
    expect(normalizePhone('0022890000001')).toBe('+22890000001');
    expect(normalizePhone('  +228-90-00-00-02 ')).toBe('+22890000002');
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });
});

describe('patientKey', () => {
  it('priorise le téléphone normalisé, sinon un nom normalisé', () => {
    expect(patientKey(appt({ patientPhone: '+228 90 00 00 01' }))).toBe('+22890000001');
    expect(patientKey(appt({ patientPhone: ' ', patientName: '  AFI   Sodji ' }))).toBe(
      'afi sodji'
    );
  });
});

describe('aggregatePatients', () => {
  it('déduplique par téléphone normalisé, indépendamment de la casse du nom', () => {
    const list = aggregatePatients([
      appt({
        id: '1',
        patientName: 'Afi sodji',
        patientPhone: '+228 90 00 00 01',
        date: '2026-01-10',
      }),
      appt({ id: '2', patientName: 'AFI Sodji', patientPhone: '+22890000001', date: '2026-02-20' }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].visits).toBe(2);
    expect(list[0].name).toBe('AFI Sodji');
    expect(list[0].phone).toBe('+22890000001');
    expect(list[0].lastDate).toBe('2026-02-20');
  });

  it('exclut les RDV annulés de l’historique', () => {
    const list = aggregatePatients([
      appt({ id: '1', patientPhone: '+22890000001', status: 'done' }),
      appt({ id: '2', patientPhone: '+22890000001', status: 'canceled' }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].visits).toBe(1);
  });

  it('retient la date la plus récente et trie par dernière activité', () => {
    const list = aggregatePatients([
      appt({ id: '1', patientPhone: '+22890000001', date: '2026-01-10' }),
      appt({ id: '2', patientPhone: '+22890000001', date: '2026-03-20', patientName: 'Afi Maj' }),
      appt({ id: '3', patientPhone: '+22890000002', date: '2026-02-11' }),
    ]);
    expect(list[0]).toMatchObject({ name: 'Afi Maj', lastDate: '2026-03-20' });
    expect(list[1].lastDate).toBe('2026-02-11');
  });

  it('récupère un patient identifié par son nom quand aucune raison sociale n’est trouvée', () => {
    const list = aggregatePatients([
      appt({ id: '1', patientPhone: undefined, patientName: 'Koffi AMEGAN' }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('koffi amegan');
  });
});
