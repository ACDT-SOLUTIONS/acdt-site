import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { PARAMETRES, simuler, type ScenarioInputs } from './roi/engine';

export type CleParametre = keyof ScenarioInputs;

/** Paramètres réglables dans l'outil d'évaluation ; les autres restent des hypothèses fixes. */
export const REGLAGES: { cle: CleParametre; min: number; max: number; step: number }[] = [
  { cle: 'occurrencesParMois', min: 0, max: 400, step: 5 },
  { cle: 'minutesParOccurrence', min: 1, max: 30, step: 1 },
  { cle: 'coutHoraireCharge', min: 15, max: 120, step: 1 },
  { cle: 'tauxReaffectation', min: 0, max: 1, step: 0.05 },
];

export const CLES = Object.keys(PARAMETRES) as CleParametre[];

/** Rassemble tout ce qu'il faut pour afficher un scénario : relations, résultats et sources. */
export async function chargerScenario(scenario: CollectionEntry<'simulations'>) {
  const base: ScenarioInputs = scenario.data.parametres;
  const sourceIds = [
    ...new Set(
      Object.values(scenario.data.justifications)
        .map((j) => j.source?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const sources = (await Promise.all(sourceIds.map((id) => getEntry('sources', id)))).filter(
    (s) => s !== undefined,
  );

  return {
    scenario,
    base,
    resultat: simuler(base),
    secteur: await getEntry(scenario.data.secteur),
    famille: await getEntry(scenario.data.famille),
    sources,
  };
}

export type ScenarioCharge = Awaited<ReturnType<typeof chargerScenario>>;

export async function scenarioMisEnAvant() {
  const scenario = (await getCollection('simulations')).find((s) => s.data.miseEnAvant);
  if (!scenario) throw new Error('Aucune simulation mise en avant (miseEnAvant: true).');
  return chargerScenario(scenario);
}
