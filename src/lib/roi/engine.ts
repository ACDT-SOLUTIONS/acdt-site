/**
 * Moteur de calcul des simulations de gains.
 *
 * Source unique de vérité : les scénarios publiés et le calculateur appellent
 * tous les deux `simuler()`, afin que leurs chiffres ne puissent pas diverger.
 *
 * Quatre notions sont volontairement distinguées :
 *  - temps libéré       : heures qui ne sont plus consacrées à la tâche ;
 *  - temps valorisé     : valeur théorique de ces heures au coût horaire chargé ;
 *  - économies effectives : part réellement récupérée, nette des coûts récurrents ;
 *  - ROI net            : gain cumulé sur l'horizon, déduction faite de l'investissement.
 */

export interface ScenarioInputs {
  /** Nombre de fois où la tâche est réalisée chaque mois. */
  occurrencesParMois: number;
  /** Durée moyenne d'une occurrence, en minutes. */
  minutesParOccurrence: number;
  /** Part de la tâche réellement prise en charge par l'automatisation (0 à 1). */
  tauxAutomatisation: number;
  /** Coût horaire chargé de la personne qui réalise la tâche, en euros. */
  coutHoraireCharge: number;
  /** Part du temps libéré qui se traduit par une économie ou un gain réel (0 à 1). */
  tauxReaffectation: number;
  /** Coûts récurrents de la solution (abonnements, hébergement, maintenance), en euros par mois. */
  coutsRecurrentsMensuels: number;
  /** Investissement initial, en euros. */
  investissementInitial: number;
  /** Durée d'analyse, en mois. */
  horizonMois: number;
}

export interface ScenarioResult {
  heuresLibereesParMois: number;
  tempsValoriseParMois: number;
  economiesEffectivesParMois: number;
  gainNetSurHorizon: number;
  /** Gain net rapporté à l'investissement ; `null` si l'investissement est nul. */
  roiNet: number | null;
  /** Mois nécessaires pour couvrir l'investissement ; `null` si les économies sont nulles ou négatives. */
  delaiRetourMois: number | null;
}

type Parametre = keyof ScenarioInputs;

interface ParametreMeta {
  label: string;
  unite: string;
  min: number;
  max: number;
}

export const PARAMETRES: Record<Parametre, ParametreMeta> = {
  occurrencesParMois: { label: 'Occurrences par mois', unite: '/ mois', min: 0, max: 100_000 },
  minutesParOccurrence: { label: 'Durée par occurrence', unite: 'min', min: 0, max: 600 },
  tauxAutomatisation: { label: "Taux d'automatisation", unite: '%', min: 0, max: 1 },
  coutHoraireCharge: { label: 'Coût horaire chargé', unite: '€ / h', min: 0, max: 1_000 },
  tauxReaffectation: { label: 'Taux de réaffectation', unite: '%', min: 0, max: 1 },
  coutsRecurrentsMensuels: { label: 'Coûts récurrents', unite: '€ / mois', min: 0, max: 100_000 },
  investissementInitial: { label: 'Investissement initial', unite: '€', min: 0, max: 10_000_000 },
  horizonMois: { label: "Horizon d'analyse", unite: 'mois', min: 1, max: 120 },
};

export const FORMULES = {
  tempsLibere: "occurrences × durée × taux d'automatisation ÷ 60",
  tempsValorise: 'temps libéré × coût horaire chargé',
  economiesEffectives: 'temps valorisé × taux de réaffectation − coûts récurrents',
  gainNet: 'économies effectives × horizon − investissement initial',
  roiNet: 'gain net ÷ investissement initial',
  delaiRetour: 'investissement initial ÷ économies effectives mensuelles',
} as const;

export function validerInputs(inputs: ScenarioInputs): void {
  for (const [cle, meta] of Object.entries(PARAMETRES) as [Parametre, ParametreMeta][]) {
    const valeur = inputs[cle];
    if (!Number.isFinite(valeur) || valeur < meta.min || valeur > meta.max) {
      throw new RangeError(`${meta.label} : ${valeur} hors de l'intervalle [${meta.min}, ${meta.max}]`);
    }
  }
}

export function simuler(inputs: ScenarioInputs): ScenarioResult {
  validerInputs(inputs);

  const heuresLibereesParMois =
    (inputs.occurrencesParMois * inputs.minutesParOccurrence * inputs.tauxAutomatisation) / 60;
  const tempsValoriseParMois = heuresLibereesParMois * inputs.coutHoraireCharge;
  const economiesEffectivesParMois =
    tempsValoriseParMois * inputs.tauxReaffectation - inputs.coutsRecurrentsMensuels;
  const gainNetSurHorizon = economiesEffectivesParMois * inputs.horizonMois - inputs.investissementInitial;

  return {
    heuresLibereesParMois,
    tempsValoriseParMois,
    economiesEffectivesParMois,
    gainNetSurHorizon,
    roiNet: inputs.investissementInitial > 0 ? gainNetSurHorizon / inputs.investissementInitial : null,
    delaiRetourMois:
      economiesEffectivesParMois > 0 ? inputs.investissementInitial / economiesEffectivesParMois : null,
  };
}
