import { describe, expect, it } from 'vitest';
import { estimer, lireChamp, lireNombre } from './saisie';

const relances = { occurrencesParMois: 120, minutesParOccurrence: 6, tauxAutomatisation: 0.8 };
const permanence = { occurrencesParMois: 100, minutesParOccurrence: 3, tauxAutomatisation: 0.6 };

describe('lireNombre', () => {
  it('accepte la virgule décimale, les espaces et les unités', () => {
    expect(lireNombre('6,5')).toBe(6.5);
    expect(lireNombre('1 800')).toBe(1800);
    expect(lireNombre('1 800,50 €')).toBe(1800.5);
    expect(lireNombre('80 %')).toBe(80);
  });

  it('distingue champ vide et saisie invalide', () => {
    expect(lireNombre('  ')).toBeNull();
    expect(lireNombre('abc')).toBeNaN();
    expect(lireNombre('-5')).toBeNaN();
    expect(lireNombre('1,2,3')).toBeNaN();
  });
});

describe('lireChamp', () => {
  it('ramène les pourcentages affichés entre 0 et 1', () => {
    expect(lireChamp('tauxAutomatisation', '80')).toEqual({ valeur: 0.8, erreur: null });
  });

  it('applique les bornes du moteur dans l’unité affichée', () => {
    expect(lireChamp('tauxAutomatisation', '120').erreur).toMatch(/entre 0 et 100/);
    expect(lireChamp('minutesParOccurrence', '601').erreur).toMatch(/entre 0 et 600/);
    expect(lireChamp('horizonMois', '0').erreur).toMatch(/entre 1 et 120/);
    expect(lireChamp('coutHoraireCharge', '').erreur).toBeNull();
  });
});

describe('estimer', () => {
  it('retrouve les valeurs initiales des deux scénarios', () => {
    const r = estimer(relances).temps!;
    expect(r.actuel).toBeCloseTo(12);
    expect(r.libere).toBeCloseTo(9.6);
    expect(r.restant).toBeCloseTo(2.4);
    expect(r.libereParSemaine).toBeCloseTo((9.6 * 12) / 52);

    const p = estimer(permanence).temps!;
    expect(p.actuel).toBeCloseTo(5);
    expect(p.libere).toBeCloseTo(3);
    expect(p.restant).toBeCloseTo(2);
  });

  it("n'affiche aucun résultat économique tant que les paramètres ne sont pas saisis", () => {
    const r = estimer(relances);
    expect(r.valorisation).toBeNull();
    expect(r.soldeMensuel).toBeNull();
    expect(r.soldeCumule).toBeNull();
  });

  it('calcule par paliers, selon les paramètres renseignés', () => {
    const r = estimer({ ...relances, coutHoraireCharge: 38 });
    expect(r.valorisation).toBeCloseTo(364.8);
    expect(r.soldeMensuel).toBeNull();
  });

  it("reprend les résultats du moteur pour l'exemple fixe", () => {
    const r = estimer({
      ...relances,
      coutHoraireCharge: 38,
      tauxReaffectation: 0.5,
      coutsRecurrentsMensuels: 45,
      investissementInitial: 1800,
      horizonMois: 24,
    });
    expect(r.soldeMensuel).toBeCloseTo(137.4);
    expect(r.soldeCumule).toBeCloseTo(1497.6);
    expect(r.ratio).toBeCloseTo(0.832);
    expect(r.delaiRetour).toBeCloseTo(13.1, 1);
  });

  it('conserve un solde négatif sans délai de retour', () => {
    const r = estimer({
      ...relances,
      coutHoraireCharge: 30,
      tauxReaffectation: 0.2,
      coutsRecurrentsMensuels: 200,
      investissementInitial: 1000,
      horizonMois: 12,
    });
    expect(r.soldeMensuel!).toBeLessThan(0);
    expect(r.soldeCumule!).toBeLessThan(-1000);
    expect(r.delaiRetour).toBeNull();
  });

  it('traite un solde nul comme une absence de retour, sans division par zéro', () => {
    const r = estimer({
      ...relances,
      coutHoraireCharge: 10,
      tauxReaffectation: 0.5,
      coutsRecurrentsMensuels: 48,
      investissementInitial: 500,
      horizonMois: 12,
    });
    expect(r.soldeMensuel).toBeCloseTo(0);
    expect(r.delaiRetour).toBeNull();
  });

  it("n'affiche pas de ratio sans investissement initial", () => {
    const r = estimer({
      ...relances,
      coutHoraireCharge: 38,
      tauxReaffectation: 0.5,
      coutsRecurrentsMensuels: 45,
      investissementInitial: 0,
      horizonMois: 24,
    });
    expect(r.ratio).toBeNull();
  });

  it('ne calcule rien si un paramètre de temps manque', () => {
    expect(estimer({ ...relances, minutesParOccurrence: null }).temps).toBeNull();
  });
});
