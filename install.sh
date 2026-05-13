#!/usr/bin/env bash
# 42 Logtime Tracker — installer
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/Thomasrbm/Extension_42_logtime_objectif/main/install.sh)

set -euo pipefail

REPO_URL="https://github.com/Thomasrbm/Extension_42_logtime_objectif"
RAW_URL="https://raw.githubusercontent.com/Thomasrbm/Extension_42_logtime_objectif/main"
BRANCH="main"
INSTALL_DIR="${HOME}/.local/share/ft-logtime-tracker"

c_g="$(printf '\033[1;32m')"; c_b="$(printf '\033[1;34m')"
c_y="$(printf '\033[1;33m')"; c_r="$(printf '\033[1;31m')"
c_d="$(printf '\033[2m')";    c_x="$(printf '\033[0m')"

say()  { printf "%s→%s %s\n"   "$c_b" "$c_x" "$*"; }
ok()   { printf "%s✓%s %s\n"   "$c_g" "$c_x" "$*"; }
warn() { printf "%s!%s %s\n"   "$c_y" "$c_x" "$*"; }
die()  { printf "%s✗%s %s\n"   "$c_r" "$c_x" "$*" >&2; exit 1; }

command -v zip  >/dev/null 2>&1 || die "Il faut 'zip' (sudo apt install zip / brew install zip)"
command -v curl >/dev/null 2>&1 || die "Il faut 'curl'"

say "Téléchargement de l'extension dans $INSTALL_DIR"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

if command -v git >/dev/null 2>&1; then
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR" >/dev/null 2>&1 \
    || die "git clone a échoué"
else
  curl -fsSL "$REPO_URL/archive/refs/heads/$BRANCH.tar.gz" \
    | tar xz --strip-components=1 -C "$INSTALL_DIR" \
    || die "Téléchargement du tarball a échoué"
fi
ok "Sources prêtes"

say "Build du .xpi pour Firefox"
( cd "$INSTALL_DIR" && zip -qr ft-logtime.xpi . -x ".git/*" -x "install.sh" -x "README.md" )
ok "XPI: $INSTALL_DIR/ft-logtime.xpi"

detect_browser() {
  if [[ "$(uname)" == "Darwin" ]]; then
    for app in "Firefox" "Google Chrome" "Chromium" "Brave Browser"; do
      [[ -d "/Applications/$app.app" ]] && { echo "mac:$app"; return; }
    done
  else
    for b in firefox chromium chromium-browser google-chrome chrome brave-browser; do
      command -v "$b" >/dev/null 2>&1 && { echo "linux:$b"; return; }
    done
  fi
}

BROWSER="$(detect_browser || true)"
PLATFORM="${BROWSER%%:*}"
BIN="${BROWSER##*:}"

open_url() {
  local url="$1"
  if [[ "$PLATFORM" == "mac" ]]; then
    open -a "$BIN" "$url" 2>/dev/null || open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    "$BIN" "$url" >/dev/null 2>&1 & disown
  fi
}

echo
ok "Installation prête. Dernière étape manuelle (les navigateurs interdisent l'install auto) :"
echo

case "$BIN" in
  firefox|Firefox)
    say "Ouverture de Firefox sur about:debugging…"
    open_url "about:debugging#/runtime/this-firefox" || true
    cat <<EOF

  ${c_y}Dans Firefox :${c_x}
    1. Clic « Charger un module complémentaire temporaire »
    2. Sélectionner : ${c_g}$INSTALL_DIR/manifest.json${c_x}

  ${c_d}Note : l'extension disparaît au redémarrage de Firefox.
  Pour une install permanente, utilise Firefox Developer Edition + xpinstall.signatures.required=false
  puis drag & drop ${INSTALL_DIR}/ft-logtime.xpi dans la fenêtre.${c_x}
EOF
    ;;
  chromium*|google-chrome|chrome|brave-browser|"Google Chrome"|Chromium|"Brave Browser")
    say "Ouverture de $BIN sur chrome://extensions…"
    open_url "chrome://extensions" || true
    cat <<EOF

  ${c_y}Dans le navigateur :${c_x}
    1. Activer « Mode développeur » (coin haut-droit)
    2. Clic « Charger l'extension non empaquetée »
    3. Sélectionner le dossier : ${c_g}$INSTALL_DIR${c_x}
EOF
    ;;
  *)
    warn "Aucun navigateur détecté automatiquement."
    cat <<EOF

  ${c_y}Firefox :${c_x} about:debugging → « Charger un module… » → $INSTALL_DIR/manifest.json
  ${c_y}Chrome  :${c_x} chrome://extensions → mode dev → « Charger non empaquetée » → $INSTALL_DIR
EOF
    ;;
esac

echo
ok "Une fois chargée, clic sur l'icône puis ⚙ pour configurer login + creds OAuth."
