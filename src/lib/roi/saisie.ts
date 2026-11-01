/**
 * Lecture des valeurs saisies dans le simulateur, puis appel du moteur.
 *
 * Aucune formule ici : les calculs restent dans `simuler()`. Ce module convertit seulement le texte saisi
 * (virgule décimale, pourcentages affichés de 0 à 100) et décide quels résultats peuvent être affichés.
 */
import { PARAMETRES, parSemaine, simuler, type ScenarioInputs } from './engine';

export type Cle = keyof ScenarioInputs;

export const CLES_TEMPS = ['occurrencesParMois', 'minutesParOccurrence', 'tauxAutomatisation'] as const;
export const CLES_ECONOMIE = [
  'coutHoraireCharge',
  'tauxReaffectation',
  'coutsRecurrentsMensuels',
  'investissementInitial',
  'horizonMois',
] as const;

/** Paramètres saisis en pourcentage (0 à 100) et transmis au moteur entre 0 et 1. */
export const EN_POURCENT: ReadonlySet<Cle> = new Set<Cle>(['tauxAutomatisation', 'tauxReaffectation']);

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Bornes du moteur, exprimées dans l'unité affichée. */
export function bornes(cle: Cle): { min: number; max: number } {
  const facteur = EN_POURCENT.has(cle) ? 100 : 1;
  return { min: PARAMETRES[cle].min * facteur, max: PARAMETRES[cle].max * facteur };
}

/** `null` si le champ est vide, `NaN` si le texte n'est pas un nombre positif. Accepte « 1 800,5 » et « 80 % ». */
export function lireNombre(texte: string): number | null {
  const t = texte.replace(/[\s  %€]/g, '').replace(',', '.');
  if (t === '') return null;
  return /^(\d+(\.\d*)?|\.\d+)$/.test(t) ? Number(t) : Number.NaN;
}

export interface Lecture {
  /** Valeur prête pour le moteur (pourcentages ramenés entre 0 et 1), `null` si vide ou invalide. */
  valeur: number | null;
  erreur: string | null;
}

export function lireChamp(cle: Cle, texte: string): Lecture {
  const n = lireNombre(texte);
  if (n === null) return { valeur: null, erreur: null };
  const { min, max } = bornes(cle);
  if (!Number.isFinite(n) || n < min || n > max) {
    return { valeur: null, erreur: `Saisissez un nombre entre ${nombre.format(min)} et ${nombre.format(max)}.` };
  }
  return { valeur: EN_POURCENT.has(cle) ? n / 100 : n, erreur: null };
}

/** Valeurs sans effet sur le temps libéré, utilisées tant que l'estimation économique n'est pas renseignée. */
const NEUTRE: Pick<ScenarioInputs, (typeof CLES_ECONOMIE)[number]> = {
  coutHoraireCharge: 0,
  tauxReaffectation: 0,
  coutsRecurrentsMensuels: 0,
  investissementInitial: 0,
  horizonMois: 1,
};

export interface Estimation {
  temps: { actuel: number; libere: number; restant: number; libereParSemaine: number } | null;
  /** Chaque résultat économique reste `null` tant que les paramètres dont il dépend ne sont pas saisis. */
  valorisation: number | null;
  soldeMensuel: number | null;
  soldeCumule: number | null;
  /** Solde cumulé rapporté à l'investissement ; `null` si l'investissement est nul. */
  ratio: number | null;
  /** `null` si le solde mensuel est nul ou négatif. */
  delaiRetour: number | null;
}

export function estimer(valeurs: Partial<Record<Cle, number | null>>): Estimation {
  const vide: Estimation = {
    temps: null,
    valorisation: null,
    soldeMensuel: null,
    soldeCumule: null,
    ratio: null,
    delaiRetour: null,
  };
  const present = (cles: readonly Cle[]) => cles.every((c) => typeof valeurs[c] === 'number');
  if (!present(CLES_TEMPS)) return vide;

  const saisies = Object.fromEntries(Object.entries(valeurs).filter(([, v]) => typeof v === 'number'));
  const r = simuler({ ...NEUTRE, ...saisies } as ScenarioInputs);
  const estimation: Estimation = {
    ...vide,
    temps: {
      actuel: r.heuresActuellesParMois,
      libere: r.heuresLibereesParMois,
      restant: r.heuresRestantesParMois,
      libereParSemaine: parSemaine(r.heuresLibereesParMois),
    },
  };

  if (!present(['coutHoraireCharge'])) return estimation;
  estimation.valorisation = r.tempsValoriseParMois;

  if (!present(['tauxReaffectation', 'coutsRecurrentsMensuels'])) return estimation;
  estimation.soldeMensuel = r.economiesEffectivesParMois;

  if (!present(['investissementInitial', 'horizonMois'])) return estimation;
  estimation.soldeCumule = r.gainNetSurHorizon;
  estimation.ratio = r.roiNet;
  // Un solde inférieur au demi-centime est traité comme nul : pas de délai de plusieurs milliers d'années.
  estimation.delaiRetour = r.economiesEffectivesParMois >= 0.005 ? r.delaiRetourMois : null;
  return estimation;
}
