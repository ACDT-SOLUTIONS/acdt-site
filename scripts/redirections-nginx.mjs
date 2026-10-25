#!/usr/bin/env node
// Affiche les redirections 301 nginx correspondant à l'état actuel de src/config/publication.mjs.
// À coller dans le bloc `server` du site (voir DEPLOIEMENT.md) ; à régénérer après chaque publication.
import { redirectionsPubliques } from '../src/config/publication.mjs';

console.log('# Anciennes URL du site HTML — généré par scripts/redirections-nginx.mjs');
for (const [ancienne, cible] of redirectionsPubliques()) {
  const sansSlash = ancienne.replace(/\/$/, '');
  console.log(`location = ${sansSlash} { return 301 ${cible}; }`);
  console.log(`location = ${ancienne} { return 301 ${cible}; }`);
}
