# 42 Logtime Tracker

Extension navigateur (Firefox + Chrome) qui suit ton logtime du mois en cours par rapport à un objectif quotidien dérivé de ton objectif mensuel.

## Affichage

```
┌─────────────────────────────┐
│ OBJECTIF  300 h          ⚙ │
├─────────────────┬───────────┤
│                 │ PAR JOUR  │
│      +12.4      │  10.00 h  │
│        h        │           │
│     AVANCE      │ FAIT      │
│                 │  85.3 h   │
│                 │           │
│                 │ ATTENDU   │
│                 │  72.9 h   │
│                 │           │
│                 │ JOUR      │
│                 │  7 / 31   │
├─────────────────┴───────────┤
│ il y a 5s         refresh   │
└─────────────────────────────┘
```

- Vert + signe `+` quand tu es en avance
- Rouge + signe `−` quand tu es en retard
- Calcul : `delta = heures_faites_ce_mois − (objectif_mensuel / jours_du_mois × jour_actuel)`

## Installation

### Firefox (dev)
1. `about:debugging#/runtime/this-firefox`
2. "Charger un module complémentaire temporaire..."
3. Sélectionner `manifest.json`

### Chrome (dev)
1. `chrome://extensions`
2. Activer "Mode développeur"
3. "Charger l'extension non empaquetée"
4. Sélectionner le dossier `ft-logtime-tracker/`

### Persistance Firefox
Les extensions temporaires disparaissent à chaque redémarrage. Pour une install permanente :
```bash
cd ft-logtime-tracker
zip -r ../ft-logtime.xpi .
```
Puis self-host le `.xpi` ou utilise Firefox Developer Edition / Nightly (qui acceptent les extensions non signées via `xpinstall.signatures.required = false` dans `about:config`).

## Configuration

Au premier lancement, clic sur l'icône → settings :
- **login 42** : ton login intra (ex: `tdameros`)
- **client uid** : l'UID de ton app sur `profile.intra.42.fr/oauth/applications`
- **client secret** : le secret de la même app
- **objectif mensuel** : nombre d'heures cible (ex: `300`)

Clic sur **tester** pour vérifier que les creds marchent. Puis **sauvegarder**.

## Architecture

- `manifest.json` — manifest v3, cross-browser via `browser_specific_settings`
- `background.js` — service worker : OAuth2 client credentials flow, cache de token (7200s), appel `/v2/users/:login/locations_stats`
- `popup.html/css/js` — UI popup
- Stockage : `browser.storage.local` (jamais sync, donc le secret ne quitte pas la machine)

## Endpoint utilisé

`GET /v2/users/:login/locations_stats?begin_at=YYYY-MM-DD&end_at=YYYY-MM-DD`

Retourne `{ "YYYY-MM-DD": "HH:MM:SS.fraction", ... }`. On somme les durées pour les jours du mois courant.

## Sécurité

- Le `client_secret` est stocké dans `browser.storage.local` — accessible uniquement par cette extension, sur cette machine. Pas de sync cloud.
- Aucune requête sortante en dehors de `api.intra.42.fr` (déclaré dans `host_permissions`).
- **Ne publie pas l'extension sur le Mozilla Add-ons Store** : le secret serait inclus dans le bundle. Reste en install locale.
- **Régénère immédiatement** la clé que tu as partagée dans le chat (`profile.intra.42.fr` → ton app → "regenerate secret").

## Limites connues

- L'API renvoie par défaut les 4 derniers mois. Si ton objectif change en cours de mois, le calcul se base sur l'objectif courant pour tout le mois.
- Le calcul "expected" compte le jour en cours comme un jour plein. Donc à 9h du matin le 7, tu es "censé" avoir fait `7 × daily_target` heures. À toi de voir si tu préfères compter `(currentDay − 1)` (plus indulgent).
- Rate limit 42 : 2 req/s, 1200 req/h. Largement suffisant.
