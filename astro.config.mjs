// @ts-check
import { cp, mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, envField } from 'astro/config';
import { anciennesPagesConservees, estPubliee, planAnciennesPages } from './src/config/publication.mjs';

const SITE = 'https://acdt-solutions.com';
const LEGACY = fileURLToPath(new URL('./legacy/', import.meta.url));

/** @param {string} dossier @returns {Promise<string[]>} */
async function fichiersHtml(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true, recursive: true });
  return entrees.filter((e) => e.isFile() && e.name === 'index.html').map((e) => join(e.parentPath, e.name));
}

/** Page de secours si les règles nginx ne sont pas actives (les 301 réels sont servis par nginx). */
const pageRedirection = (/** @type {string} */ cible) => {
  const url = new URL(cible, SITE).href;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Redirection</title><meta name="robots" content="noindex"><link rel="canonical" href="${url}"><meta http-equiv="refresh" content="0;url=${cible}"></head><body><p>Cette page a été déplacée : <a href="${cible}">${url}</a>.</p></body></html>\n`;
};

/**
 * Gestion du consentement (et GA4 après accord) injectée dans les anciennes pages, avec la même configuration
 * que les nouvelles (voir src/components/integrations/Analytics.astro).
 */
function baliseConsentement() {
  const id = process.env.PUBLIC_GA4_ID;
  return id ? `<script defer src="/consentement.js" data-ga4="${id}"></script>` : '';
}

/** Règles nginx des anciennes URL (incluses par la configuration du serveur, voir deploy/nginx/). */
function reglesNginx() {
  const lignes = ['# Généré à chaque build public depuis src/config/publication.mjs — ne pas modifier à la main.'];
  for (const p of planAnciennesPages()) {
    const variantes = p.chemin.endsWith('/') ? [p.chemin.replace(/\/$/, ''), p.chemin] : [p.chemin];
    if (p.action === '301') for (const v of variantes) lignes.push(`location = ${v} { return 301 ${p.cible}; }`);
    if (p.action === '410') for (const v of variantes) lignes.push(`location = ${v} { return 410; }`);
  }
  return `${lignes.join('\n')}\n`;
}

/**
 * Version publique : après le build, retire les nouvelles pages non publiées, ajoute les anciennes pages
 * conservées (legacy/) et génère les redirections. Sans effet en développement et dans un build normal.
 * @returns {import('astro').AstroIntegration}
 */
function publication() {
  return {
    name: 'acdt-publication',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env.PUBLIC_RELEASE !== 'true') return;
        const racine = fileURLToPath(dir);

        // 1. Nouvelles pages non publiées : retirées.
        let retirees = 0;
        for (const fichier of await fichiersHtml(racine)) {
          const rel = relative(racine, dirname(fichier)).split(sep).join('/');
          if (estPubliee(rel ? `/${rel}/` : '/')) continue;
          await rm(fichier);
          retirees++;
          for (let d = dirname(fichier); d !== racine; d = dirname(d)) {
            if ((await readdir(d)).length > 0) break;
            await rmdir(d);
          }
        }

        // 2. Anciennes pages conservées, avec leurs ressources.
        const conservees = anciennesPagesConservees();
        const analytics = baliseConsentement();
        for (const chemin of conservees) {
          const source = join(LEGACY, chemin, 'index.html');
          const cible = join(racine, chemin, 'index.html');
          await mkdir(dirname(cible), { recursive: true });
          const html = (await readFile(source, 'utf8')).replace('<!-- ACDT:ANALYTICS -->', analytics);
          await writeFile(cible, html);
        }
        if (conservees.length) await cp(join(LEGACY, 'assets'), join(racine, 'assets'), { recursive: true });

        // 3. Redirections : règles nginx (301 et 410 réels) + pages de secours pour les 301.
        const plan = planAnciennesPages();
        for (const p of plan.filter((x) => x.action === '301')) {
          const dossier = join(racine, ...p.chemin.split('/').filter(Boolean));
          await mkdir(dossier, { recursive: true });
          await writeFile(join(dossier, 'index.html'), pageRedirection(/** @type {string} */ (p.cible)));
        }
        await mkdir(join(racine, '.nginx'), { recursive: true });
        await writeFile(join(racine, '.nginx', 'redirections.conf'), reglesNginx());

        const compte = (/** @type {string} */ a) => plan.filter((x) => x.action === a).length;
        logger.info(
          `Version publique : ${retirees} nouvelle(s) page(s) non publiée(s) retirée(s), ` +
            `${conservees.length} ancienne(s) page(s) conservée(s), ${compte('301')} redirection(s) 301, ` +
            `${compte('410')} retrait(s) 410, ${compte('404')} en 404.`,
        );
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  // Une seule convention d'URL : canonical, liens internes et sitemap finissent par « / ».
  trailingSlash: 'always',
  build: { format: 'directory' },
  output: 'static',
  integrations: [publication()],
  env: {
    schema: {
      // Aucun secret ici : ces valeurs finissent dans le HTML généré.
      PUBLIC_RELEASE: envField.boolean({ context: 'server', access: 'public', default: false }),
      PUBLIC_INDEXABLE: envField.boolean({ context: 'server', access: 'public', default: false }),
      // Google Analytics 4 (gtag.js direct, sans GTM), chargé uniquement après consentement.
      PUBLIC_GA4_ID: envField.string({ context: 'server', access: 'public', optional: true, startsWith: 'G-' }),
      // Formulaire de contact : webhook n8n de production (voir DEPLOIEMENT.md, section 7). Vide = désactivé.
      PUBLIC_FORMULAIRE_URL: envField.string({ context: 'server', access: 'public', optional: true, url: true }),
    },
  },
});
