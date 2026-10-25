// @ts-check
/**
 * Publication du site — source unique, lue par Astro, les composants et scripts/verifier-publication.mjs.
 *
 * - En développement (`npm run dev`), toutes les pages restent accessibles ; un bandeau signale celles
 *   qui ne sont pas publiées.
 * - La version publique (`npm run build:release`) ne contient QUE les pages listées ici : les autres ne
 *   sont pas générées, aucun lien n'y mène et elles n'apparaissent pas dans le sitemap.
 *
 * Publier une page = ajouter son chemin ci-dessous, vérifier, commit, puis déployer.
 */

/** @type {string[]} */
export const PAGES_PUBLIEES = [
  '/',
  '/solutions/accueil-telephonique-ia/',
  '/contact/',
  '/rendez-vous/',
  // Pages légales : à ajouter une fois les points « aVerifier » de src/content/legal/*.md traités.
  // '/mentions-legales/',
  // '/confidentialite/',
  // '/cookies/',
  // '/cgu/',
  // '/cgv/',
];

/** Pages sans lesquelles aucune mise en ligne n'est autorisée (contrôle strict avant déploiement). */
export const PAGES_OBLIGATOIRES = ['/', '/contact/', '/rendez-vous/', '/mentions-legales/', '/confidentialite/', '/cookies/'];

/**
 * Anciennes URL du site HTML → nouvelle destination. Dans la version publique, une page de redirection est
 * générée pour chacune, sauf si l'URL est elle-même une page publiée. Si la destination n'est pas publiée,
 * la redirection pointe vers l'accueil.
 * @type {Record<string, string>}
 */
export const ANCIENNES_URL = {
  '/rdv/': '/rendez-vous/',
  '/contact/': '/contact/',
  '/a-propos/': '/a-propos/',
  '/services/': '/solutions/',
  '/services/audit-express/': '/solutions/',
  '/services/automatisations-sur-mesure/': '/solutions/automatisation-administrative/',
  '/services/chatbot-entreprise/': '/solutions/',
  '/services/google-sheets-automations/': '/solutions/automatisation-administrative/',
  '/services/integration-n8n/': '/solutions/',
  '/tarifs/': '/solutions/',
  '/methodologie/': '/methode/',
  '/etudes-de-cas/': '/cas-pratiques/',
  '/blog/': '/ressources/',
  '/test/': '/',
  '/mentions-legales/': '/mentions-legales/',
  '/politique-de-confidentialite/': '/confidentialite/',
  '/politique-cookies/': '/cookies/',
  '/conditions-generales-utilisation/': '/cgu/',
  '/conditions-generales-vente/': '/cgv/',
};

/**
 * Chemin normalisé : sans ancre ni paramètres, avec « / » final.
 * @param {string} href
 */
export function normaliserChemin(href) {
  const chemin = href.split('#')[0].split('?')[0];
  return chemin.endsWith('/') ? chemin : `${chemin}/`;
}

/** @param {string} href */
export const estPubliee = (href) => PAGES_PUBLIEES.includes(normaliserChemin(href));

/**
 * Redirections à générer dans la version publique : ancienne URL → destination publiée (ou accueil).
 * @returns {[string, string][]}
 */
export function redirectionsPubliques() {
  return Object.entries(ANCIENNES_URL)
    .filter(([ancienne]) => !estPubliee(ancienne))
    .map(([ancienne, cible]) => [ancienne, estPubliee(cible) ? cible : '/']);
}
