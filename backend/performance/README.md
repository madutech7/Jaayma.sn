# Tests de charge avec k6

Les scénarios ciblent l'API publique Jaayma. Le test de charge envoie des requêtes GET sur `/health`, `/shops/explore` et `/products/explore` : il ne crée ni commande ni paiement.

## Installation de k6 sur Windows

Installer k6 avec Winget, puis vérifier l'installation :

```powershell
winget install k6 --source winget
k6 version
```

Voir aussi la [documentation officielle d'installation de k6](https://grafana.com/docs/k6/latest/set-up/install-k6/).

## Lancer le profil de montée en charge

Démarrer d'abord l'API localement avec une base de données de développement configurée dans `backend/.env` :

```powershell
cd backend
npm run start:dev
```

Dans un autre terminal, depuis la racine du dépôt :

```powershell
k6 run backend/performance/k6/jaayma-load-test.js
```

Par défaut, le test cible `http://127.0.0.1:4000` et monte progressivement jusqu'à 20 utilisateurs virtuels sur environ cinq minutes. Les résultats incluent le taux d'erreur, les contrôles de réponse et les latences par endpoint.

Pour choisir un autre nombre d'utilisateurs virtuels ou une API de test autorisée :

```powershell
$env:API_URL = "https://<api-de-test>"
$env:MAX_VUS = "10"
k6 run backend/performance/k6/jaayma-load-test.js
```

Le profil est implémenté avec l'executor `ramping-vus` de k6 et des seuils de latence / erreurs. Commencer par une cible locale ou de staging : une montée en charge peut dégrader le service testé. Ne lancer un test sur la production qu'avec une fenêtre et une intensité validées.

## Vérification rapide

`k6/jaayma-public-smoke.js` est un contrôle léger des endpoints publics, avec seulement 1 à 3 utilisateurs virtuels. Il ne remplace pas le profil de charge ci-dessus.

Documentation k6 : [scénarios et profils de charge](https://grafana.com/docs/k6/latest/using-k6/scenarios/).
