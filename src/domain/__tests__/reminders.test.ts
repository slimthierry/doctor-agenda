import { pendingPushReminders, startMsOf } from '../reminders';
import { makeAppointment } from './helpers';
import { toISO } from '../../utils/date';

const LEAD = 60;
const BASE = makeAppointment({ date: '2026-11-02', time: '10:00', status: 'confirmed', id: 'a' });
const BASE_START = startMsOf(BASE);
const NOW = BASE_START - LEAD * 60_000 - 60_000;

function apptAt(startMs: number, overrides = {}) {
  const d = new Date(startMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return makeAppointment({
    date: toISO(d),
    time: `${hh}:${mm}`,
    status: 'confirmed',
    ...overrides,
  });
}

describe('pendingPushReminders', () => {
  it('sélectionne les RDV dont le rappel tombe dans l’horizon', () => {
    const selected = pendingPushReminders([BASE], { leadMin: LEAD, nowMs: NOW });
    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe('a');
    expect(startMsOf(selected[0])).toBe(BASE_START);
  });

  it('ignore annulé, terminé, déjà pourvu en rappel et rappel dépassé', () => {
    const appts = [
      apptAt(BASE_START, { id: 'canceled', status: 'canceled' }),
      apptAt(BASE_START, { id: 'done', status: 'done' }),
      apptAt(BASE_START, { id: 'armed', reminderId: 'n-1' }),
      apptAt(BASE_START - 30 * 60_000, { id: 'toolate' }),
    ];
    expect(pendingPushReminders(appts, { leadMin: LEAD, nowMs: NOW })).toHaveLength(0);
  });

  it('ignore les RDV hors horizon de 48 h', () => {
    const far = apptAt(BASE_START + 50 * 3_600_000, { id: 'far' });
    expect(pendingPushReminders([far], { leadMin: LEAD, nowMs: NOW })).toHaveLength(0);
  });

  it('plafonne et trie par rappel le plus proche', () => {
    const appts = [
      apptAt(BASE_START + 60 * 60_000, { id: 'z' }),
      BASE,
      apptAt(BASE_START + 30 * 60_000, { id: 'b' }),
    ];
    const selected = pendingPushReminders(appts, { leadMin: LEAD, nowMs: NOW, maxCount: 2 });
    expect(selected.map(a => a.id)).toEqual(['a', 'b']);
  });

  it('inclut les RDV à confirmer (draft)', () => {
    const selected = pendingPushReminders([apptAt(BASE_START, { status: 'draft' })], {
      leadMin: LEAD,
      nowMs: NOW,
    });
    expect(selected).toHaveLength(1);
  });
});
