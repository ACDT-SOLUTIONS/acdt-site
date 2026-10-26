import { describe, expect, it } from 'vitest';
import { simuler, type ScenarioInputs } from './engine';

const base: ScenarioInputs = {
  occurrencesParMois: 120,
  minutesParOccurrence: 6,
  tauxAutomatisation: 0.8,
  coutHoraireCharge: 38,
  tauxReaffectation: 0.5,
  coutsRecurrentsMensuels: 45,
  investissementInitial: 1800,
  horizonMois: 24,
};

describe('simuler', () => {
  it('distingue temps libéré, temps valorisé, économies effectives et ROI net', () => {
    const r = simuler(base);
    expect(r.heuresLibereesParMois).toBeCloseTo(9.6);
    expect(r.tempsValoriseParMois).toBeCloseTo(364.8);
    expect(r.economiesEffectivesParMois).toBeCloseTo(137.4);
    expect(r.gainNetSurHorizon).toBeCloseTo(1497.6);
    expect(r.roiNet).toBeCloseTo(0.832);
    expect(r.delaiRetourMois).toBeCloseTo(13.1, 1);
  });

  it("ne compte aucune économie si le temps libéré n'est pas réaffecté", () => {
    const r = simuler({ ...base, tauxReaffectation: 0 });
    expect(r.tempsValoriseParMois).toBeGreaterThan(0);
    expect(r.economiesEffectivesParMois).toBe(-45);
    expect(r.delaiRetourMois).toBeNull();
  });

  it("renvoie un ROI nul (null) sans investissement plutôt qu'une division par zéro", () => {
    const r = simuler({ ...base, investissementInitial: 0 });
    expect(r.roiNet).toBeNull();
    expect(r.delaiRetourMois).toBe(0);
  });

  it('rejette les valeurs hors limites', () => {
    expect(() => simuler({ ...base, tauxAutomatisation: 1.5 })).toThrow(RangeError);
    expect(() => simuler({ ...base, occurrencesParMois: -1 })).toThrow(RangeError);
    expect(() => simuler({ ...base, horizonMois: Number.NaN })).toThrow(RangeError);
  });
});
