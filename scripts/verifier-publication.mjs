#!/usr/bin/env node
// Contrôle de la version publique générée dans dist/ (après `npm run build:release`).
// Usage : node scripts/verifier-publication.mjs [--strict]
//   --strict : exige aussi les pages obligatoires et des pages légales complétées (contrôle avant production).
// Sort avec le code 1 si un contrôle échoue ; rien n'est modifié.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import {
  PAGES_PUBLIEES,
  PAGES_OBLIGATOIRES,
  anciennesPagesConservees,
  normaliserChemin,
  planAnciennesPages,
} from '../src/config/publication.mjs';

const DIST = 'dist';
const STRICT = process.argv.includes('--strict');
const SCRIPTS_AUTORISES = ['https://plausible.io/'];
const MARQUEURS_BROUILLON = [
  'À rédiger',
  'À documenter',
  'Module à connecter',
  'Formulaire à connecter',
  'class="placeholder',
  '[À COMPLÉTER',
  '[À CONFIRMER',
];
const FICHIERS_CACHES_AUTORISES = ['.nginx/redirections.conf'];

const erreurs = [];
const avertissements = [];
const echec = (m) => erreurs.push(m);
const bloquer = STRICT ? echec : (m) => avertissements.push(m);

const existe = async (p) => stat(p).then(() => true, () => false);
const fichiers = (await readdir(DIST, { recursive: true, withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => relative(DIST, join(e.parentPath, e.name)).split(sep).join('/'));

const plan = planAnciennesPages();
const conservees = anciennesPagesConservees();
const redirections = new Map(plan.filter((p) => p.action === '301').map((p) => [p.chemin, p.cible]));
const indexables = [...PAGES_PUBLIEES, ...conservees];

// 1. Aucun fichier sensible ou caché, hors règles nginx.
for (const f of fichiers) {
  const cache = f.split('/').some((s) => s.startsWith('.'));
  if ((cache && !FICHIERS_CACHES_AUTORISES.includes(f)) || /(^|\/)(\.env|.*\.map)$/.test(f)) {
    echec(`Fichier à ne pas publier : ${f}`);
  }
}

// 2. Chaque page HTML est publiée, conservée, une redirection de secours, ou la page 404.
const pages = fichiers.filter((f) => f.endsWith('.html'));
const route = (f) => (f === 'index.html' ? '/' : `/${f.replace(/index\.html$/, '')}`);
for (const f of pages) {
  if (f === '404.html') continue;
  const r = route(f);
  if (!indexables.includes(r) && !redirections.has(r)) echec(`Page non prévue présente : ${r}`);
}
for (const p of indexables) {
  if (!pages.some((f) => route(f) === p)) echec(`Page attendue absente du build : ${p}`);
}
for (const p of plan.filter((x) => x.action === '404' || x.action === '410')) {
  if (pages.some((f) => route(f) === p.chemin) || fichiers.includes(p.chemin.slice(1))) {
    echec(`Page retirée encore présente : ${p.chemin}`);
  }
}

// 3. Contenu des pages indexables (nouvelles et anciennes conservées).
for (const f of pages) {
  const r = route(f);
  if (!indexables.includes(r)) continue;
  const ancienne = conservees.includes(r);
  const html = await readFile(join(DIST, f), 'utf8');
  const visible = html.replace(/<!--[\s\S]*?-->/g, '');

  for (const m of MARQUEURS_BROUILLON) if (visible.includes(m)) echec(`${r} : contenu provisoire « ${m} »`);
  if (/noindex/.test(html)) echec(`${r} : balise noindex présente`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) echec(`${r} : <title> manquant ou trop court`);
  if (!/<meta name="description" content="[^"]{30,}"/.test(html)) echec(`${r} : meta description manquante ou trop courte`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== `https://acdt-solutions.com${r}`) echec(`${r} : canonical incorrect (${canonical})`);
  const h1 = (visible.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) echec(`${r} : ${h1} balise(s) <h1>`);
  if (ancienne && html.includes('<!-- ACDT:ANALYTICS -->')) echec(`${r} : marqueur d'analytics non traité`);

  // Liens et ressources internes : la cible doit exister dans dist/.
  for (const [, cible] of visible.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const chemin = join(DIST, decodeURI(cible));
    const ok = (await existe(chemin)) && ((await stat(chemin)).isFile() || (await existe(join(chemin, 'index.html'))));
    if (!ok) {
      const message = `${r} : lien interne cassé → ${cible}`;
      // Lien vers une page obligatoire pas encore publiée (pages légales) : bloquant seulement avant production.
      if (PAGES_OBLIGATOIRES.includes(normaliserChemin(cible))) bloquer(message);
      else echec(message);
    } else if (redirections.has(normaliserChemin(cible))) {
      echec(`${r} : lien vers une URL redirigée → ${cible} (utiliser ${redirections.get(normaliserChemin(cible))})`);
    }
  }

  // Scripts externes : uniquement ceux autorisés (aucun GTM, GA, chatbot ou webhook).
  for (const [, src] of visible.matchAll(/<script[^>]*src="(https?:[^"]+)"/g)) {
    if (!SCRIPTS_AUTORISES.some((a) => src.startsWith(a))) echec(`${r} : script externe non autorisé → ${src}`);
  }
  // L'adresse du formulaire, si elle a été explicitement activée, est la seule exception admise.
  const formulaire = process.env.PUBLIC_FORMULAIRE_URL;
  const sansFormulaire = formulaire ? visible.split(formulaire).join('') : visible;
  if (/googletagmanager|gtag\(|n8n\.acdt-solutions\.com|webhook|chat-panel/i.test(sansFormulaire)) {
    echec(`${r} : référence à un service non autorisé (GTM, GA, n8n, chatbot)`);
  }
}

// 4. Sitemap, robots et règles nginx.
const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8').catch(() => '');
const urlsSitemap = [...sitemap.matchAll(/<loc>https:\/\/acdt-solutions\.com([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urlsSitemap.sort().join() !== [...indexables].sort().join()) {
  echec('sitemap.xml ne correspond pas exactement aux pages publiées et conservées');
}
const robots = await readFile(join(DIST, 'robots.txt'), 'utf8').catch(() => '');
if (!/Allow: \//.test(robots) || !/Sitemap: https:\/\/acdt-solutions\.com\/sitemap\.xml/.test(robots)) {
  echec('robots.txt : version indexable attendue (PUBLIC_INDEXABLE=true)');
}
const nginx = await readFile(join(DIST, '.nginx', 'redirections.conf'), 'utf8').catch(() => null);
if (nginx === null) echec('.nginx/redirections.conf absent');
else {
  const lignes = nginx.split('\n').filter((l) => l && !l.startsWith('#'));
  const invalides = lignes.filter((l) => !/^location = \/[^\s{]* \{ return (301 \/[^\s;]*|410); \}$/.test(l));
  if (invalides.length) echec(`.nginx/redirections.conf : lignes inattendues → ${invalides.join(' | ')}`);
}

// 5. Contrôles stricts avant mise en production.
const manquantes = PAGES_OBLIGATOIRES.filter((p) => !PAGES_PUBLIEES.includes(p));
if (manquantes.length) bloquer(`Pages obligatoires non publiées : ${manquantes.join(', ')}`);
for (const f of await readdir('src/content/legal')) {
  const texte = await readFile(join('src/content/legal', f), 'utf8');
  const points = texte.split('---')[1]?.match(/^aVerifier:\n((?:\s+- .*\n?)+)/m)?.[1].trim().split('\n').length ?? 0;
  const champs = (texte.match(/\[À (COMPLÉTER|CONFIRMER)/g) || []).length;
  if (points || champs) bloquer(`Page légale incomplète : ${f} (${champs} champ(s) à compléter, ${points} point(s) à vérifier)`);
}

// Rapport
console.log(
  `Version publique : ${PAGES_PUBLIEES.length} nouvelle(s) page(s), ${conservees.length} ancienne(s) conservée(s), ` +
    `${redirections.size} redirection(s) 301, ${plan.filter((p) => p.action === '410').length} retrait(s) 410.`,
);
for (const a of avertissements) console.log(`  ⚠ ${a}`);
for (const e of erreurs) console.log(`  ✗ ${e}`);
if (erreurs.length) {
  console.log(`\n${erreurs.length} contrôle(s) en échec${STRICT ? ' (mode strict : mise en production refusée)' : ''}.`);
  process.exit(1);
}
console.log(STRICT ? '\nTous les contrôles stricts sont satisfaits.' : '\nContrôles satisfaits (hors contrôles stricts).');
