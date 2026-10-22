---
title: Jaayma API
emoji: ???
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
app_port: 7860
---

# Jaayma API

Backend NestJS pour [jaayma.sn](https://jaayma.sn) — marketplace sénégalaise de boutiques locales.

## Stack

- **Runtime** : Node.js 22 + NestJS
- **Base de données** : PostgreSQL via Prisma ORM (Neon)
- **Stockage fichiers** : Cloudflare R2
- **Paiement** : UnitechPay
- **Notifications push** : Web Push (VAPID)

## Variables d'environnement requises

Configurer dans **Settings > Variables and secrets** du Space :

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL (Neon pooler recommandé) |
| `JWT_SECRET` | Secret JWT (long, aléatoire) |
| `CORS_ORIGIN` | Origines autorisées (ex: `https://jaayma.sn`) |
| `ADMIN_PHONES` | Numéros admins séparés par virgule |
| `UNITECHPAY_API_KEY` | Clé secrète UnitechPay |
| `R2_ACCOUNT_ID` | ID du compte Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Access Key R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Key R2 |
| `R2_BUCKET_NAME` | Nom du bucket R2 |
| `R2_PUBLIC_URL` | URL publique R2 (ex: `https://static.jaayma.sn`) |
| `VAPID_PUBLIC_KEY` | Clé publique VAPID |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID |
| `VAPID_SUBJECT` | Ex: `mailto:jaaymasn1@gmail.com` |
| `FRONTEND_URL` | URL du frontend |

## Health check

`GET /health`
