#!/usr/bin/env node
// Contrôle de la version publique générée dans dist/ (après `npm run build:release`).
// Usage : node scripts/verifier-publication.mjs [--strict]
//   --strict : exige aussi les pages obligatoires et des pages légales sans point « aVerifier ».
// Sort avec le code 1 si un contrôle échoue ; rien n'est modifié.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { PAGES_PUBLIEES, PAGES_OBLIGATOIRES, redirectionsPubliques } from '../src/config/publication.mjs';

const DIST = 'dist';
const STRICT = process.argv.includes('--strict');
const SCRIPTS_AUTORISES = ['https://plausible.io/'];
const MARQUEURS_BROUILLON = ['À rédiger', 'À documenter', 'Module à connecter', 'Formulaire à connecter', 'class="placeholder'];

const erreurs = [];
const avertissements = [];
const echec = (m) => erreurs.push(m);

const existe = async (p) => stat(p).then(() => true, () => false);
const fichiers = (await readdir(DIST, { recursive: true, withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => relative(DIST, join(e.parentPath, e.name)).split(sep).join('/'));

// 1. Aucun fichier sensible ou caché.
for (const f of fichiers) {
  if (f.split('/').some((s) => s.startsWith('.')) || /(^|\/)(\.env|.*\.map)$/.test(f)) echec(`Fichier à ne pas publier : ${f}`);
}

// 2. Chaque page HTML est publiée, une redirection prévue, ou la page 404.
const redirections = new Map(redirectionsPubliques());
const pages = fichiers.filter((f) => f.endsWith('.html'));
const route = (f) => (f === 'index.html' ? '/' : `/${f.replace(/index\.html$/, '')}`);
for (const f of pages) {
  if (f === '404.html') continue;
  const r = route(f);
  if (!PAGES_PUBLIEES.includes(r) && !redirections.has(r)) echec(`Page non publiée présente : ${r}`);
}
for (const p of PAGES_PUBLIEES) {
  if (!pages.some((f) => route(f) === p)) echec(`Page publiée absente du build : ${p}`);
}

// 3. Contenu des pages publiées.
for (const f of pages) {
  const r = route(f);
  if (!PAGES_PUBLIEES.includes(r)) continue;
  const html = await readFile(join(DIST, f), 'utf8');

  for (const m of MARQUEURS_BROUILLON) if (html.includes(m)) echec(`${r} : contenu provisoire « ${m} »`);
  if (/noindex/.test(html)) echec(`${r} : balise noindex présente`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) echec(`${r} : <title> manquant ou trop court`);
  if (!/<meta name="description" content="[^"]{30,}"/.test(html)) echec(`${r} : meta description manquante ou trop courte`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== `https://acdt-solutions.com${r}`) echec(`${r} : canonical incorrect (${canonical})`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) echec(`${r} : ${h1} balise(s) <h1>`);

  // Liens et ressources internes : la cible doit exister dans dist/.
  for (const [, cible] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const chemin = join(DIST, decodeURI(cible));
    const ok = (await existe(chemin)) && ((await stat(chemin)).isFile() || (await existe(join(chemin, 'index.html'))));
    if (!ok) echec(`${r} : lien interne cassé → ${cible}`);
    else if (cible.endsWith('/') && redirections.has(cible)) echec(`${r} : lien vers une page de redirection → ${cible}`);
  }

  // Scripts externes : uniquement ceux autorisés (aucun GTM, GA, chatbot ou webhook).
  for (const [, src] of html.matchAll(/<script[^>]*src="(https?:[^"]+)"/g)) {
    if (!SCRIPTS_AUTORISES.some((a) => src.startsWith(a))) echec(`${r} : script externe non autorisé → ${src}`);
  }
  if (/googletagmanager|gtag\(|n8n\.acdt-solutions\.com|webhook/i.test(html)) echec(`${r} : référence à un service non autorisé`);
}

// 4. Sitemap et robots.
const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8').catch(() => '');
const urlsSitemap = [...sitemap.matchAll(/<loc>https:\/\/acdt-solutions\.com([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urlsSitemap.sort().join() !== [...PAGES_PUBLIEES].sort().join()) echec('sitemap.xml ne correspond pas exactement aux pages publiées');
const robots = await readFile(join(DIST, 'robots.txt'), 'utf8').catch(() => '');
if (!/Allow: \//.test(robots) || !/Sitemap: https:\/\/acdt-solutions\.com\/sitemap\.xml/.test(robots)) {
  echec('robots.txt : version indexable attendue (PUBLIC_INDEXABLE=true)');
}

// 5. Contrôles stricts avant mise en production.
const manquantes = PAGES_OBLIGATOIRES.filter((p) => !PAGES_PUBLIEES.includes(p));
const legalAVerifier = [];
for (const f of await readdir('src/content/legal')) {
  const texte = await readFile(join('src/content/legal', f), 'utf8');
  const points = texte.split('---')[1]?.match(/^aVerifier:\n((?:\s+- .*\n?)+)/m)?.[1].trim().split('\n').length ?? 0;
  if (points > 0) legalAVerifier.push(`${f} (${points} point(s))`);
}
const bloquer = STRICT ? echec : (m) => avertissements.push(m);
if (manquantes.length) bloquer(`Pages obligatoires non publiées : ${manquantes.join(', ')}`);
if (legalAVerifier.length) bloquer(`Pages légales avec des points à vérifier : ${legalAVerifier.join(', ')}`);

// Rapport
console.log(`Version publique : ${pages.length} fichier(s) HTML, ${PAGES_PUBLIEES.length} page(s) publiée(s), ${redirections.size} redirection(s).`);
for (const a of avertissements) console.log(`  ⚠ ${a}`);
for (const e of erreurs) console.log(`  ✗ ${e}`);
if (erreurs.length) {
  console.log(`\n${erreurs.length} contrôle(s) en échec${STRICT ? ' (mode strict : mise en production refusée)' : ''}.`);
  process.exit(1);
}
console.log(STRICT ? '\nTous les contrôles stricts sont satisfaits.' : '\nContrôles satisfaits (hors contrôles stricts).');
