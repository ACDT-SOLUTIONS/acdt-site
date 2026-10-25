# Publication et déploiement

## Deux environnements

| | Branche | Rôle |
|---|---|---|
| Développement | `refonte-v2` | Tout le travail en cours. Aucun push sur cette branche ne déploie quoi que ce soit. |
| Production | `main` | Ce qui est en ligne sur acdt-solutions.com. Chaque push sur `main` lance `.github/workflows/deploy.yml`. |

`main` reçoit les sources complètes depuis `refonte-v2`. Ce qui est **publié** ne dépend pas de la branche mais de
`src/config/publication.mjs` : une page absente de `PAGES_PUBLIEES` n'est pas générée dans la version publique,
même si son code est présent sur `main`.

## Cycle de travail

1. **Développer** sur `refonte-v2` : `npm run dev` (toutes les pages, bandeau « Page non publiée » sur les autres).
2. **Valider** visuellement et fonctionnellement.
3. **Publier une page** : ajouter son chemin dans `PAGES_PUBLIEES`, puis :
   ```sh
   npm run build:release        # version publique + contrôles
   npm run verifier:production  # contrôles bloquants (pages légales, pages obligatoires)
   npm run preview              # relecture locale de la version publique
   ```
4. **Commit et push** de `refonte-v2`.
5. **Mettre en production** : fusionner `refonte-v2` dans `main` et pousser `main`.
   ```sh
   git switch main && git pull && git merge --ff-only refonte-v2 && git push
   ```
   Si un correctif a été fait directement sur `main`, le reporter d'abord : `git switch refonte-v2 && git merge main`.
6. **Suivre** l'exécution dans GitHub › Actions › « Déploiement production ».

## Ce que fait le déploiement

1. Build de la version publique sur GitHub (`npm run build:release`), tests et `npm run verifier:production`.
   **Si un contrôle échoue, rien n'est envoyé sur le serveur.**
2. Sauvegarde complète de `/var/www/acdt_site` dans `/var/www/acdt_site_sauvegardes/AAAAMMJJ-HHMMSS`
   (5 sauvegardes conservées).
3. Publication de `dist/` uniquement, synchronisé en place dans `/var/www/acdt_site` (`rsync --delete`) :
   ni sources, ni `.git`, ni `.github`, ni `.env` sur le serveur.
4. Vérification du site en ligne (pages publiées en 200, `/.git/HEAD` et une page non publiée en 404).
5. En cas d'échec de l'étape 3 ou 4 : restauration automatique de la sauvegarde.

**Revenir en arrière manuellement** : GitHub › Actions › « Déploiement production » › Run workflow, champ
`restaurer` = nom de la sauvegarde (affiché dans le journal du déploiement).

## Première mise en production : prérequis

À vérifier par une personne ayant accès au serveur et au compte GitHub :

- [ ] **Pages légales validées** : traiter les points `aVerifier` de `src/content/legal/*.md`, vider ces listes,
      puis ajouter `/mentions-legales/`, `/confidentialite/`, `/cookies/`, `/cgu/`, `/cgv/` à `PAGES_PUBLIEES`.
      La politique de confidentialité doit notamment couvrir la ligne de démonstration et Cal.com.
- [ ] **Serveur** : `rsync` installé ; l'utilisateur `VPS_USER` peut écrire dans `/var/www/acdt_site` et créer
      `/var/www/acdt_site_sauvegardes` ; espace disque suffisant (quelques Mo par sauvegarde).
- [ ] **nginx** (configuration du conteneur `n8n-compose_siteweb_1`) — recommandé, non bloquant :
      - redirections 301 des anciennes URL : coller la sortie de `npm run redirections:nginx` ;
        sans elles, les pages de redirection HTML générées dans `dist/` prennent le relais ;
      - `error_page 404 /404.html;` pour afficher la page 404 du site ;
      - `location ~ /\. { deny all; }` pour interdire tout fichier caché.
- [ ] **GitHub** : environnement `production` créé, avec validation manuelle (Settings › Environments) pour que
      chaque déploiement attende un clic d'approbation.
- [ ] **Tests humains** (voir ci-dessous).

## Tests humains avant publication

Ces points ne peuvent pas être vérifiés automatiquement :

- [ ] Appeler le **09 72 19 98 15** depuis un mobile : l'assistant répond, le scénario « cabinet d'avocats »
      se déroule, la durée est d'environ deux minutes.
- [ ] Vérifier la réception (ou non) du **SMS récapitulatif** et son contenu.
- [ ] Sur mobile, le bouton « Appeler la démonstration » ouvre bien le composeur avec le bon numéro.
- [ ] « Copier le numéro » fonctionne dans Safari, Chrome et Firefox.
- [ ] **Cal.com** : effectuer une réservation test, vérifier la confirmation et l'agenda, puis l'annuler.
- [ ] Envoyer un email à **contact@acdt-solutions.com** depuis une adresse externe et vérifier sa réception.
- [ ] Plausible : après mise en ligne, vérifier que les visites apparaissent sur le tableau de bord.
