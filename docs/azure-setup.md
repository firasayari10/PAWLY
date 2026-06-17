# PAWLY sur Azure — Assistant IA (RAG) + hébergement

Guide pas-à-pas pour mettre en place **l'assistant IA Pawly** et héberger
l'application **entièrement sur Azure**. Trois briques Azure :

| Brique | Service Azure | Rôle |
|---|---|---|
| LLM + embeddings | **Azure OpenAI** | génère les réponses, vectorise la base de connaissances |
| RAG / recherche | **Azure AI Search** | stocke + recherche (hybride) les chunks de la base |
| Hébergement | **Azure Container Apps** (+ ACR) | exécute l'app Next.js conteneurisée |

> Prérequis : [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli),
> un abonnement Azure avec l'accès **Azure OpenAI** activé, et Docker (ou `az acr build`).

---

## 0. Connexion + variables

```bash
az login
az account set --subscription "<votre-subscription-id>"

# Variables réutilisées ci-dessous (adaptez les noms — ils doivent être uniques)
RG=pawly-rg
LOC=francecentral
AOAI=pawly-openai
SEARCH=pawly-search
ACR=pawlyacr            # 5-50 caractères alphanumériques, minuscules
APP=pawly-web
ENVI=pawly-env
```

---

## 1. Groupe de ressources

```bash
az group create -n $RG -l $LOC
```

---

## 2. Azure OpenAI (chat + embeddings)

```bash
# Créer la ressource
az cognitiveservices account create \
  -n $AOAI -g $RG -l $LOC \
  --kind OpenAI --sku S0 --custom-domain $AOAI

# Déployer le modèle de chat
az cognitiveservices account deployment create \
  -n $AOAI -g $RG \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini --model-version "2024-07-18" \
  --model-format OpenAI --sku-capacity 20 --sku-name Standard

# Déployer le modèle d'embeddings (1536 dimensions — doit matcher l'index)
az cognitiveservices account deployment create \
  -n $AOAI -g $RG \
  --deployment-name text-embedding-3-small \
  --model-name text-embedding-3-small --model-version "1" \
  --model-format OpenAI --sku-capacity 50 --sku-name Standard

# Récupérer endpoint + clé
az cognitiveservices account show -n $AOAI -g $RG --query properties.endpoint -o tsv
az cognitiveservices account keys list -n $AOAI -g $RG --query key1 -o tsv
```

Renseignez dans `.env.local` : `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`,
`AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini`,
`AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small`.

---

## 3. Azure AI Search (base RAG)

```bash
az search service create -n $SEARCH -g $RG -l $LOC --sku basic

# Endpoint = https://<nom>.search.windows.net
az search admin-key show --service-name $SEARCH -g $RG --query primaryKey -o tsv
```

Renseignez : `AZURE_SEARCH_ENDPOINT=https://$SEARCH.search.windows.net`,
`AZURE_SEARCH_API_KEY=<clé admin>`, `AZURE_SEARCH_INDEX_NAME=pawly-kb`.

> La clé **admin** est nécessaire car le script d'ingestion crée l'index et écrit
> des documents. L'application en lecture pourrait utiliser une clé *query*, mais
> nous réutilisons la même variable pour rester simple.

---

## 4. Ingestion de la base de connaissances

Une fois `.env.local` rempli (étapes 2 et 3), localement :

```bash
bun install
bun run ingest:kb
```

Le script `scripts/ingest-kb.ts` crée l'index `pawly-kb` (champs + profil vectoriel
HNSW + config sémantique), découpe les fichiers `data/knowledge-base/*.md`, calcule
les embeddings et envoie les documents. Vérifiez dans le portail Azure → votre service
Search → index `pawly-kb` que le **nombre de documents est > 0**.

Pour enrichir l'assistant : ajoutez des fichiers `.md` dans `data/knowledge-base/`
(avec le frontmatter `title/category/source/lang`) puis relancez `bun run ingest:kb`.

---

## 5. Conteneur : registre (ACR) + image

```bash
az acr create -n $ACR -g $RG --sku Basic --admin-enabled true

# Construire l'image dans le cloud (pas besoin de Docker local).
# Les NEXT_PUBLIC_* sont inlinés au build → passés en build-args.
az acr build -r $ACR -t pawly-web:latest \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxx" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." \
  --build-arg NEXT_PUBLIC_APP_URL="https://<sera-l-URL-de-l-app>" \
  .
```

> Astuce : déployez une première fois pour connaître l'URL publique, puis
> reconstruisez avec le bon `NEXT_PUBLIC_APP_URL`.

---

## 6. Container Apps (hébergement)

```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

az containerapp env create -n $ENVI -g $RG -l $LOC

ACR_SERVER=$(az acr show -n $ACR -g $RG --query loginServer -o tsv)
ACR_PWD=$(az acr credential show -n $ACR --query "passwords[0].value" -o tsv)

az containerapp create \
  -n $APP -g $RG --environment $ENVI \
  --image $ACR_SERVER/pawly-web:latest \
  --registry-server $ACR_SERVER --registry-username $ACR --registry-password "$ACR_PWD" \
  --target-port 3000 --ingress external \
  --min-replicas 0 --max-replicas 3 \
  --secrets \
    clerk-secret="sk_live_xxx" \
    supabase-url="https://xxxx.supabase.co" \
    supabase-service-key="eyJ..." \
    resend-key="re_xxx" \
    stripe-secret="sk_live_xxx" \
    stripe-webhook="whsec_xxx" \
    aoai-endpoint="https://$AOAI.openai.azure.com" \
    aoai-key="<clé openai>" \
    search-endpoint="https://$SEARCH.search.windows.net" \
    search-key="<clé search>" \
  --env-vars \
    CLERK_SECRET_KEY=secretref:clerk-secret \
    SUPABASE_URL=secretref:supabase-url \
    SUPABASE_SERVICE_ROLE_KEY=secretref:supabase-service-key \
    RESEND_API_KEY=secretref:resend-key \
    STRIPE_SECRET_KEY=secretref:stripe-secret \
    STRIPE_WEBHOOK_SECRET=secretref:stripe-webhook \
    AZURE_OPENAI_ENDPOINT=secretref:aoai-endpoint \
    AZURE_OPENAI_API_KEY=secretref:aoai-key \
    AZURE_OPENAI_API_VERSION=2024-10-21 \
    AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small \
    AZURE_SEARCH_ENDPOINT=secretref:search-endpoint \
    AZURE_SEARCH_API_KEY=secretref:search-key \
    AZURE_SEARCH_INDEX_NAME=pawly-kb

# URL publique
az containerapp show -n $APP -g $RG --query properties.configuration.ingress.fqdn -o tsv
```

> Les variables `NEXT_PUBLIC_*` ne sont **pas** mises ici : elles sont déjà inlinées
> dans l'image au build (étape 5).

### Mise à jour après un changement de code

```bash
az acr build -r $ACR -t pawly-web:latest --build-arg ... .
az containerapp update -n $APP -g $RG --image $ACR_SERVER/pawly-web:latest
```

---

## 7. Brancher les services externes sur l'URL Azure

Une fois l'URL `https://<app>.<region>.azurecontainerapps.io` connue :

1. **Clerk** → Domains/Allowed origins : ajoutez l'URL ; mettez à jour les clés
   `pk_live`/`sk_live` si vous passez en production.
2. **Supabase** → Auth → URL configuration : ajoutez l'URL en redirect autorisée.
3. **Stripe** → Webhooks : pointez l'endpoint vers
   `https://<app>.../api/payments/webhook` et copiez le nouveau `whsec_...` dans le
   secret `stripe-webhook`.
4. Reconstruisez l'image avec `NEXT_PUBLIC_APP_URL=https://<app>...` (les liens
   e-mail / redirections Stripe l'utilisent).

---

## 8. Vérification de bout en bout

- Ouvrez l'URL publique, connectez-vous.
- Cliquez sur le bouton **sparkle** en bas à droite → posez « Que faire si mon chat
  ne mange plus ? » → la réponse doit citer des sources de la base.
- Posez « Montre-moi mes réservations » → l'outil `get_my_bookings` doit renvoyer vos
  vraies données.

---

## Coûts (ordre de grandeur)

- **AI Search Basic** : coût mensuel fixe modéré.
- **Azure OpenAI** : facturé au token ; `gpt-4o-mini` + `text-embedding-3-small`
  gardent les coûts bas.
- **Container Apps** : `min-replicas 0` ⇒ mise à l'échelle à zéro quand inactif.

## Sécurité

- Toutes les clés serveur sont des **secrets** Container Apps, jamais en `NEXT_PUBLIC_`.
- Pour aller plus loin : **Key Vault** + **managed identity** (référence `keyvaultref`
  au lieu de secrets en clair) et **Log Analytics** pour les logs.
