# Publication et déploiement

## 1. Environnements

| | Branche | Rôle |
|---|---|---|
| Développement | `refonte-v2` | Tout le travail en cours. Aucun push sur cette branche ne déploie quoi que ce soit. |
| Production | `main` | Ce qui est en ligne sur acdt-solutions.com. Un push sur `main` lance `.github/workflows/deploy.yml`. |

Ce qui est **publié** ne dépend pas de la branche mais de `src/config/publication.mjs` :

- `PAGES_PUBLIEES` : nouvelles pages mises en ligne ; toute autre nouvelle page est retirée du build public ;
- `ANCIENNES_PAGES` : sort de chaque ancienne URL (conservée, redirigée en 301, retirée en 404 ou 410) ;
- les anciennes pages conservées sont des copies figées de l'ancien site dans `legacy/`
  (régénérables avec `npm run legacy:importer`), nettoyées de GTM, GA4, du chatbot et des webhooks ;
- dès qu'une nouvelle page équivalente est publiée, l'ancienne page devient automatiquement une 301 vers elle.

## 2. Publier une version validée, sans fusion intégrale

On ne fusionne jamais la pointe de `refonte-v2` : on publie un commit précis, validé.

1. Sur `refonte-v2` : ajouter les pages validées à `PAGES_PUBLIEES`, puis
   ```sh
   npm run build:release        # version publique + contrôles
   npm run verifier:production  # contrôles bloquants (pages légales, pages obligatoires)
   npm run preview              # relecture locale (les 301/410 ne sont servis que par nginx)
   ```
2. Commit, puis étiqueter le commit validé : `git tag release-AAAAMMJJ <commit>` et `git push origin release-AAAAMMJJ`.
3. Fusionner **cette étiquette** dans `main` (les commits postérieurs de `refonte-v2` ne sont pas inclus) :
   ```sh
   git switch main && git pull
   git merge --no-ff release-AAAAMMJJ
   git push origin main          # lance le workflow ; le job de déploiement attend l'approbation « production »
   ```
4. Si un correctif a été fait directement sur `main`, le reporter : `git switch refonte-v2 && git merge main`.

Les sources des pages non publiées arrivent sur `main`, mais elles ne sont ni générées ni servies.

## 3. Serveur

Le dépôt est public : ce document ne contient volontairement ni adresse, ni identifiant, ni détail des autres
services hébergés. Les constats complets du 26/10/2026 sont conservés hors dépôt.

| Point | À savoir |
|---|---|
| Accès | utilisateur et clé définis dans les secrets GitHub (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) |
| Dossier du site | `/var/www/acdt_site`, accessible en écriture à l'utilisateur de déploiement ; `/var/www` ne l'est pas → sauvegardes dans `~/acdt_site_sauvegardes` |
| Serveur web | service `siteweb` du projet Compose `/root/n8n-compose` (image `nginx:alpine`), site monté en lecture seule, configuration `deploy/nginx/acdt-site.conf` (repère `acdt-site-conf-v1`) |
| Proxy | Traefik : HTTPS, `www`, http → https |
| Projet Compose | partagé avec d'autres services, dont n8n : toute opération doit viser **uniquement** `siteweb` (`--no-deps`) et vérifier que les autres conteneurs sont inchangés |

## 4. Étape A — Correctif de sécurité nginx (applicable dès maintenant, sur autorisation)

Installe `deploy/nginx/acdt-site.conf` : fichiers cachés et `README.md` en 404, redirections relatives, page 404
du site, inclusion des règles 301/410 générées. Testé localement avec nginx 1.29.7 sur l'ancien site (`.git`,
`.github`, `.DS_Store`, `README.md` → 404, pages inchangées) et sur la nouvelle version.

Opérations prévues (coupure de quelques secondes du site uniquement ; n8n non concerné) :

```sh
cd /root/n8n-compose
# 1. Sauvegarde, selon la convention existante du dossier
sudo cp compose.yaml compose.before-siteweb-nginx-$(date +%Y%m%d-%H%M%S).yaml
# 2. Dépôt de la configuration (contenu de deploy/nginx/acdt-site.conf)
sudo mkdir -p siteweb && sudo tee siteweb/acdt-site.conf < acdt-site.conf >/dev/null
# 3. Test de la configuration dans un conteneur jetable, sans toucher au site en ligne
sudo docker run --rm -v /root/n8n-compose/siteweb/acdt-site.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /var/www/acdt_site:/usr/share/nginx/html:ro nginx:alpine nginx -t
# 4. Ajout d'une ligne au service siteweb, sous « volumes: »
#      - ./siteweb/acdt-site.conf:/etc/nginx/conf.d/default.conf:ro
# 5. Contrôle à blanc, puis application au seul service du site
N8N_AVANT=$(docker ps -q --filter label=com.docker.compose.service=n8n)
sudo docker compose up --dry-run --no-deps --pull never -d siteweb
sudo docker compose up --no-deps --pull never -d siteweb
# 6. Vérifications
[ "$(docker ps -q --filter label=com.docker.compose.service=n8n)" = "$N8N_AVANT" ] && echo "n8n inchangé"
curl -s -o /dev/null -w '%{http_code}\n' https://acdt-solutions.com/            # 200
curl -s -o /dev/null -w '%{http_code}\n' https://acdt-solutions.com/.git/HEAD   # 404
curl -s -o /dev/null -w '%{http_code}\n' https://acdt-solutions.com/.DS_Store   # 404
```

**Retour arrière** : restaurer le `compose.yaml` sauvegardé, puis
`sudo docker compose up --no-deps --pull never -d siteweb` (retour à la configuration par défaut de l'image).

## 5. Étape B — Première publication du nouveau site

Prérequis, tous bloquants :

- [ ] Étape A appliquée (le workflow refuse de déployer sans la configuration `acdt-site-conf-v1`).
- [ ] Pages légales complétées : plus aucun `[À COMPLÉTER]` / `[À CONFIRMER]` ni point `aVerifier`
      dans `src/content/legal/*.md`, puis les cinq URL légales ajoutées à `PAGES_PUBLIEES`.
- [ ] `npm run verifier:production` satisfait.
- [ ] GitHub : environnement `production` avec approbation manuelle (Settings › Environments).
- [ ] Tests humains (section 8).

Le workflow : build sur GitHub, contrôles stricts, vérification des prérequis serveur, sauvegarde complète dans
`~/acdt_site_sauvegardes/AAAAMMJJ-HHMMSS` (dossier de l’utilisateur de déploiement) (5 conservées), `rsync --delete` de `dist/` seul (le `.git` de
l'ancien site disparaît du dossier servi), `nginx -t` puis rechargement, vérification en ligne (pages, 301, 410,
fichiers cachés), restauration automatique en cas d'échec.

## 6. Retour arrière

GitHub › Actions › « Déploiement production » › Run workflow, champ `restaurer` = nom de la sauvegarde (affiché
dans le journal). La sauvegarde initiale contient l'ancien site complet, y compris son `.git`.

## 7. Formulaire de contact

Prêt mais **désactivé** : il ne s'affiche que si `PUBLIC_FORMULAIRE_URL` est défini.

- Test local, sans service externe : `npm run formulaire:test` puis
  `PUBLIC_FORMULAIRE_URL=http://localhost:8787 npm run dev` → page `/contact/`.
- Réactivation en production : seulement après validation de la politique de confidentialité (section 2.4)
  et un test sur un workflow n8n **de test** dédié ; ajouter alors la variable au workflow de déploiement.

Le chatbot n'est pas repris (traitements de données et coûts à vérifier) ; GTM et GA4 ne sont pas repris.

## 8. Tests humains avant publication

- [ ] Appeler le 09 72 19 98 15 : réponse de l'assistant, scénario « cabinet d'avocats », durée d'environ deux minutes.
- [ ] SMS récapitulatif : réception et contenu.
- [ ] Sur mobile : « Appeler la démonstration » ouvre le composeur avec le bon numéro ; « Copier le numéro » fonctionne.
- [ ] Cal.com : réservation test, confirmation, puis annulation.
- [ ] Email à contact@acdt-solutions.com depuis une adresse externe.
- [ ] Plausible : script fourni par le tableau de bord (à reporter dans `PUBLIC_PLAUSIBLE_SRC` s'il diffère de
      `https://plausible.io/js/script.js`), puis visites visibles après mise en ligne.
