
# PAWLY - Guide d'installation et de démarrage

## Prérequis

- Node.js (v18 ou supérieur recommandé)
- npm (installé avec Node.js) OU bun (optionnel)
- Un accès à internet
- Un compte Supabase (pour la base de données)
- Un compte Clerk (pour l'authentification)

## Étapes détaillées d'installation

1. **Cloner le projet**

	Ouvrez un terminal et exécutez :
	```bash
	git clone <url-du-repo>
	cd PAWLY/pawly
	```

2. **Installer les dépendances**

	Avec npm :
	```bash
	npm install
	```
	Ou avec bun (si installé) :
	```bash
	bun install
	```

3. **Configurer les variables d'environnement**

	- Copiez le fichier `.env.local` fourni (ou créez-le à la racine du dossier `pawly/` si absent).
	- Renseignez les clés Supabase et Clerk dans `.env.local` :
	  - `NEXT_PUBLIC_SUPABASE_URL`
	  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	  - `SUPABASE_URL`
	  - `SUPABASE_SERVICE_ROLE_KEY`
	  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
	  - `CLERK_SECRET_KEY`
	- Exemple de contenu :
	  ```env
	  NEXT_PUBLIC_SUPABASE_URL=...
	  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
	  SUPABASE_URL=...
	  SUPABASE_SERVICE_ROLE_KEY=...
	  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
	  CLERK_SECRET_KEY=...
	  ```

4. **Lancer le serveur de développement**

	```bash
	npm run dev
	# ou
	bun run dev
	```
	Le serveur sera accessible sur [http://localhost:3000](http://localhost:3000)

5. **Utilisation de l'application**

	- Rendez-vous sur [http://localhost:3000](http://localhost:3000) dans votre navigateur.
	- Inscrivez-vous ou connectez-vous avec Clerk.
	- Après inscription, votre utilisateur sera automatiquement synchronisé dans la table `utilisateur` de Supabase.

6. **Structure du projet**

	- `src/app/` : Pages et API Next.js
	- `src/lib/supabase/` : Intégration Supabase
	- `.env.local` : Variables d'environnement sensibles
	- `public/` : Fichiers statiques

7. **Commandes utiles**

	- Lancer le serveur : `npm run dev` ou `bun run dev`
	- Build de production : `npm run build`
	- Lancer en production : `npm start`
	- Linter le code : `npm run lint`

## Remarques

- Si vous modifiez `.env.local`, redémarrez le serveur.
- Pour toute erreur liée à Clerk ou Supabase, vérifiez vos clés et droits d'accès.
- Pour déployer, suivez la documentation officielle de [Next.js](https://nextjs.org/docs/app/building-your-application/deploying).
