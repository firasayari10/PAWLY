# 🐾 PAWLY — Guide d'installation complet (de A à Z)

> Plateforme web de **garde d'animaux** : un·e propriétaire publie une demande de garde,
> un·e prestataire la prend en charge, paiement en ligne, avis, e-journal de la garde,
> carte des vétérinaires, messagerie **chiffrée de bout en bout** et back-office admin.
>
> Ce README est volontairement **exhaustif** : suivez-le dans l'ordre et le projet
> tournera sur **n'importe quelle machine neuve**. Chaque variable, chaque service externe
> et chaque script SQL y est documenté.

---

## 1. Pile technique (ce qu'il faut savoir)

| Domaine | Technologie |
|---|---|
| Framework | **Next.js 16** (App Router, React 19, React Compiler activé) |
| Langage | **TypeScript** strict |
| Gestionnaire de paquets | **Bun** (`bun.lock` fait foi — voir §3) |
| Authentification | **Clerk** (`@clerk/nextjs`) |
| Base de données | **Supabase / PostgreSQL** |
| Stockage de fichiers | **Supabase Storage** (photos de journal + pièces jointes du chat) |
| Paiement | **Stripe** (Checkout + webhooks) |
| E-mails transactionnels | **Resend** |
| Carte | **Leaflet / OpenStreetMap** (vétérinaires) |
| Chiffrement chat | **AES-256-GCM** côté navigateur (Web Crypto) |
| Tests | **Vitest** (44 fichiers, ~308 tests, 100 % hors-ligne) |

**Modèle d'accès aux données (important) :** toutes les **écritures** passent par les routes
API Next.js authentifiées avec Clerk et utilisent la **clé service-role** Supabase (qui
contourne la RLS). Seules les **lectures temps réel du chat** se font directement depuis le
navigateur avec la **clé anon** + le **JWT Clerk** (Third-Party Auth), protégées par des
policies RLS. → cela a une conséquence : le pont **Clerk ↔ Supabase** (§7) n'est nécessaire
que pour le chat en direct ; tout le reste fonctionne sans lui.

---

## 2. Prérequis de la machine

À installer **avant** de commencer :

| Outil | Version | Vérifier avec | Où l'obtenir |
|---|---|---|---|
| **Bun** | ≥ 1.2 | `bun --version` | <https://bun.sh> |
| **Node.js** | ≥ 20 LTS | `node --version` | <https://nodejs.org> (requis par les outils Next) |
| **Git** | récente | `git --version` | <https://git-scm.com> |
| **Stripe CLI** | récente | `stripe --version` | <https://stripe.com/docs/stripe-cli> (uniquement pour tester les paiements en local) |

> 💡 **Windows** : Bun fonctionne nativement. Si vous préférez `npm`, remplacez `bun` par
> `npm` dans toutes les commandes (`bun install` → `npm install`, `bun run dev` → `npm run dev`).
> Le projet est cependant verrouillé avec `bun.lock` — **préférez Bun** pour des installations
> reproductibles.

---

## 3. Comptes et services externes à créer

Le projet **ne démarre pas** sans ces 4 services (Stripe et Resend peuvent rester en mode
test). Créez chaque compte et gardez les clés sous la main pour le §6.

| Service | À créer | Clés à récupérer |
|---|---|---|
| **Supabase** | 1 projet | URL du projet, clé `anon`, clé `service_role` (Dashboard → Project Settings → API) |
| **Clerk** | 1 application | `Publishable key`, `Secret key` (Dashboard → API Keys) |
| **Stripe** | 1 compte (mode test) | `Secret key` (`sk_test_…`) + `Webhook signing secret` (`whsec_…`) |
| **Resend** | 1 compte | `API key` (`re_…`) |

---

## 4. Cloner le projet

```bash
git clone https://github.com/firasayari10/PAWLY.git
cd PAWLY/pawly          # ⚠️ l'application réelle est dans le sous-dossier pawly/
```

> ⚠️ **Structure du dépôt** : l'application Next.js vit dans `PAWLY/pawly/`. Toutes les
> commandes ci-dessous s'exécutent **depuis `pawly/`**.

---

## 5. Installer les dépendances

```bash
bun install
```

Cela installe les ~514 paquets listés dans `package.json` à partir de `bun.lock`.

---

## 6. Configurer les variables d'environnement

Créez un fichier **`.env.local`** à la racine de `pawly/` (à côté de `package.json`).
Le plus simple : copiez le modèle fourni puis remplissez-le.

```bash
cp .env.example .env.local
```

Renseignez **chacune** de ces variables (toutes sont obligatoires) :

| Variable | Rôle | Où la trouver |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app (sert aux redirections Stripe et aux liens e-mail) | `http://localhost:3000` en local |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk (front) | Clerk → API Keys (`pk_test_…`) |
| `CLERK_SECRET_KEY` | Clé secrète Clerk (back) | Clerk → API Keys (`sk_test_…`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (front, chat) | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase (front, chat) | Supabase → Settings → API |
| `SUPABASE_URL` | URL du projet Supabase (back) | identique à `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service-role (back, contourne la RLS) | Supabase → Settings → API — **secret, ne jamais exposer côté client** |
| `RESEND_API_KEY` | Envoi des e-mails transactionnels | Resend → API Keys (`re_…`) |
| `STRIPE_SECRET_KEY` | Création des sessions de paiement | Stripe → Developers → API keys (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Vérification de signature des webhooks Stripe | fourni par `stripe listen` (voir §8) (`whsec_…`) |

> 🔐 **Sécurité** : `.env.local` est ignoré par Git (voir `.gitignore`). **Ne le commitez
> jamais.** Si une clé fuite, régénérez-la dans le dashboard concerné.
>
> 🔁 Après toute modification de `.env.local`, **redémarrez** le serveur de dev.

---

## 7. Mettre en place la base de données Supabase

Ouvrez **Supabase → SQL Editor → New query** et exécutez les fichiers du dossier
`pawly/supabase/` **dans cet ordre précis** (chaque fichier est idempotent, donc rejouable
sans risque) :

| # | Fichier | Ce qu'il crée |
|---|---|---|
| 1 | **`sprint1.sql`** | 🆕 Table de base **`utilisateur`** (voir encadré ci-dessous) |
| 2 | `sprint2.sql` | `offre_garde`, `prestataire_profil` |
| 3 | `fix.sql` | Corrige l'unicité du téléphone sur `utilisateur` |
| 4 | `sprint3.sql` | Colonnes de paiement (Stripe) sur `offre_garde` |
| 5 | `sprint4.sql` | `avis_offre` (notation), `info_veterinaire`, annulation/remboursement |
| 6 | `sprint5.sql` | E-journal (`journal*` + bucket `journal-photos`), `veterinaire_clinique`, rôle admin + `signalement` |
| 7 | `sprint6.sql` | Chat E2EE : `chat_conversation`, `chat_message`, `user_public_key` + policies RLS |
| 8 | `sprint7.sql` | Bucket privé `chat-attachments` (pièces jointes chiffrées) |

> ### 🆕 À propos de `sprint1.sql` (à exécuter EN PREMIER)
> Le schéma de base d'origine (la table **`utilisateur`**) n'était pas versionné dans le
> dépôt. Le fichier **`supabase/sprint1.sql`** a été **ajouté** : il recrée la table
> `utilisateur` à partir des colonnes réellement utilisées par le code. **Sur une machine /
> un projet Supabase neuf, vous DEVEZ l'exécuter avant `sprint2.sql`**, sinon toutes les
> migrations suivantes échoueront (elles référencent `utilisateur(id_user)`).

### Buckets de stockage
- `sprint5.sql` crée le bucket **`journal-photos`** (photos du e-journal).
- `sprint7.sql` crée le bucket privé **`chat-attachments`** (pièces jointes du chat, chiffrées).
- Si un bucket n'apparaît pas dans **Supabase → Storage**, relancez le script concerné et
  vérifiez les éventuelles erreurs renvoyées par le SQL Editor.

---

## 8. Pont Clerk ↔ Supabase — **uniquement pour le chat en direct**

La messagerie chiffrée lit Supabase **directement depuis le navigateur** via le JWT Clerk.
Pour que les policies RLS du `sprint6.sql` reconnaissent l'utilisateur, il faut **brancher
Clerk comme fournisseur d'authentification tiers de Supabase** :

1. **Supabase → Authentication → Third-Party Auth → Add provider → Clerk** : collez le
   *Frontend API / domaine* de votre application Clerk.
2. **Clerk Dashboard** : activez l'**intégration Supabase** pour que le token de session
   porte un `sub` stable (l'id utilisateur Clerk) et `role: 'authenticated'`.

Après cela, `auth.jwt() ->> 'sub'` dans les policies correspond au `clerk_id` de la table
`utilisateur`.

> ℹ️ **Sans cette étape**, toute l'application fonctionne (inscription, recherche, réservation,
> paiement, avis, journal, admin…) ; seule la **réception des messages en temps réel** ne
> remontera pas via Realtime (le reste du chat passe par les routes API).

---

## 9. Configurer les webhooks Stripe (paiements en local)

Stripe confirme les paiements via un **webhook**. En local, utilisez la **Stripe CLI** :

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

La commande affiche un secret `whsec_…` → copiez-le dans `STRIPE_WEBHOOK_SECRET`
(`.env.local`) puis **redémarrez** le serveur de dev. La route
`/api/payments/webhook` est volontairement **publique** (Stripe poste sans session) mais
**vérifie la signature** — d'où l'importance de ce secret.

---

## 10. Lancer l'application

```bash
bun run dev
```

➡️ Ouvrez **<http://localhost:3000>**.

Premier parcours :
1. **Inscrivez-vous / connectez-vous** via Clerk.
2. À la première connexion, votre compte est **synchronisé automatiquement** dans la table
   `utilisateur` (rôle par défaut `proprietaire`, statut `en_attente`) — voir
   `src/app/api/profile/sync-utilisateur/route.ts`.
3. Naviguez : recherche de prestataires, réservation, paiement (Stripe test), avis, e-journal…

### Devenir prestataire / administrateur
- **Prestataire** : complétez votre profil prestataire dans l'app (crée une ligne
  `prestataire_profil`).
- **Admin** : promotion **manuelle** en SQL (voir la fin de `sprint5.sql`) :
  ```sql
  UPDATE utilisateur SET role = 'admin' WHERE email = 'votre-email@exemple.fr';
  ```

> Rappel : seul le statut **`suspendu`** bloque l'accès à l'API ; un compte `en_attente`
> peut utiliser l'application normalement.

---

## 11. Vérifier que tout fonctionne (qualité)

Les trois portes de qualité doivent être vertes :

```bash
bun run test     # 44 fichiers / ~308 tests — 100 % hors-ligne (mocks Supabase/Clerk/Stripe)
bun run build    # build de production Next.js — doit compiler sans erreur
bun run lint     # ESLint — 0 erreur (quelques avertissements <img> tolérés)
```

> Les tests n'ont **besoin d'aucun service externe** : ils utilisent des faux clients en
> mémoire. Vous pouvez donc les lancer immédiatement après `bun install`, avant même de
> configurer Supabase/Clerk.

---

## 12. Scripts disponibles (`package.json`)

| Commande | Effet |
|---|---|
| `bun run dev` | Serveur de développement (hot reload) sur `:3000` |
| `bun run build` | Build de production |
| `bun run start` | Démarre le build de production |
| `bun run lint` | Analyse ESLint |
| `bun run test` | Lance la suite Vitest une fois |
| `bun run test:watch` | Vitest en mode watch (TDD) |

---

## 13. Structure du projet

```
pawly/
├── src/
│   ├── proxy.ts                 # Middleware Clerk (Next 16 : « proxy » = middleware) — protège les routes
│   ├── app/
│   │   ├── api/                 # Routes API (REST) : bookings, payments, reviews, journal, admin, conversations…
│   │   ├── (pages)/             # Pages : login, signup, search, dashboard, profile, journal, veterinaires…
│   │   └── layout.tsx           # Layout racine + ClerkProvider + thème
│   ├── components/              # Composants UI (navbar, map, chat-box, theme-toggle…)
│   └── lib/                     # Logique métier + intégrations
│       ├── supabase-server.ts   # Client Supabase service-role (écritures)
│       ├── supabase-browser.ts  # Client Supabase anon + JWT Clerk (lectures chat)
│       ├── prestataire.ts       # Types/helpers du profil prestataire
│       ├── e2ee.ts              # Chiffrement de bout en bout (chat)
│       ├── payments.ts / stripe.ts
│       └── account.ts, bookings.ts, reviews.ts, journal.ts, admin.ts…
├── supabase/                    # Migrations SQL (sprint1 → sprint7 + fix) — voir §7
├── public/                      # Fichiers statiques
├── .env.example                # Modèle de variables d'environnement
├── .env.local                  # ⚠️ vos secrets — NON versionné
└── package.json
```

---

## 14. Dépannage (erreurs fréquentes)

| Symptôme | Cause probable | Solution |
|---|---|---|
| `relation "utilisateur" does not exist` au lancement des migrations | `sprint1.sql` non exécuté | Exécutez **`sprint1.sql` en premier** (§7) |
| Page blanche / erreur Clerk au démarrage | Clés Clerk manquantes ou invalides | Vérifiez `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY`, puis redémarrez |
| `NEXT_PUBLIC_SUPABASE_URL / ANON_KEY manquantes` | Variables Supabase front absentes | Renseignez les `NEXT_PUBLIC_SUPABASE_*` dans `.env.local` |
| Le paiement ne se confirme jamais | Webhook Stripe non branché | Lancez `stripe listen …` et collez le `whsec_…` (§9) |
| Les messages du chat n'arrivent pas en temps réel | Pont Clerk↔Supabase absent | Configurez le Third-Party Auth (§8) |
| `403 Compte suspendu` | `statut_compte = 'suspendu'` | Repassez le compte à `actif`/`en_attente` en SQL |
| Modifs de `.env.local` sans effet | Serveur non redémarré | Arrêtez puis relancez `bun run dev` |
| Build casse sur une erreur de type | Cache TS périmé | Supprimez `.next/` et `tsconfig.tsbuildinfo`, relancez `bun run build` |

---

## 15. ✅ Checklist « nouvelle machine »

- [ ] Bun ≥ 1.2, Node ≥ 20, Git installés
- [ ] Comptes créés : Supabase, Clerk, Stripe (test), Resend
- [ ] `git clone` puis `cd PAWLY/pawly`
- [ ] `bun install`
- [ ] `.env.local` créé et **toutes** les variables du §6 renseignées
- [ ] Migrations SQL exécutées **dans l'ordre** : `sprint1` → `sprint2` → `fix` → `sprint3` → `sprint4` → `sprint5` → `sprint6` → `sprint7`
- [ ] Buckets `journal-photos` et `chat-attachments` présents dans Supabase Storage
- [ ] (Chat en direct) Pont Clerk ↔ Supabase Third-Party Auth configuré
- [ ] (Paiements) `stripe listen` lancé et `STRIPE_WEBHOOK_SECRET` renseigné
- [ ] `bun run test` ✅ `bun run build` ✅ `bun run lint` ✅
- [ ] `bun run dev` → <http://localhost:3000> accessible et inscription fonctionnelle

---

## 16. Déploiement (production)

1. Hébergez de préférence sur **Vercel** (support natif de Next.js).
2. Déclarez **toutes** les variables du §6 dans les *Environment Variables* de l'hébergeur
   (avec `NEXT_PUBLIC_APP_URL` = votre URL de production).
3. Créez un **endpoint webhook Stripe** permanent pointant vers
   `https://VOTRE-DOMAINE/api/payments/webhook` et utilisez son `whsec_…` de production.
4. Mettez à jour les **URLs autorisées** dans Clerk et le **Third-Party Auth** Supabase avec
   le domaine de production.
5. Documentation de référence : <https://nextjs.org/docs/app/building-your-application/deploying>.
