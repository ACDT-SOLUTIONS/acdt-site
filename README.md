# ACDT Solutions - Site vitrine

Ce dépôt contient le site vitrine statique d'ACDT Solutions.

Le site présente les services d'ACDT Solutions autour de l'automatisation, de l'intégration n8n, des CRM, des Google Sheets intelligents, de l'audit, de la prise de contact, des rendez-vous, des tarifs, des études de cas et des contenus éditoriaux.

Le projet est volontairement simple : HTML, CSS et JavaScript sans framework ni étape de build obligatoire. Il est adapté à une modification locale avec VS Code, une gestion de version via GitHub et un déploiement manuel sur un VPS OVH.

## Stack technique

- HTML statique.
- CSS global, principalement dans `assets/styles.css`.
- JavaScript vanilla, principalement dans `assets/app.js`.
- Images et fichiers statiques dans `assets/`.
- SEO statique : `sitemap.xml`, `robots.txt` et balises meta dans les pages HTML.
- Pas de framework JavaScript.
- Pas de bundler.
- Pas d'étape de compilation obligatoire.

> Note : si l'organisation technique évolue, vérifier les fichiers réellement utilisés avant de modifier le CSS ou le JavaScript principal.

## Structure du repo

Les pages sont organisées par dossiers. Chaque dossier de page contient généralement un fichier `index.html`.

```text
/
├── index.html
├── assets/
├── blog/
├── contact/
├── services/
├── tarifs/
├── rdv/
├── mentions-legales/
├── politique-de-confidentialite/
├── politique-cookies/
├── conditions-generales-utilisation/
├── conditions-generales-vente/
├── etudes-de-cas/
├── methodologie/
├── a-propos/
├── sitemap.xml
└── robots.txt
```

Principaux dossiers :

- `/` : page d'accueil et fichiers racine du site.
- `assets/` : CSS, JavaScript, images et autres ressources statiques.
- `blog/` : page ou section blog.
- `contact/` : page de contact.
- `services/` : présentation des services.
- `tarifs/` : page des offres ou tarifs.
- `rdv/` : page de prise de rendez-vous.
- `mentions-legales/` : mentions légales.
- `politique-de-confidentialite/` : politique de confidentialité.
- `politique-cookies/` : politique de cookies.
- `conditions-generales-utilisation/` : conditions générales d'utilisation.
- `conditions-generales-vente/` : conditions générales de vente.
- `etudes-de-cas/` : études de cas.
- `methodologie/` : méthodologie de travail.
- `a-propos/` : présentation d'ACDT Solutions.

> Note : le dossier observé dans ce dépôt est `politique-de-confidentialite/`. Si une ancienne documentation mentionne `politique-confidentialite/`, vérifier les liens avant de renommer ou rediriger.

## Workflow Git recommandé

La branche `main` correspond à la version stable et officielle du site.

Pour les grosses refontes, corrections importantes ou évolutions visibles, ne pas modifier directement `main`. Créer une branche de travail depuis `main`, faire les modifications, valider la version, puis merger dans `main` uniquement quand elle est prête.

Commandes utiles :

```bash
cd ~/Desktop/acdt-site
git status
git switch main
git pull origin main
git switch -c nom-de-la-branche
git add .
git commit -m "Message clair"
git push -u origin nom-de-la-branche
```

Bonnes pratiques :

- Partir de `main` avant de créer une nouvelle branche.
- Faire des commits réguliers avec des messages compréhensibles.
- Pousser la branche vers GitHub pour sauvegarder le travail.
- Relire et tester les changements avant de merger dans `main`.
- Merger dans `main` seulement après validation.

## Reprendre un travail existant

Pour reprendre le projet depuis le Mac :

1. Ouvrir le dossier local du repo dans VS Code.
2. Vérifier la branche actuelle.
3. Récupérer les dernières modifications depuis GitHub.
4. Créer une nouvelle branche si le travail n'est pas une petite correction directe.

Commandes :

```bash
cd ~/Desktop/acdt-site
git status
git branch
git switch main
git pull origin main
```

Si une branche de travail existe déjà :

```bash
git branch
git switch nom-de-la-branche
git status
```

## Déploiement manuel sur le VPS OVH

Principe :

- GitHub contient la version officielle du code.
- Le VPS OVH contient la version publiée du site.
- Après un merge dans `main`, il faut se connecter au serveur et récupérer la dernière version.

Connexion au serveur de production :

```bash
ssh ubuntu@51.255.169.52
```

Mise à jour du site sur le serveur :

```bash
cd /var/www/acdt_site
git status
git pull origin main
```

Après le déploiement, vérifier le site en ligne sur mobile et desktop.

> Note importante : si le dossier `/var/www/acdt_site` n'est pas encore un repo Git, il faut d'abord le configurer proprement ou cloner le repo dans un nouveau dossier avant de remplacer l'ancienne version. Ne pas supprimer l'ancien dossier serveur sans sauvegarde.

## Règles à respecter

- Ne pas modifier directement les fichiers en production sauf urgence.
- Toujours vérifier qu'on est sur la bonne branche avant de modifier.
- Toujours faire `git status` avant un commit ou un pull.
- Ne pas supprimer les anciens dossiers serveur sans sauvegarde.
- Ne pas toucher au dossier `/home/ubuntu/.ssh`.
- Tester les liens internes après une modification.
- Vérifier l'affichage mobile et desktop.
- Vérifier que `sitemap.xml` et `robots.txt` restent cohérents après ajout, suppression ou renommage de pages.
- Garder la structure par dossiers avec un `index.html` par page, sauf décision technique explicite.

## Commandes de diagnostic utiles

```bash
git status
git remote -v
git branch
git log --oneline -5
pwd
ls -la
```

Ces commandes permettent de vérifier l'état du repo, la branche active, l'origine GitHub configurée, les derniers commits et le dossier courant.

## Modifier le site localement

Comme le site est statique, il peut souvent être ouvert directement dans le navigateur depuis `index.html`.

Pour un test local plus proche d'un vrai serveur web, il est possible de lancer un petit serveur local depuis la racine du repo :

```bash
cd ~/Desktop/acdt-site
python3 -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000
```

> Note : ce serveur local sert uniquement au test sur le Mac. Il ne remplace pas le déploiement sur le VPS OVH.
