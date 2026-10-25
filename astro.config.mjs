// @ts-check
import { readdir, rm, mkdir, writeFile, rmdir } from 'node:fs/promises';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, envField } from 'astro/config';
import { estPubliee, redirectionsPubliques } from './src/config/publication.mjs';

const SITE = 'https://acdt-solutions.com';

/** @param {string} dossier @returns {Promise<string[]>} */
async function fichiersHtml(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true, recursive: true });
  return entrees.filter((e) => e.isFile() && e.name === 'index.html').map((e) => join(e.parentPath, e.name));
}

/** @param {string} cible */
const pageRedirection = (cible) => {
  const url = new URL(cible, SITE).href;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Redirection</title><meta name="robots" content="noindex"><link rel="canonical" href="${url}"><meta http-equiv="refresh" content="0;url=${cible}"></head><body><p>Cette page a été déplacée : <a href="${cible}">${url}</a>.</p></body></html>\n`;
};

/**
 * Version publique : après le build, supprime les pages non publiées et crée les redirections des anciennes URL.
 * Sans effet en développement et dans un build normal.
 * @returns {import('astro').AstroIntegration}
 */
function publication() {
  return {
    name: 'acdt-publication',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env.PUBLIC_RELEASE !== 'true') return;
        const racine = fileURLToPath(dir);

        let retirees = 0;
        for (const fichier of await fichiersHtml(racine)) {
          const rel = relative(racine, dirname(fichier)).split(sep).join('/');
          const chemin = rel ? `/${rel}/` : '/';
          if (estPubliee(chemin)) continue;
          await rm(fichier);
          retirees++;
          // Supprime les dossiers devenus vides, du plus profond vers la racine.
          for (let d = dirname(fichier); d !== racine; d = dirname(d)) {
            if ((await readdir(d)).length > 0) break;
            await rmdir(d);
          }
        }

        const redirections = redirectionsPubliques();
        for (const [ancienne, cible] of redirections) {
          const dossier = join(racine, ...ancienne.split('/').filter(Boolean));
          await mkdir(dossier, { recursive: true });
          await writeFile(join(dossier, 'index.html'), pageRedirection(cible));
        }

        logger.info(`Version publique : ${retirees} page(s) non publiée(s) retirée(s), ${redirections.length} redirection(s).`);
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
      PUBLIC_PLAUSIBLE_DOMAIN: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_PLAUSIBLE_SRC: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
});
