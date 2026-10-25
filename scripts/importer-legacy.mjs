#!/usr/bin/env node
// Importe dans legacy/ les anciennes pages conservées, depuis la version en production de l'ancien site.
// Usage : node scripts/importer-legacy.mjs [commit]   (par défaut : ceeb27c, version actuellement en ligne)
//
// Les pages sont nettoyées pour la version publique : GTM et GA4 retirés, chatbot et webhooks retirés,
// Plausible remplacé par le marqueur <!-- ACDT:ANALYTICS --> (injecté au build selon la configuration),
// liens normalisés (« / » final, /rdv → /rendez-vous/), liens hreflang et images Open Graph inexistantes retirés.
// Chaque correction ciblée doit trouver son texte exact, sinon le script s'arrête.

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ANCIENNES_PAGES } from '../src/config/publication.mjs';

const REF = process.argv[2] ?? 'ceeb27c';
const SORTIE = 'legacy';

const git = (chemin) => execFileSync('git', ['show', `${REF}:${chemin}`], { encoding: 'utf8' });

/** Remplacement obligatoire : échoue si le motif est absent. */
function remplacer(html, motif, remplacement, page) {
  const avant = html;
  const apres = typeof motif === 'string' ? html.split(motif).join(remplacement) : html.replace(motif, remplacement);
  if (apres === avant) throw new Error(`${page} : motif introuvable → ${String(motif).slice(0, 80)}`);
  return apres;
}

// Corrections de contenu propres à certaines pages (texte exact de l'ancien site → texte corrigé).
const CORRECTIONS = {
  '/etudes-de-cas/': [
    [/Études de cas – ACDT Solutions/g, 'Exemples d’automatisations – ACDT Solutions'],
    ['Exemples concrets d’automatisations et d’intégrations réalisées pour des TPE / PME.', 'Exemples d’automatisations envisageables pour des TPE / PME.'],
    ['Sélection d’études de cas d’automatisation et d’intégration pour TPE / PME.', 'Exemples d’automatisations envisageables pour des TPE / PME.'],
    [/Découvrez comment l’automatisation et l’intégration n8n ont permis à des TPE \/ PME de gagner du temps, de réduire les erreurs et de mieux suivre leurs clients\./g,
      'Exemples d’automatisations envisageables pour des TPE / PME : suivi des leads, reporting et onboarding clients.'],
    ['<p class="section-kicker">Études de cas</p>', '<p class="section-kicker">Exemples d’automatisations</p>'],
    ['<h1>Des systèmes concrets, des gains mesurables.</h1>', '<h1>Ce que l’automatisation peut changer dans une TPE / PME.</h1>'],
    [/Voici quelques exemples de missions menées auprès de TPE \/ PME\.\s*Les chiffres sont volontairement simplifiés, mais les logiques sont réelles :\s*moins de tâches manuelles, plus de visibilité, moins d’oublis\./,
      'Voici quelques exemples d’automatisations envisageables pour des TPE / PME. Ce sont des illustrations : elles ne décrivent pas des missions réalisées pour des clients.'],
    ['<h3>Agence de services B2B – Suivi des leads automatisé</h3>', '<h3>Exemple : suivi des leads automatisé (agence de services B2B)</h3>'],
    ['<h3>Cabinet de conseil – Reporting mensuel sans copier-coller</h3>', '<h3>Exemple : reporting mensuel sans copier-coller (cabinet de conseil)</h3>'],
    ['<h3>PME de services – Onboarding clients structuré</h3>', '<h3>Exemple : onboarding clients structuré (PME de services)</h3>'],
    ['Nous avons connecté le site vitrine, le CRM et Google Sheets via n8n.', 'Principe : connecter le site vitrine, le CRM et Google Sheets via n8n.'],
    ['Résultat : moins de leads oubliés, meilleure visibilité sur le pipe commercial.', 'Bénéfice recherché : moins de leads oubliés, meilleure visibilité sur le pipe commercial.'],
    ['Résultat : plusieurs heures gagnées par mois, moins d’erreurs de copie.', 'Bénéfice recherché : moins de temps passé à consolider les données, moins d’erreurs de copie.'],
    ['Résultat : expérience client plus fluide, moins de stress côté équipe.', 'Bénéfice recherché : expérience client plus fluide, moins de stress côté équipe.'],
    ['<h2>Imaginez votre propre étude de cas.</h2>', '<h2>Parlons de votre situation.</h2>'],
    [/Nous appliquons la même rigueur à chaque mission : cadrage précis, suivi des indicateurs clés\s*et transmission claire aux équipes\. Les résultats vus ici sont reproductibles dans votre contexte\./,
      'Chaque projet commence par un cadrage précis, avec des indicateurs définis ensemble et une transmission claire aux équipes.'],
  ],
};

function nettoyer(html, page) {
  let h = html;
  // Commentaires HTML (notes internes, liens désactivés).
  h = h.replace(/<!--[\s\S]*?-->/g, '');
  // Google Tag Manager et Google Analytics.
  h = h.replace(/<script>\(function\(w,d,s,l,i\)[\s\S]*?<\/script>/g, '');
  h = h.replace(/<noscript><iframe src="https:\/\/www\.googletagmanager\.com[\s\S]*?<\/noscript>/g, '');
  h = h.replace(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"><\/script>/g, '');
  h = h.replace(/<script>\s*window\.dataLayer[\s\S]*?<\/script>/g, '');
  // Plausible : remplacé par le marqueur commun.
  h = h.replace(/<script defer data-domain="[^"]*" src="https:\/\/plausible\.io[^"]*"><\/script>/g, '');
  h = h.replace(/<script>window\.plausible = [\s\S]*?<\/script>/g, '');
  h = remplacer(h, '</head>', '    <!-- ACDT:ANALYTICS -->\n</head>', page);
  // Chatbot (bouton + panneau) et ancien script (webhooks n8n).
  h = remplacer(h, /<button id="chat-toggle"[\s\S]*?(?=<script src="\/assets\/app\.js")/, '', page);
  h = remplacer(h, '<script src="/assets/app.js" defer></script>', '<script src="/assets/legacy.js" defer></script>', page);
  // Liens hreflang vers une version anglaise inexistante, image Open Graph inexistante.
  h = h.replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, '');
  h = h.replace(/\s*<meta (?:property|name)="(?:og|twitter):image" content="[^"]*og-default\.jpg">/g, '');
  // Liens internes : /rdv → /rendez-vous/, « / » final, canonical avec « / » final.
  h = h.replace(/href="\/rdv\/?"/g, 'href="/rendez-vous/"');
  h = h.replace(/href="(\/[a-z0-9\-/]*[a-z0-9])"/g, 'href="$1/"');
  h = h.replace(/(<link rel="canonical" href="https:\/\/acdt-solutions\.com\/[^"]*[a-z0-9])"/g, '$1/"');
  h = h.replace(/("url":\s*"https:\/\/acdt-solutions\.com\/[^"]*[a-z0-9])"/g, '$1/"');
  // La rubrique ne présente plus de cas clients : libellé de menu neutre.
  h = h.replace(/>Études de cas<\/a>/g, '>Exemples</a>');

  for (const [motif, remplacement] of CORRECTIONS[page] ?? []) h = remplacer(h, motif, remplacement, page);

  // Garde-fous : rien de tout cela ne doit subsister.
  for (const interdit of [/googletagmanager/i, /gtag\(/, /n8n\.acdt-solutions/i, /webhook/i, /chat-panel/, /og-default/, /hreflang/]) {
    if (interdit.test(h)) throw new Error(`${page} : élément non retiré → ${interdit}`);
  }
  return h;
}

const pages = Object.entries(ANCIENNES_PAGES)
  .filter(([, p]) => p.statut === 'conserver')
  .map(([chemin]) => chemin);

for (const chemin of pages) {
  const source = `${chemin.slice(1)}index.html`;
  const cible = join(SORTIE, source);
  await mkdir(dirname(cible), { recursive: true });
  await writeFile(cible, nettoyer(git(source), chemin));
  console.log(`✓ ${chemin}`);
}

await mkdir(join(SORTIE, 'assets'), { recursive: true });
await writeFile(join(SORTIE, 'assets', 'styles.css'), git('assets/styles.css'));
console.log('✓ /assets/styles.css');
console.log(`\n${pages.length} page(s) importée(s) depuis ${REF}. legacy/assets/legacy.js est maintenu à la main.`);
