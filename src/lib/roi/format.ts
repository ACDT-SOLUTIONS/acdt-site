const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const nombre1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const pourcent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });

export const formatEuros = (valeur: number): string => euros.format(valeur);
export const formatHeures = (valeur: number): string => `${nombre1.format(valeur)} h`;
export const formatPourcent = (valeur: number | null): string => (valeur === null ? '—' : pourcent.format(valeur));
export const formatMois = (valeur: number | null): string =>
  valeur === null ? 'non atteint' : `${nombre1.format(valeur)} mois`;

/** Formate un paramètre de scénario selon son unité (voir `PARAMETRES`). */
export const formatParametre = (unite: string, valeur: number): string => {
  if (unite === '%') return formatPourcent(valeur);
  if (unite.startsWith('€')) return `${formatEuros(valeur)}${unite.slice(1)}`;
  return `${valeur.toLocaleString('fr-FR')} ${unite}`;
};
