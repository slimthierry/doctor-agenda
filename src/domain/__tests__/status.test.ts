import { allowedNext, canTransition, statusMeta } from '../status';

describe('statusMeta', () => {
  it('fournit un libellé français par statut', () => {
    expect(statusMeta('draft').label).toBe('À confirmer');
    expect(statusMeta('confirmed').label).toBe('Confirmé');
    expect(statusMeta('done').label).toBe('Terminé');
    expect(statusMeta('canceled').label).toBe('Annulé');
  });
});

describe('canTransition', () => {
  it('à confirmer → confirmé / terminé / annulé', () => {
    expect(canTransition('draft', 'confirmed')).toBe(true);
    expect(canTransition('draft', 'done')).toBe(true);
    expect(canTransition('draft', 'canceled')).toBe(true);
  });

  it('confirmé → terminé / annulé, mais pas de retour en arrière', () => {
    expect(canTransition('confirmed', 'done')).toBe(true);
    expect(canTransition('confirmed', 'canceled')).toBe(true);
    expect(canTransition('confirmed', 'draft')).toBe(false);
  });

  it('terminé et annulé sont terminaux', () => {
    for (const to of ['draft', 'confirmed', 'done', 'canceled'] as const) {
      expect(canTransition('done', to)).toBe(false);
      expect(canTransition('canceled', to)).toBe(false);
    }
  });

  it('aucune transition vers le même statut', () => {
    for (const s of ['draft', 'confirmed', 'done', 'canceled'] as const) {
      expect(canTransition(s, s)).toBe(false);
    }
  });
});

describe('allowedNext', () => {
  it('concentre la machine à états', () => {
    expect(allowedNext('draft')).toEqual(['confirmed', 'done', 'canceled']);
    expect(allowedNext('confirmed')).toEqual(['done', 'canceled']);
    expect(allowedNext('done')).toEqual([]);
    expect(allowedNext('canceled')).toEqual([]);
  });
});
