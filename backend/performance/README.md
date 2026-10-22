# Tests de charge avec k6

Les scénarios ciblent l'API publique Jaayma. Le profil de montée en charge n'envoie que des requêtes GET et ne crée ni commande ni paiement. `/health` sert uniquement au contrôle préalable, pas au parcours des VU, car cette route ne lit pas Neon.

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

Par défaut, le test cible `http://127.0.0.1:4000` et monte progressivement jusqu'à 20 utilisateurs virtuels sur environ cinq minutes. Chaque VU simule une session qui consulte les boutiques et les produits ; environ un parcours sur quatre ouvre la deuxième page produits. Les contrôles vérifient aussi que les réponses contiennent un tableau `items`.

Un VU est une session active simultanée, pas un vendeur, un visiteur unique ou un nombre d'utilisateurs par jour. Le nombre de requêtes dépend des pauses et du parcours. Le profil teste surtout les lectures de catalogue ; il ne mesure pas les commandes, les paiements ni les actions d'écriture.

Chaque réponse non-200 affiche l'endpoint, le statut HTTP, la durée, le type de contenu et un extrait limité du corps. Le rapport sépare aussi l'attente de connexion, le temps avant le premier octet (TTFB), la connexion/TLS, l'envoi et la réception du corps. `http_req_duration` mesure la durée de la requête côté k6 ; le TTFB inclut encore le trajet réseau et ne représente donc pas uniquement le temps CPU du serveur.

Le pool Prisma est réglé par `PRISMA_CONNECTION_LIMIT` (15 par défaut dans la configuration du projet). Cette limite s'applique à chaque processus API : avec plusieurs instances, additionner leurs limites avant de choisir la valeur. Augmenter `pool_timeout` seul retarde les erreurs `P2024` sans augmenter le débit.

Les endpoints publics d'exploration gardent les résultats identiques pendant 15 secondes par processus et mutualisent les requêtes identiques simultanées. Le cache est borné à 128 paramètres différents et les réponses d'erreur ne sont pas gardées. Les changements de boutiques et produits peuvent donc mettre au plus 15 secondes à apparaître sur une instance API.

Pour mesurer la limite, commencer par 3 à 5 VU, puis augmenter par petits paliers en surveillant le p95, `http_req_failed`, Neon et les journaux Render. Arrêter la montée si les erreurs apparaissent ou si la latence devient instable. Un résultat sans erreur HTTP mais avec des seuils p95 dépassés signifie que l'API répond, mais trop lentement selon les objectifs du profil. Le test par défaut sollicite directement l'API et contourne le cache de la couche web.

Pour choisir un autre nombre d'utilisateurs virtuels ou une API de test autorisée :

```powershell
$env:API_URL = "https://<api-de-test>"
$env:MAX_VUS = "10"
k6 run backend/performance/k6/jaayma-load-test.js
```

Le profil est implémenté avec l'executor `ramping-vus` de k6 et des seuils de latence / erreurs. Commencer par une cible locale ou de staging : une montée en charge peut dégrader le service testé. Ne lancer un test sur la production qu'avec une fenêtre et une intensité validées.

## Profil de sessions visiteurs, acheteurs et vendeurs

`k6/jaayma-user-capacity.js` simule des sessions actives avec des pauses de navigation : environ 50 % de visiteurs, 33 % d'acheteurs en consultation et 17 % de vendeurs. À 30 VU, cela donne 15 visiteurs, 10 acheteurs et 5 vendeurs simultanés. Le parcours vendeur lit la boutique, ses produits et ses commandes. Les acheteurs consultent le catalogue, sans créer de commande ni déclencher de paiement.

Ce profil exige une boutique, un produit et un compte vendeur de test présents dans la base cible. Renseigner les identifiants de cette fixture ainsi que le `JWT_SECRET` correspondant à l'API :

```powershell
$env:TEST_SHOP_ID = "<id boutique de test>"
$env:TEST_SHOP_SLUG = "<slug boutique de test>"
$env:TEST_OWNER_ID = "<id vendeur de test>"
$env:TEST_PRODUCT_ID = "<id produit de test>"
$env:JWT_SECRET = "<secret de session de l'API de test>"
$env:MAX_USERS = "30"
k6 run backend/performance/k6/jaayma-user-capacity.js
```

Un VU représente une session active simulée pendant le parcours, pas une visite unique ou un utilisateur quotidien. Le profil ne couvre pas l'envoi de commande, les paiements, les pics du frontend ni la capacité de Render si k6 cible l'API locale.

## Vérification rapide

`k6/jaayma-public-smoke.js` est un contrôle léger des endpoints publics, avec seulement 1 à 3 utilisateurs virtuels. Il ne remplace pas le profil de charge ci-dessus.

Documentation k6 : [scénarios et profils de charge](https://grafana.com/docs/k6/latest/using-k6/scenarios/).
