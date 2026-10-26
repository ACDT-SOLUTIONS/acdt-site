import { PUBLIC_RELEASE } from 'astro:env/server';
import { estPubliee, relaisVers } from '@/config/publication.mjs';

/** Vrai pour la version publique (`npm run build:release`), faux en développement. */
export const VERSION_PUBLIQUE = PUBLIC_RELEASE;

/**
 * Un lien interne peut-il être affiché ? En version publique, seulement s'il mène à une page publiée.
 * Ancres, liens externes, mailto: et tel: restent toujours affichables.
 */
export function lienVisible(href: string): boolean {
  if (!href.startsWith('/')) return true;
  return !VERSION_PUBLIQUE || estPubliee(href);
}

/**
 * Destination à utiliser pour un lien de navigation : la page elle-même si elle est consultable, sinon
 * l'ancienne page équivalente encore en ligne (relais), sinon rien.
 */
export function lienEffectif(href: string): string | undefined {
  if (lienVisible(href)) return href;
  return relaisVers(href);
}
