# Jaay — Ta boutique, en un lien. 🇸🇳

> **Jaay** est une plateforme e-commerce mobile-first pensée pour les commerçants, créateurs et vendeurs indépendants sénégalais (Instagram, TikTok, WhatsApp).
> Elle permet de créer sa boutique en ligne en 2 minutes depuis son smartphone, de partager un lien unique sur WhatsApp, et de gérer facilement ses commandes et son suivi de livraison.

---

## 🌟 Principes Clés

- **Mobile d'abord (360px)** : Conçu pour les smartphones Android d'entrée de gamme et connexions 3G/4G locales.
- **Acheteur sans compte** : Aucun téléchargement d'application ni mot de passe pour passer commande.
- **Intégration WhatsApp** : Boutons de partage de boutique et de contact pré-remplis pour chaque commande.
- **Paiements locaux** : Espèces à la livraison, Wave et Orange Money (montants entiers en **FCFA**).
- **Fuseau horaire** : `Africa/Dakar` (GMT).

---

## 🛠️ Stack Technique

- **Framework :** Next.js 15 (React 19, App Router, TypeScript strict, Server Components & Server Actions)
- **Hébergement :** Cloudflare Workers via `@opennextjs/cloudflare` et Wrangler
- **Base de données :** Cloudflare D1 (SQLite serverless) avec Drizzle ORM
- **Stockage images :** Cloudflare R2 (`/img/[...key]`, compression WebP côté client sous 200 Ko)
- **Style :** Tailwind CSS, variables CSS (thèmes clair/sombre, palette marché sénégalais / motif Wax)
- **Sécurité :** Sessions chiffrées HttpOnly, Web Crypto PBKDF2-SHA256, honeypot anti-spam
- **Tests :** Vitest

---

## 📋 Prérequis

- **Node.js** (v20+ LTS recommandé)
- **npm** (inclus avec Node.js)
- Un compte **Cloudflare** gratuit (pour le déploiement D1 & R2)
- **Wrangler CLI** (géré via `npx wrangler`)

---

## 🚀 Installation & Développement Local

### 1. Cloner le projet et installer les dépendances
```bash
git clone <url-du-repo>
cd jaayma.sn
npm install
```

### 2. Configurer les variables d'environnement
Créez un fichier `.env` à la racine (basé sur `.env.example`) :
```env
APP_URL=http://localhost:3000
SUPPORT_WHATSAPP=+221771234567
BILLING_WAVE_NUMBER=+221771234567
ADMIN_PHONES=+221771234567,+221781234567
```

Pour une installation locale avec l’API NestJS, renseignez aussi `JWT_SECRET` et `ADMIN_PHONES` dans `backend/.env`. Le numéro administrateur doit correspondre à celui du compte vendeur avec lequel vous vous connectez.

### 3. Initialiser la base de données locale (Cloudflare D1)
`npm run dev` applique automatiquement la migration locale avant de démarrer Next.js.
Pour l'appliquer manuellement :
```bash
# Appliquer la migration sur D1 local
npm run db:migrate:local

# Générer et insérer les données de démo (Boutique Awa Couture)
npm run db:seed:gen
npm run db:seed:local
```
Après une modification du schéma, générez la migration avec `npm run db:generate`.

### 4. Démarrer le serveur de développement
```bash
npm run dev
```
Rendez-vous sur [http://localhost:3000](http://localhost:3000).

- **Vitrine démo :** `http://localhost:3000/awa-couture`
- **Explorer :** `http://localhost:3000/explorer`
- **Espace Vendeur :** `http://localhost:3000/espace`
- **Connexion :** `http://localhost:3000/connexion` (Numéro démo : `+221771234567`)
- **Administration :** `http://localhost:3000/admin` (vue d’ensemble)
- **Back-office :** boutiques, comptes vendeurs, abonnements Pro, commandes, notifications push et réglages dans la navigation admin.

---

## 🧪 Tests Unitaires

Le projet inclut une suite de tests Vitest couvrant la normalisation des téléphones, le formatage FCFA, le calcul des commandes, les transitions d'état et les quotas des plans :

```bash
npm run test
```

---

## ☁️ Guide de Déploiement Cloudflare (Production)

Quand vous êtes prêt à déployer sur Cloudflare :

### 1. Créer la base de données D1 en production
```bash
npx wrangler d1 create jaay-db
```
Notez le `database_id` généré et reportez-le dans `wrangler.jsonc`.

### 2. Créer le bucket R2 pour les photos
```bash
npx wrangler r2 bucket create jaay-images
```

### 3. Configurer `wrangler.jsonc`
Vérifiez que votre fichier `wrangler.jsonc` contient les bindings :
```jsonc
{
  "name": "jaay",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "jaay-db",
      "database_id": "<VOTRE_DATABASE_ID>"
    }
  ],
  "r2_buckets": [
    {
      "binding": "IMAGES",
      "bucket_name": "jaay-images"
    }
  ]
}
```

### 4. Appliquer les migrations en production
```bash
npx wrangler d1 execute jaay-db --remote --file=./db/migrations/0000_initial.sql
```

### 5. Configurer les secrets Cloudflare
```bash
npx wrangler secret put SUPPORT_WHATSAPP
npx wrangler secret put BILLING_WAVE_NUMBER
```

Dans Render → `jaayma-api` → Environment, configurez `ADMIN_PHONES` (numéros séparés par des virgules) et vérifiez que `JWT_SECRET` est renseigné. L’API vérifie ces valeurs avant chaque lecture ou action d’administration. Les clés VAPID restent côté API et ne sont jamais affichées dans le back-office. Après l’activation des sessions signées, les administrateurs doivent se déconnecter puis se reconnecter une fois.

### 6. Compiler et Déployer
```bash
npx opennextjs-cloudflare
npx wrangler deploy
```

---

## 📊 Surveillance des Quotas Gratuits

L'architecture de Jaay est spécifiquement optimisée pour rester dans les offres gratuites de Cloudflare :

| Service | Quota Gratuit Quotidien | Optimisation Jaay |
|---|---|---|
| **Workers** | 100 000 requêtes / jour | Composants serveur légers, polling suspendu onglet masqué |
| **D1 (Lectures)** | 5 000 000 lectures / jour | Requêtes agrégées en 1 seul passage, max 2 requêtes / page boutique |
| **D1 (Écritures)** | 100 000 écritures / jour | Déduplication des visites quotidiennes par cookie (1 écriture max / visiteur / jour) |
| **R2** | 10 Go de stockage | Compression côté client WebP (< 200 Ko par photo), cache HTTP immutable |

Consultez vos métriques en temps réel sur le [Tableau de bord Cloudflare](https://dash.cloudflare.com).

---

## 📁 Documentation Additionnelle

- [docs/DECISIONS.md](file:///c:/Users/Madu/Documents/Perso_Project/jaayma.sn/docs/DECISIONS.md) : Historique des choix d'architecture et techniques.
- [docs/IDEAS.md](file:///c:/Users/Madu/Documents/Perso_Project/jaayma.sn/docs/IDEAS.md) : Feuilles de route et idées futures (APIs Wave/OM, impression bluetooth...).
- [docs/TESTING.md](file:///c:/Users/Madu/Documents/Perso_Project/jaayma.sn/docs/TESTING.md) : Checklist de validation manuelle sur mobile 360px.
