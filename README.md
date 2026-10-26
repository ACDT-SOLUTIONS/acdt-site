# ACDT Solutions — site v2

Refonte en Astro. Développement sur `refonte-v2`, production sur `main` (voir [DEPLOIEMENT.md](DEPLOIEMENT.md)).

## Commandes

```sh
npm install                  # première fois uniquement
npm run dev                  # développement : toutes les nouvelles pages, http://localhost:4321/
npm run test                 # tests du moteur de calcul
npm run build                # build de développement (toutes les pages, noindex)
npm run build:release        # version publique : pages publiées + anciennes pages conservées, contrôlée
npm run verifier:production  # contrôles bloquants avant mise en ligne
npm run preview              # sert dist/ en local
npm run legacy:importer      # régénère legacy/ depuis l'ancien site en production
npm run formulaire:test      # endpoint local pour tester le formulaire de contact
```

## Repères

- `src/config/publication.mjs` : pages publiées, anciennes URL (conservées, 301, 404, 410).
- `legacy/` : anciennes pages conservées temporairement, nettoyées (sans GTM, GA4, Plausible, chatbot ni webhook) ; la gestion du consentement y est injectée au build.
- `src/content/` : contenus en YAML/Markdown validés par `src/content.config.ts` ; pages légales dans `src/content/legal/`.
- `src/lib/roi/` : moteur de calcul partagé entre les cas pratiques et l'outil d'évaluation.
- `deploy/nginx/acdt-site.conf` : configuration nginx du conteneur du site.
- `public/consentement.js` : bannière de consentement et GA4 (chargé uniquement après accord).
- `src/config/site.ts` : pages de réservation (`rendezVous`), Cal.com tant que Google Agenda n'est pas prêt.
- `.env.example` : variables publiques uniquement. Aucun secret dans une variable `PUBLIC_*`.

Tant que `PUBLIC_INDEXABLE` n'est pas à `true`, les pages portent `noindex` et `robots.txt` bloque tout.
