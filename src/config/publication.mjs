// @ts-check
/**
 * Publication du site — source unique, lue par Astro, les composants et les scripts de scripts/.
 *
 * - En développement (`npm run dev`), toutes les nouvelles pages restent accessibles ; un bandeau signale
 *   celles qui ne sont pas publiées.
 * - La version publique (`npm run build:release`) contient :
 *     1. les nouvelles pages listées dans PAGES_PUBLIEES ;
 *     2. les anciennes pages conservées (copies figées dans legacy/) tant que leur remplaçante n'est pas publiée ;
 *     3. les règles nginx (301 / 404 / 410) des anciennes URL, dans .nginx/redirections.conf.
 *   Aucune autre page n'est générée, aucun lien n'y mène et elles n'apparaissent pas dans le sitemap.
 *
 * Publier une page = ajouter son chemin à PAGES_PUBLIEES, vérifier, commit, puis suivre DEPLOIEMENT.md.
 */

/** @type {string[]} */
export const PAGES_PUBLIEES = [
  '/',
  '/solutions/accueil-telephonique-ia/',
  '/tarifs/',
  '/contact/',
  '/rendez-vous/',
  // Pages légales (mêmes URL que l'ancien site) : à ajouter une fois les documents complétés et validés
  // (marqueurs [À COMPLÉTER] et points « aVerifier » de src/content/legal/*.md).
  // '/mentions-legales/',
  // '/politique-de-confidentialite/',
  // '/politique-cookies/',
  // '/conditions-generales-utilisation/',
  // '/conditions-generales-vente/',
];

/**
 * Pages sans lesquelles aucune mise en ligne n'est autorisée (contrôle strict avant déploiement).
 * Les cinq pages légales y figurent : l'ancien site les publiait et les pages conservées y renvoient.
 */
export const PAGES_OBLIGATOIRES = [
  '/',
  '/contact/',
  '/rendez-vous/',
  '/mentions-legales/',
  '/politique-de-confidentialite/',
  '/politique-cookies/',
  '/conditions-generales-utilisation/',
  '/conditions-generales-vente/',
];

/**
 * @typedef {object} AnciennePage
 * @property {'conserver' | 'rediriger' | 'retirer'} statut
 *   conserver : l'ancienne page (legacy/) reste en ligne jusqu'à la publication de `remplacee_par`,
 *               puis devient une redirection 301 vers celle-ci ;
 *   rediriger : redirection 301 immédiate vers `remplacee_par` (qui doit être publiée) ;
 *   retirer   : plus servie ; 410 si `definitif`, sinon 404 (réactivation possible plus tard).
 * @property {string} [remplacee_par] Nouvelle page réellement équivalente, s'il en existe une.
 * @property {boolean} [relais] L'ancienne page sert de destination provisoire aux liens vers `remplacee_par`
 *   tant que celle-ci n'est pas publiée (uniquement si les contenus sont réellement équivalents).
 * @property {boolean} [definitif]
 * @property {string} note
 */

/**
 * Anciennes URL du site HTML. Une URL reprise telle quelle par une nouvelle page publiée
 * (/, /contact/, /tarifs/, pages légales) n'a pas besoin de figurer ici.
 * @type {Record<string, AnciennePage>}
 */
export const ANCIENNES_PAGES = {
  '/rdv/': { statut: 'rediriger', remplacee_par: '/rendez-vous/', note: 'Même service Cal.com.' },
  '/services/': { statut: 'conserver', remplacee_par: '/solutions/', relais: true, note: 'Présentation des services.' },
  '/services/automatisations-sur-mesure/': {
    statut: 'conserver',
    remplacee_par: '/solutions/automatisation-administrative/',
    relais: true,
    note: 'Équivalent : famille 02.',
  },
  '/services/audit-express/': { statut: 'conserver', note: 'Pas encore d’équivalent.' },
  '/services/chatbot-entreprise/': { statut: 'conserver', note: 'Pas d’équivalent (la permanence est vocale).' },
  '/services/google-sheets-automations/': { statut: 'conserver', note: 'Pas encore d’équivalent.' },
  '/services/integration-n8n/': { statut: 'conserver', note: 'Capacité commune, sans page dédiée.' },
  '/methodologie/': { statut: 'conserver', remplacee_par: '/methode/', relais: true, note: 'Équivalent : page Méthode.' },
  '/a-propos/': {
    statut: 'conserver',
    remplacee_par: '/a-propos/',
    relais: true,
    note: 'Même URL : remplacée à la publication.',
  },
  '/etudes-de-cas/': {
    statut: 'conserver',
    remplacee_par: '/cas-pratiques/',
    note: 'Version corrigée : exemples, sans mission client affirmée.',
  },
  '/blog/': { statut: 'retirer', note: 'Page provisoire ; à réactiver avec de vrais articles (404 d’ici là).' },
  '/test/': { statut: 'retirer', definitif: true, note: 'Page de test.' },
  '/image-sitemap.xml': { statut: 'retirer', definitif: true, note: 'Remplacé par sitemap.xml.' },
};

/**
 * Chemin normalisé : sans ancre ni paramètres, avec « / » final (sauf fichier avec extension).
 * @param {string} href
 */
export function normaliserChemin(href) {
  const chemin = href.split('#')[0].split('?')[0];
  if (chemin.endsWith('/') || /\.[a-z0-9]+$/i.test(chemin)) return chemin;
  return `${chemin}/`;
}

/** @param {string} href */
export const estPubliee = (href) => PAGES_PUBLIEES.includes(normaliserChemin(href));

/**
 * Ce que devient chaque ancienne URL dans la version publique, selon l'état actuel de la publication.
 * @returns {{ chemin: string, action: 'ancienne-page' | 'nouvelle-page' | '301' | '404' | '410', cible?: string }[]}
 */
export function planAnciennesPages() {
  return Object.entries(ANCIENNES_PAGES).map(([chemin, p]) => {
    if (p.statut === 'retirer') return { chemin, action: p.definitif ? '410' : '404' };
    const remplacante = p.remplacee_par;
    if (remplacante && estPubliee(remplacante)) {
      return remplacante === chemin ? { chemin, action: 'nouvelle-page' } : { chemin, action: '301', cible: remplacante };
    }
    if (p.statut === 'rediriger') {
      throw new Error(`${chemin} : la destination ${remplacante} doit être publiée pour être redirigée.`);
    }
    return { chemin, action: 'ancienne-page' };
  });
}

/** Anciennes pages servies telles quelles (copies de legacy/) dans la version publique. */
export const anciennesPagesConservees = () =>
  planAnciennesPages()
    .filter((p) => p.action === 'ancienne-page')
    .map((p) => p.chemin);

/**
 * Ancienne page conservée servant de relais vers une nouvelle page non encore publiée, s'il en existe une.
 * @param {string} href
 * @returns {string | undefined}
 */
export function relaisVers(href) {
  const cible = normaliserChemin(href);
  const conservees = anciennesPagesConservees();
  return Object.entries(ANCIENNES_PAGES).find(
    ([chemin, p]) => p.relais && p.remplacee_par === cible && conservees.includes(chemin),
  )?.[0];
}
