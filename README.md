<div align="center">

<img src="icons/icon-128.png" alt="42 Logtime Tracker" width="96" height="96" />

# 42 Logtime Tracker

**Track your monthly 42 logtime against a daily target — straight from your browser toolbar.**

[![Firefox](https://img.shields.io/badge/Firefox-109%2B-FF7139?style=flat-square&logo=firefox-browser&logoColor=white)](#installation)
[![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](#installation)
[![Manifest v3](https://img.shields.io/badge/manifest-v3-blueviolet?style=flat-square)](manifest.json)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](#licence)
[![Made for 42](https://img.shields.io/badge/made%20for-42-000?style=flat-square)](https://42.fr)

[Installation](#installation) · [Aperçu](#aperçu) · [Configuration](#configuration) · [Architecture](#architecture) · [Sécurité](#sécurité)

</div>

---

## Pourquoi

Suivre son objectif mensuel de logtime sur l'intra demande de cumuler manuellement les jours et faire la règle de trois. Cette extension le fait à ta place, à chaque ouverture de popup, en allant chercher les données via l'API 42.

- **Delta en temps réel** : combien d'heures tu es en avance ou en retard sur le rythme attendu.
- **Cible journalière** : ton objectif mensuel ramené à un nombre d'heures par jour.
- **Léger** : un seul endpoint, un cache de token OAuth, aucune dépendance externe.

---

## Aperçu

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

| État | Couleur | Signe |
|---|---|---|
| En avance | vert | `+` |
| En retard | rouge | `−` |

**Formule** :
```
delta = heures_du_mois − (objectif_mensuel / jours_du_mois × jour_actuel)
```

---

## Installation

### Firefox — install permanente (recommandé)

L'extension est packagée en `.xpi` signé : install en un clic, persistante au redémarrage.

[![Télécharger pour Firefox](https://img.shields.io/badge/Télécharger%20le%20.xpi-Install%20permanente-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white)](#installation)

> 📌 **TODO** — Remplacer le lien du badge ci-dessus par l'URL du `.xpi` signé (ex: `https://github.com/Thomasrbm/Extension_42_logtime_objectif/releases/latest/download/ft-logtime.xpi`).

1. Clique sur le bouton ci-dessus pour télécharger le `.xpi`.
2. Firefox détecte le fichier et propose l'installation — clique sur **Ajouter**.
3. Clique sur l'icône de l'extension dans la barre, puis sur ⚙ pour la configurer.

### Chrome / Chromium / Brave — install rapide

Une commande, un dossier prêt, plus qu'à charger dans `chrome://extensions`.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Thomasrbm/Extension_42_logtime_objectif/main/install.sh)
```

Le script clone le repo dans `~/.local/share/ft-logtime-tracker/` et ouvre la page d'extensions. Active le **Mode développeur**, clique sur **Charger l'extension non empaquetée**, et sélectionne le dossier indiqué.

### Installation manuelle

<details>
<summary><strong>Firefox (mode développeur)</strong></summary>

```
1. Ouvre about:debugging#/runtime/this-firefox
2. « Charger un module complémentaire temporaire… »
3. Sélectionne manifest.json dans le dossier cloné
```

> L'extension chargée en mode temporaire disparaît au redémarrage. Utilise le `.xpi` signé pour une install permanente.

</details>

<details>
<summary><strong>Chrome / Chromium / Brave</strong></summary>

```
1. Ouvre chrome://extensions
2. Active le « Mode développeur »
3. « Charger l'extension non empaquetée »
4. Sélectionne le dossier de l'extension
```

</details>

---

## Configuration

Au premier lancement, clique sur l'icône puis sur l'engrenage ⚙ :

| Champ | Description | Exemple |
|---|---|---|
| **login 42** | Ton login intra | `tdameros` |
| **client uid** | UID de ton app OAuth sur [profile.intra.42.fr/oauth/applications](https://profile.intra.42.fr/oauth/applications) | `u-s4t2ud-...` |
| **client secret** | Secret OAuth de la même app | `s-s4t2ud-...` |
| **objectif mensuel** | Heures cible pour le mois | `300` |

Clique sur **tester** pour valider les credentials, puis sur **sauvegarder**.

### Créer une app OAuth 42

1. Va sur [profile.intra.42.fr/oauth/applications](https://profile.intra.42.fr/oauth/applications).
2. **New Application** → renseigne un nom (ex: *Logtime Tracker*) et n'importe quelle redirect URI (non utilisée).
3. Récupère `UID` et `SECRET` une fois l'app créée.
4. Aucun scope particulier requis : `public` suffit.

---

## Architecture

```
.
├── manifest.json     manifest v3, cross-browser via browser_specific_settings
├── background.js     service worker — OAuth2 client credentials, cache token 7200s, fetch locations_stats
├── popup.html        markup popup (vue principale + vue settings)
├── popup.css         styling
├── popup.js          logique UI + appels au background
├── icons/            16/48/128
└── install.sh        installer Chrome/dev
```

### Endpoint utilisé

```http
GET /v2/users/:login/locations_stats?begin_at=YYYY-MM-DD&end_at=YYYY-MM-DD
```

Renvoie un objet `{ "YYYY-MM-DD": "HH:MM:SS.fraction", ... }`. Les durées des jours du mois courant sont sommées côté client.

### Stockage

- `browser.storage.local` uniquement.
- Le `client_secret` ne quitte **jamais** la machine, jamais synchronisé en cloud.

---

## Sécurité

- 🔒 **Local-only** : credentials stockés dans `browser.storage.local`, isolés par origine d'extension.
- 🚫 **Aucune télémétrie** : la seule requête sortante va vers `api.intra.42.fr` (déclaré dans `host_permissions`).
- ⚠️ **Ne pas publier sur AMO / Chrome Web Store** : le bundle ne contient pas les secrets (chacun met les siens), mais reste un usage personnel — pas un produit grand public.
- 🔁 Si tu as **partagé ton secret** quelque part par accident : régénère-le immédiatement via *profile.intra.42.fr → ton app → Regenerate Secret*.

---

## Limitations connues

- L'API 42 ne retourne que les **4 derniers mois** par défaut — suffisant pour le mois courant.
- Le calcul **expected** compte le jour en cours comme un jour plein : à 9 h du matin le 7, tu es "censé" avoir fait `7 × daily_target` heures. Pour un comportement plus indulgent, modifie la formule dans `popup.js` en `(currentDay − 1)`.
- **Rate limit 42** : 2 req/s, 1200 req/h — largement sous le seuil (1 appel par ouverture de popup, token caché 2 h).
- Si ton objectif change en cours de mois, le calcul utilise l'objectif courant rétroactivement sur tout le mois.

---

## Développement

```bash
git clone https://github.com/Thomasrbm/Extension_42_logtime_objectif
cd Extension_42_logtime_objectif

# Firefox dev
firefox about:debugging#/runtime/this-firefox
# → Charger un module temporaire → manifest.json

# Build du .xpi (non signé)
zip -r ft-logtime.xpi . -x ".git/*" -x "install.sh" -x "README.md"
```

Pour signer le `.xpi` et obtenir une install permanente, voir [extensionworkshop.com/documentation/publish/signing-and-distribution-overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

---

## Licence

MIT — voir [`LICENSE`](LICENSE) si présent, sinon usage libre dans le cadre du cursus 42.

<div align="center">
<sub>Built with ☕ at 42 — not affiliated with 42 SAS.</sub>
</div>
