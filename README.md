# ACDT Solutions — site v2 (maquette)

Refonte en Astro, développée sur la branche locale `refonte-v2`, isolée de la production.
Le site publié (branche `main`) n'est pas concerné.

## Commandes

```sh
npm install        # première fois uniquement
npm run dev        # maquette en direct : http://localhost:4321/
npm run test       # tests du moteur de calcul
npm run build      # vérification des types et du contenu, puis génération dans dist/
npm run preview    # sert dist/ en local
```

## Repères

- `src/content/` : familles de solutions, secteurs, problèmes, sources, simulations, FAQ (YAML validé par `src/content.config.ts`).
- `src/lib/roi/` : moteur de calcul partagé entre les simulations publiées et le futur calculateur.
- `src/styles/tokens.css` : couleurs, typographie, espacements. Non figés.
- `.env.example` : variables publiques uniquement. Aucun secret dans une variable `PUBLIC_*`.

Tant que `PUBLIC_INDEXABLE` n'est pas à `true`, les pages portent `noindex` et `robots.txt` bloque tout.
