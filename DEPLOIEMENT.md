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
  (régénérables avec `npm run legacy:importer`), nettoyées de GTM, GA4, Plausible, du chatbot et des webhooks ;
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
| Serveur web | service `siteweb` du projet Compose `/root/n8n-compose` (image `nginx:alpine`), site monté en lecture seule, configuration `deploy/nginx/acdt-site.conf` (repère `acdt-site-conf-v2`) |
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

## 4 bis. Étape A2 — Journaux du site : 7 jours au maximum (appliquée le 26/10/2026)

nginx n'écrit plus ses accès dans le journal Docker (sans limite de durée) mais dans `/var/log/acdt-site` sur
l'hôte, monté dans le conteneur `siteweb` :

- `access-AAAA-MM-JJ.log` : un fichier par jour UTC (IP du visiteur via `X-Forwarded-For`, date, URL, référent,
  navigateur) ; `error.log` : erreurs ;
- `/usr/local/sbin/acdt-site-purge-journaux`, lancé toutes les heures par `acdt-site-purge-journaux.timer`
  (sources : `deploy/journaux/`) : conserve le jour en cours et les 5 précédents, retire de `error.log` les lignes
  de plus de 6 jours. Aucune entrée ne dépasse 7 jours, même si une exécution est retardée de 24 h ;
- recréer le conteneur a effacé l'ancien journal Docker (IP depuis le 25/10/2026).

Sauvegardes : `/root/n8n-compose/compose.before-siteweb-journaux-20261026-193801.yaml` et
`/root/n8n-compose/siteweb/acdt-site.conf.v1-20261026-193801`.

Contrôle : `sudo ls -la /var/log/acdt-site` (au plus 6 fichiers `access-*`) ;
`systemctl list-timers acdt-site-purge-journaux.timer` ; `docker logs <siteweb>` ne contient aucune requête.

Retour arrière : restaurer les deux fichiers sauvegardés, puis
`sudo docker compose --project-directory /root/n8n-compose -f /root/n8n-compose/compose.yaml up --no-deps --pull never -d siteweb`
et `sudo systemctl disable --now acdt-site-purge-journaux.timer`. Le workflow exige alors de remettre le repère
`acdt-site-conf-v1` dans `deploy.yml`.

## 5. Étape B — Première publication du nouveau site

Prérequis, tous bloquants :

- [x] Étape A appliquée (le workflow refuse de déployer sans la configuration `acdt-site-conf-v2`).
- [x] Étape A2 appliquée (journaux 7 jours).
- [x] Pages légales complétées : plus aucun `[À COMPLÉTER]` / `[À CONFIRMER]` ni point `aVerifier`
      dans `src/content/legal/*.md`, puis les cinq URL légales ajoutées à `PAGES_PUBLIEES`.
- [ ] `npm run verifier:production` satisfait.
- [ ] GitHub : environnement `production` avec approbation manuelle (Settings › Environments).
- [ ] Tests humains (section 11).

Le workflow : build sur GitHub, contrôles stricts, vérification des prérequis serveur, sauvegarde complète dans
`~/acdt_site_sauvegardes/AAAAMMJJ-HHMMSS` (dossier de l’utilisateur de déploiement) (5 conservées), `rsync --delete` de `dist/` seul (le `.git` de
l'ancien site disparaît du dossier servi), `nginx -t` puis rechargement, vérification en ligne (pages, 301, 410,
fichiers cachés), restauration automatique en cas d'échec.

## 6. Retour arrière

GitHub › Actions › « Déploiement production » › Run workflow, champ `restaurer` = nom de la sauvegarde (affiché
dans le journal). La sauvegarde initiale contient l'ancien site complet, y compris son `.git`.

## 7. Formulaire de contact

Relié au workflow n8n de production **existant** (webhook POST, corps JSON `name`, `company`, `email`, `message`) :
notification Gmail à contact@, accusé de réception au prospect, ligne dans Google Sheets « Prospects-formulaire ».
L'adresse est définie dans `.github/workflows/deploy.yml` (`PUBLIC_FORMULAIRE_URL`) ; sans elle, le formulaire
n'est pas affiché et le contrôle strict bloque la mise en production.

- **Ne jamais utiliser le webhook de production en développement** : chaque envoi déclenche les emails et
  l'écriture dans Google Sheets. Test local : `npm run formulaire:test` puis
  `PUBLIC_FORMULAIRE_URL=http://localhost:8787 npm run dev` → page `/contact/`.
- Succès affiché uniquement si le webhook répond en 2xx. Le workflow « ACDT FORFMULAIRE » répond dès réception
  (`onReceived`, constaté le 26/10/2026) : le 2xx confirme la réception par n8n, pas l'envoi des emails ni
  l'écriture dans Sheets (nœud `appendOrUpdate`, colonnes Nom, Email, Société, Message).
- Protections côté navigateur : champ piège, envoi en moins de 2,5 s refusé, 3 envois par heure et par navigateur,
  longueurs maximales. Le webhook reste appelable directement : un filtrage côté n8n (champ vide, longueurs,
  limitation) reste à prévoir lors de la révision du workflow.

Le chatbot n'est pas repris (traitements de données et coûts à vérifier). Google Tag Manager n'est pas repris.

## 8. Mesure d'audience (GA4) et consentement

- GA4 direct (`gtag.js`), identifiant `G-V9NGFLJYFW` repris de l'ancien site, défini dans `deploy.yml`
  (`PUBLIC_GA4_ID`). Sans GTM : l'ancien site chargeait GTM `GTM-NXXCW598` **et** gtag en parallèle.
- `public/consentement.js` (nouvelles pages et anciennes pages conservées) : bannière Accepter / Refuser,
  `gtag.js` chargé seulement après accord, choix mémorisé 6 mois, retrait via « Gérer les cookies » (pied de page)
  ou la politique de cookies, suppression des cookies `_ga` au retrait. Cookies limités à 13 mois, signaux Google
  désactivés.
- Toute modification de ce comportement doit être reportée dans `politique-cookies.md` et
  `politique-de-confidentialite.md`.

## 9. Rendez-vous : migration Cal.com → Google Agenda

État : Cal.com reste en service (`rendezVous.calcom`, `src/config/site.ts`) tant que les pages Google ne sont pas prêtes.

1. Dans Google Agenda (Workspace Business Plus), créer deux plannings de rendez-vous « Rendez-vous de découverte —
   ACDT Solutions », 30 min, lundi–vendredi 10h00–12h00 et 13h00–16h00, Europe/Paris :
   - visioconférence : Google Meet ajouté automatiquement ;
   - téléphone : champ « numéro de téléphone » obligatoire dans le formulaire de réservation ;
   - les deux plannings vérifient la disponibilité de l'agenda principal (évite les doubles réservations).
2. Tester chaque page : réservation, emails de confirmation, lien Meet, annulation ; réserver le même créneau
   sur les deux pages pour vérifier qu'il disparaît de l'autre.
3. Renseigner `rendezVous.google.visio` et `rendezVous.google.telephone` (le build refuse une adresse qui n'est
   pas une page Google Agenda). La page `/rendez-vous/` bascule alors automatiquement sur le choix des modalités.
4. Après mise en ligne et vérification : supprimer `rendezVous.calcom` et son affichage, retirer Cal.com de
   `politique-de-confidentialite.md` (sections 2.3 et 5) et de `politique-cookies.md` (section 4), puis fermer le
   compte Cal.com.

Liens Cal.com recensés dans la refonte : `src/config/site.ts` (`rendezVous.calcom`, seul lien réel, utilisé par
`src/pages/rendez-vous.astro`), mentions dans les deux politiques ci-dessus. Les anciennes pages conservées et
`/rdv/` (301) renvoient vers `/rendez-vous/`, sans lien direct vers Cal.com.

## 10. Conformité des données : suivi

Points sortis de la liste `aVerifier` de la politique de confidentialité au moment de la publication (26/10/2026).
Ils ne sont **pas** vérifiés : la politique annonce les durées retenues, la pratique doit encore les rejoindre.

| Données | Durée annoncée | État au 26/10/2026 |
|---|---|---|
| Exécutions n8n (formulaire, démonstration) | 14 jours | ✅ Vérifié : purge active (n8n 2.37.11, réglage par défaut 336 h + 1 h, 10 000 exécutions au plus). |
| Journaux nginx | 7 jours | ✅ Vérifié : étape A2 (fichiers par jour + purge horaire testée). |
| Résumés Telegram (démonstration) | 14 jours | ❌ **À faire par vous** : suppression automatique à 7 jours (ci-dessous). L'historique existant, plus ancien, reste en place tant que vous ne décidez pas de le supprimer : la politique n'est donc pas respectée pour ces anciens messages. |
| Enregistrements et transcriptions Vapi | 14 jours | ⚠ **Non vérifié** : formule du compte, absence de rétention illimitée (comptes anciens), module « Data Retention ». Stockage Vapi (Cloudflare R2), traitement AWS us-west-2. |
| GA4, données utilisateur et événements | 2 mois (défaut) | ⚠ **Non vérifié** : Administration › Collecte et conservation des données › Conservation des données. |
| Prospects sans suite (Sheets, Gmail) | 30 jours | ❌ Aucune suppression automatique. |

**Telegram — suppression automatique à 7 jours (impossible depuis le projet : l'API Bot ne règle pas ce paramètre
et ne supprime pas les messages de plus de 48 h).** Dans l'application Telegram, ouvrir la conversation où le bot
publie les résumés « DÉMO ACDT CONTINUITÉ » (libellés variables selon l'application et sa version) :
- conversation privée avec le bot : ⋮ (ou nom du bot) › **Supprimer automatiquement** › **1 semaine** ;
- groupe : nom du groupe › ✏️ Modifier › **Supprimer automatiquement les messages** › **1 semaine**
  (droits d'administrateur requis).
Le réglage ne s'applique qu'aux messages envoyés après son activation. Vérification : un nouveau résumé affiche
l'icône de minuterie.

Autres points à traiter :

- Transferts hors UE : garanties (accord de traitement, clauses contractuelles types) de Vapi et de Telegram non
  documentées ; Telegram ne propose pas d'accord de sous-traitance pour un usage standard. La politique mentionne
  les transferts sans revendiquer de garantie.
- Vapi : fournisseurs de reconnaissance vocale, de modèle de langage et de synthèse vocale de l'assistant de démo.
- Démonstration : deux workflows Vapi actifs (« ACDT Continuité - démo », « permanence tel avocat ») ; confirmer
  celui du 09 72 19 98 15.
- Serveur OVH : localisation du centre de données du VPS.
- Google Sheets « Prospects-formulaire » et Gmail : suppression à 30 jours des prospects sans suite.
- Note SQLite : n8n efface les exécutions, mais `database.sqlite` n'est pas compacté
  (`DB_SQLITE_VACUUM_ON_STARTUP` absent) ; l'espace libéré peut conserver des résidus jusqu'à réécriture.

## 11. Tests humains avant publication

- [ ] Appeler le 09 72 19 98 15 : réponse de l'assistant, annonce de l'enregistrement et de la transcription,
      scénario « cabinet d'avocats », durée d'environ deux minutes.
- [ ] SMS récapitulatif : réception et contenu.
- [ ] Sur mobile : « Appeler la démonstration » ouvre le composeur avec le bon numéro ; « Copier le numéro » fonctionne.
- [ ] Formulaire : un envoi réel depuis la version publiée → notification sur contact@, accusé de réception chez
      l'expéditeur, ligne dans « Prospects-formulaire » ; puis supprimer ces données de test.
- [ ] Réservation (Cal.com, puis chaque page Google Agenda) : réservation test, confirmation, puis annulation.
- [ ] Email à contact@acdt-solutions.com depuis une adresse externe.
- [ ] GA4 : refuser → aucune requête vers Google (outils de développement › Réseau) ; accepter → visite visible
      dans le rapport « Temps réel » ; « Gérer les cookies » → refuser → cookies `_ga` supprimés.
- [ ] Vérifier dans le conteneur GTM-NXXCW598 que GA4 n'y est pas nécessaire à autre chose (il ne sera plus chargé).
