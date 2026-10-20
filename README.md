<div align="center">
  <img src="jaayma.sn/public/logo.svg" alt="Jaaymaa" width="160" />

  <h1>Jaaymaa</h1>
  <p><strong>La plateforme e-commerce des vendeurs senegalais</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" />
    <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs" />
    <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare" />
    <img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black" />
    <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" />
  </p>

  <p>
    <a href="#presentation">Presentation</a> &bull;
    <a href="#stack">Stack</a> &bull;
    <a href="#demarrage-local">Demarrage local</a> &bull;
    <a href="#structure">Structure</a> &bull;
    <a href="#variables-denvironnement">Variables d'environnement</a> &bull;
    <a href="#deploiement">Deploiement</a>
  </p>
</div>

---

## Presentation

**Jaaymaa** (du wolof *jaay* — vendre) est une plateforme SaaS qui permet a chaque vendeur senegalais de creer sa boutique en ligne en quelques minutes, gerer ses produits et recevoir des commandes via WhatsApp, sans connaissances techniques.

### Fonctionnalites principales

| Vendeurs | Acheteurs |
|---|---|
| Creation de boutique personnalisee | Catalogue produits par boutique |
| Gestion des produits (stock, prix, images) | Commande sans inscription |
| Suivi des commandes en temps reel | Confirmation par WhatsApp |
| Tableau de bord et statistiques | Exploration des boutiques |
| Plans d'abonnement (Gratuit / Pro) | Recherche par categorie et ville |

---

## Stack

### Frontend — `jaayma.sn/`

| Technologie | Version | Role |
|---|---|---|
| [Next.js](https://nextjs.org) | 15 | Framework React (App Router) |
| [React](https://react.dev) | 19 | UI Library |
| [Tailwind CSS](https://tailwindcss.com) | 3 | Styling |
| [Lucide React](https://lucide.dev) | latest | Icones vectorielles |
| [Zustand](https://zustand-demo.pmnd.rs) | 5 | State management (panier) |
| [OpenNext Cloudflare](https://opennext.js.org/cloudflare) | latest | Adapter Cloudflare Pages |
| [Vitest](https://vitest.dev) | latest | Tests unitaires |

### Backend — `backend/`

| Technologie | Version | Role |
|---|---|---|
| [NestJS](https://nestjs.com) | 11 | Framework API REST |
| [Prisma](https://prisma.io) | 6 | ORM et migrations |
| [Neon](https://neon.tech) | — | PostgreSQL serverless |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | — | Stockage images |
| [Zod](https://zod.dev) | 4 | Validation des donnees |

---

## Demarrage local

### Prerequis

- Node.js >= 20
- npm >= 10

### 1. Cloner le depot

```bash
git clone https://github.com/madutech7/Jaayma.sn.git
cd Jaayma.sn
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Renseigner les variables dans .env
npm install
npm run db:deploy
npm run start:dev
```

L'API sera disponible sur `http://localhost:4000`

### 3. Frontend

```bash
cd jaayma.sn
cp .env.example .env.local
# Renseigner les variables dans .env.local
npm install
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

---

## Structure

```
Jaayma.sn/
├── backend/                     # API NestJS
│   ├── render.yaml              # Configuration deploiement Render
│   ├── prisma/
│   │   ├── schema.prisma        # Schema base de donnees
│   │   ├── migrations/          # Migrations Prisma
│   │   └── seed.ts              # Donnees initiales
│   └── src/
│       ├── auth/                # Authentification (OTP)
│       ├── shops/               # CRUD boutiques
│       ├── products/            # CRUD produits
│       ├── orders/              # Commandes
│       ├── uploads/             # Upload vers R2
│       └── main.ts              # Point d'entree
│
└── jaayma.sn/                   # Application Next.js
    ├── wrangler.jsonc            # Configuration Cloudflare Pages
    ├── open-next.config.ts       # Adapter OpenNext
    └── src/
        ├── app/
        │   ├── [shopSlug]/      # Page publique boutique
        │   ├── explorer/        # Explorateur de boutiques
        │   ├── espace/          # Dashboard vendeur
        │   │   ├── boutique/    # Profil boutique
        │   │   ├── produits/    # Gestion produits
        │   │   └── commandes/   # Suivi commandes
        │   ├── admin/           # Back-office
        │   └── actions/         # Server Actions Next.js
        ├── components/          # Composants reutilisables
        └── lib/                 # Utilitaires
```

---

## Variables d'environnement

### Backend — `backend/.env`

```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

PORT=4000
NODE_ENV=development

JWT_SECRET=

CORS_ORIGIN=http://localhost:3000

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### Frontend — `jaayma.sn/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000

AUTH_SECRET=
```

---

## Scripts disponibles

### Backend

```bash
npm run start:dev    # Developpement (watch mode)
npm run start:prod   # Production
npm run build        # Compilation TypeScript
npm run db:deploy    # Appliquer les migrations
npm run db:seed      # Seeder la base de donnees
```

### Frontend

```bash
npm run dev              # Developpement (Turbopack)
npm run build:cloudflare # Build pour Cloudflare Pages
npm run test             # Tests Vitest
npm run lint             # Verification ESLint
```

---

## Deploiement

Le deploiement est entierement gere via **GitHub** (push = deploy automatique).

### Frontend — Cloudflare Workers (OpenNext)

Connexion GitHub → Cloudflare Workers via Workers Builds :

| Parametre | Valeur |
|---|---|
| Root directory | `jaayma.sn` |
| Build command | `npm install --legacy-peer-deps && npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy` |
| Node.js version | 22 |
| URL de production | https://jaayma-sn.madutech0.workers.dev |

### Backend — Render

Connexion GitHub → Render en utilisant le fichier `backend/render.yaml`.

Render detecte automatiquement la configuration :

| Parametre | Valeur |
|---|---|
| Root directory | `backend` |
| Build command | `npm install && npm run build && npx prisma db push` |
| Start command | `npm run start:prod` |
| Health check | `/health` |
| URL de production | https://jaayma-sn.onrender.com |

Les variables d'environnement sont a renseigner manuellement dans le dashboard Render (DATABASE_URL, JWT_SECRET, R2_*, CORS_ORIGIN, les cles VAPID pour les notifications push et `UNITECHPAY_API_KEY` pour les paiements Pro). `FRONTEND_URL` doit correspondre au domaine public actuel du site.

### Paiement des abonnements Pro avec UnitechPay

Le vendeur peut payer l'abonnement Pro (1 000 FCFA par défaut / 30 jours) avec Wave ou Orange Money depuis **Espace vendeur → Abonnement**. Un administrateur peut modifier ce montant dans **Administration → Réglages**. L'API ne reçoit jamais la clé UnitechPay du navigateur. Le plan Pro est activé uniquement après un webhook signé et vérifié.

1. Créez un compte marchand UnitechPay et générez une clé API dans son tableau de bord.
2. Dans Render → `jaayma-api` → **Environment**, ajoutez `UNITECHPAY_API_KEY` avec cette clé. Gardez-la secrète et ne la mettez pas dans Cloudflare ni dans le frontend.
3. Réglez `FRONTEND_URL` sur l'adresse de production actuelle, par exemple `https://jaayma-sn.madutech0.workers.dev` tant que le domaine `jaayma.sn` n'est pas utilisé.
4. Le backend configure automatiquement le webhook UnitechPay lors du premier paiement après chaque redémarrage, vers `UNITECHPAY_WEBHOOK_URL` (par défaut `https://jaayma-sn.onrender.com/subscriptions/unitechpay/webhook`), avec les événements `payment_completed`, `payment_failed` et `payment_expired`. Si vous préférez le configurer depuis le tableau de bord, l'API UnitechPay l'accepte ainsi :

```http
POST https://api.unitech.sn/api.php?action=configure_webhook
Authorization: Bearer VOTRE_CLE_API
Content-Type: application/json

{"webhook_url":"https://jaayma-sn.onrender.com/subscriptions/unitechpay/webhook","events":["payment_completed","payment_failed","payment_expired"]}
```

Le déploiement Render applique automatiquement le nouveau modèle de paiement avec `prisma db push`. Les retours depuis Wave/Orange Money affichent l'état de confirmation; seul le webhook active réellement le mois Pro.

### Notifications push des commandes

Les vendeurs peuvent activer une alerte sur chaque téléphone depuis **Espace vendeur → Commandes**. Le navigateur doit prendre en charge les notifications et l'utilisateur doit les autoriser. Sur iPhone/iPad, Jaaymaa doit d'abord être ajouté à l'écran d'accueil et ouvert depuis cette icône (iOS/iPadOS 16.4 ou plus récent).

Configurez une paire VAPID une seule fois pour le backend et conservez les mêmes clés lors des déploiements :

```bash
cd backend
npx web-push generate-vapid-keys
```

Ajoutez `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT=mailto:jaaymasn1@gmail.com` dans les variables d'environnement du backend Render. Ne partagez jamais la clé privée et ne la remplacez pas après activation des abonnements. Le backend expose la clé publique au PWA. Render applique le schéma avec `prisma db push` pendant son déploiement.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│          Cloudflare Workers                 │
│          Next.js 15 (OpenNext)              │
│  (jaayma-sn.madutech0.workers.dev)          │
└─────────────────┬───────────────────────────┘
                  │ API REST
┌─────────────────▼───────────────────────────┐
│              Render                         │
│           NestJS API REST                   │
│      (jaayma-sn.onrender.com)               │
└──────────┬──────────────────────────────────┘
           │                    │
┌──────────▼──────┐   ┌─────────▼──────────┐
│  Neon PostgreSQL │   │  Cloudflare R2     │
│  (via Prisma)    │   │  (Images produits) │
└──────────────────┘   └────────────────────┘
```

---

## Contribution

1. Fork le depot
2. Cree une branche : `git checkout -b feat/ma-fonctionnalite`
3. Commit : `git commit -m "feat: ma fonctionnalite"`
4. Push : `git push origin feat/ma-fonctionnalite`
5. Ouvre une Pull Request

---

## Licence

Distribue sous licence MIT.

---

<div align="center">
  <p>Fait au Senegal</p>
  <p><strong>Jaaymaa</strong> — <em>Vendez en ligne, simplement.</em></p>
</div>
