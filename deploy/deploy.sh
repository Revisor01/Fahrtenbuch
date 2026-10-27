#!/usr/bin/env bash
# Fahrtenbuch ausrollen: ./deploy/deploy.sh test|dithmarschen|alle|<name> [--pruefen]
# Deploy-Skript statt Portainer-Webhook: auf dem Zielserver laeuft kein Portainer.

set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANZ_VERZEICHNIS="$HIER/instanzen"
# Hosts und Zugangsdaten aus der Umgebung oder deploy/lokal.env.
[[ -f "$HIER/lokal.env" ]] && source "$HIER/lokal.env"

ROT=$'\033[0;31m'; GRUEN=$'\033[0;32m'; GELB=$'\033[0;33m'; GRAU=$'\033[0;90m'; AUS=$'\033[0m'

melde()  { printf '%s\n' "$*"; }
schritt(){ printf '%s→%s %s\n' "$GRAU" "$AUS" "$*"; }
gut()    { printf '%s✓%s %s\n' "$GRUEN" "$AUS" "$*"; }
warn()   { printf '%s!%s %s\n' "$GELB" "$AUS" "$*"; }
fehler() { printf '%s✗%s %s\n' "$ROT" "$AUS" "$*" >&2; }

abbruch() { fehler "$1"; exit 1; }

# ---------------------------------------------------------------- Hilfsmittel

# Passwort nur aus der Umgebung.
fern() {
  local host="$1"; shift
  if [[ -n "${KKD_SSH_HOST:-}" && "$host" == *"$KKD_SSH_HOST"* && -n "${KKD_SSH_PASS:-}" ]]; then
    sshpass -p "$KKD_SSH_PASS" ssh -o StrictHostKeyChecking=no "$host" "$@"
  else
    ssh -o StrictHostKeyChecking=no "$host" "$@"
  fi
}

# Startseite und API, ein laufender Webserver allein sagt nichts.
erreichbar() {
  local url="$1"
  local start api
  start=$(curl -s -m 20 -o /dev/null -w '%{http_code}' "$url/" || echo 000)
  api=$(curl -s -m 20 -o /dev/null -w '%{http_code}' "$url/api/instanzen" || echo 000)
  [[ "$start" == "200" && "$api" == "200" ]]
}

instanz_laden() {
  local name="$1"
  local datei="$INSTANZ_VERZEICHNIS/$name.env"
  [[ -f "$datei" ]] || abbruch "Unbekannte Instanz: $name (erwartet: $datei)"

  NAME=""; HOST=""; PFAD=""; MODUS=""; COMPOSE_DATEI=""; COMPOSE_BEFEHL=""
  URL=""; DB_CONTAINER=""; DB_NAME=""
  # shellcheck disable=SC1090
  source "$datei"

  [[ -n "$HOST" && -n "$PFAD" && -n "$URL" ]] || abbruch "$datei ist unvollstaendig"
  COMPOSE_BEFEHL="${COMPOSE_BEFEHL:-docker compose}"
  COMPOSE_DATEI="${COMPOSE_DATEI:-docker-compose.yml}"
  MODUS="${MODUS:-image}"
}

# ------------------------------------------------------------------- Aktionen

# Nur bei Instanzen mit DB_CONTAINER.
datenbank_sichern() {
  [[ -n "$DB_CONTAINER" ]] || return 0

  schritt "Datenbank sichern"
  local ziel="/opt/backups/vor-deploy"
  local stand
  stand=$(fern "$HOST" "
    set -e
    mkdir -p $ziel
    datei=$ziel/${DB_NAME}_vor-deploy_\$(date +%Y%m%d-%H%M%S).sql.gz
    # DB_USER statt root, fuer den Dump der eigenen Datenbank genuegt das.
    nutzer=\$(grep -m1 '^DB_USER=' $PFAD/stack.env | cut -d= -f2-)
    kennwort=\$(grep -m1 '^DB_PASSWORD=' $PFAD/stack.env | cut -d= -f2-)
    docker exec $DB_CONTAINER mysqldump -u \"\$nutzer\" -p\"\$kennwort\" \
      --single-transaction $DB_NAME 2>/dev/null | gzip > \$datei
    # Ein Dump, der nichts enthaelt, ist schlimmer als keiner — er taeuscht.
    [ -s \$datei ] || { echo LEER; exit 1; }
    echo \"\$(basename \$datei) (\$(du -h \$datei | cut -f1))\"
    # Nur die letzten zehn behalten, sonst laeuft die Platte voll.
    ls -t $ziel/${DB_NAME}_vor-deploy_*.sql.gz | tail -n +11 | xargs -r rm
  ") || abbruch "Sicherung fehlgeschlagen — Deploy abgebrochen, nichts veraendert"

  gut "gesichert: $stand"
}

# Vorher und nachher verglichen, der Deploy darf keine Daten anfassen.
datenstand() {
  [[ -n "$DB_CONTAINER" ]] || { echo ""; return 0; }
  fern "$HOST" "
    nutzer=\$(grep -m1 '^DB_USER=' $PFAD/stack.env | cut -d= -f2-)
    kennwort=\$(grep -m1 '^DB_PASSWORD=' $PFAD/stack.env | cut -d= -f2-)
    docker exec $DB_CONTAINER mysql -u \"\$nutzer\" -p\"\$kennwort\" \
      -N -e 'SELECT CONCAT((SELECT COUNT(*) FROM $DB_NAME.users), \"/\", (SELECT COUNT(*) FROM $DB_NAME.fahrten));' 2>/dev/null
  " 2>/dev/null || echo ""
}

ausrollen() {
  local instanz="$1"
  instanz_laden "$instanz"

  melde ""
  melde "── $NAME ──────────────────────────────"

  # War sie vorher schon aus, sagt ein Ausfall danach nichts ueber den Deploy.
  local lief_vorher="nein"
  erreichbar "$URL" && lief_vorher="ja"
  schritt "Zustand vorher: $([ "$lief_vorher" = ja ] && echo "laeuft" || echo "antwortet nicht")"

  local vorher
  vorher=$(datenstand)
  [[ -n "$vorher" ]] && schritt "Datenstand vorher: $vorher (Nutzer/Fahrten)"

  datenbank_sichern

  if [[ "$MODUS" == "build" ]]; then
    schritt "Repo aktualisieren und bauen"
    fern "$HOST" "
      set -e
      cd $PFAD/repo
      git fetch origin --quiet
      git checkout master --quiet
      git pull origin master --quiet
      echo \"  Stand: \$(git log --oneline -1)\"
      cd $PFAD
      $COMPOSE_BEFEHL -f $COMPOSE_DATEI build 2>&1 | tail -3
    " || abbruch "Bauen fehlgeschlagen"
  else
    schritt "Images ziehen"
    fern "$HOST" "
      set -e
      cd $PFAD
      $COMPOSE_BEFEHL -f $COMPOSE_DATEI pull 2>&1 | grep -Ei 'pull|download|error' | tail -4 || true
    " || abbruch "Images ziehen fehlgeschlagen"
  fi

  # --force-recreate, sonst meldet Compose bei frischem Image „is up-to-date“ und laesst den alten Container laufen.
  schritt "Container neu erstellen"
  fern "$HOST" "
    set -e
    cd $PFAD
    $COMPOSE_BEFEHL -f $COMPOSE_DATEI up -d --force-recreate 2>&1 | tail -6
  " || abbruch "Neustart fehlgeschlagen"

  # Sonst meldet der Deploy Erfolg, waehrend der Container in einer Neustartschleife haengt.
  schritt "Warten, bis die Instanz antwortet"
  local versuch=0
  until erreichbar "$URL"; do
    versuch=$((versuch + 1))
    if [[ $versuch -ge 20 ]]; then
      fehler "$NAME antwortet nach 100 Sekunden nicht ($URL)"
      fern "$HOST" "cd $PFAD && $COMPOSE_BEFEHL -f $COMPOSE_DATEI logs --tail 25 backend 2>&1" || true
      abbruch "Deploy fehlgeschlagen — Logs oben"
    fi
    sleep 5
  done
  gut "antwortet: $URL"

  # Container muss nach dem Bau seines Images gestartet sein; in Sekunden verglichen, weil Docker StartedAt in UTC und Created in Ortszeit ausgibt.
  schritt "Pruefen, ob der neue Stand laeuft"
  local alt
  # Ueber stdin, damit die lokale Shell nichts auswertet, was drueben ausgewertet werden soll.
  alt=$(fern "$HOST" 'bash -s' <<'FERNSKRIPT' 2>/dev/null || echo ""
for c in $(docker ps --format '{{.Names}}' | grep -i fahrtenbuch | grep -vi db); do
  img=$(docker inspect "$c" --format '{{.Image}}')
  gestartet=$(date -d "$(docker inspect "$c" --format '{{.State.StartedAt}}')" +%s 2>/dev/null || echo 0)
  gebaut=$(date -d "$(docker inspect "$img" --format '{{.Created}}')" +%s 2>/dev/null || echo 0)
  if [ "$gestartet" -lt "$gebaut" ]; then echo "$c"; fi
done
FERNSKRIPT
)

  if [[ -n "$alt" ]]; then
    fehler "Diese Container laufen noch mit einem aelteren Image als dem gebauten:"
    printf '  %s\n' $alt >&2
    abbruch "Der neue Stand ist NICHT aktiv"
  fi
  gut "alle Container laufen mit dem neuen Image"

  # Nachher: Der Deploy darf die Daten nicht angefasst haben.
  if [[ -n "$vorher" ]]; then
    local nachher
    nachher=$(datenstand)
    if [[ "$vorher" == "$nachher" ]]; then
      gut "Datenstand unveraendert: $nachher"
    else
      warn "Datenstand vorher $vorher, jetzt $nachher — nachsehen!"
    fi
  fi

  local stand
  stand=$(curl -s -m 15 "$URL/api/instanzen" | head -c 60)
  schritt "Verzeichnis antwortet: ${stand}…"

  gut "$NAME ist auf dem neuen Stand"
}

pruefen() {
  local instanz="$1"
  instanz_laden "$instanz"
  printf '%-26s ' "$NAME"
  if erreichbar "$URL"; then
    local bild
    bild=$(fern "$HOST" "cd $PFAD && docker ps --filter name=fahrtenbuch --format '{{.Status}}' | head -1" 2>/dev/null || echo "?")
    printf '%s✓%s  %s  %s\n' "$GRUEN" "$AUS" "$URL" "$GRAU$bild$AUS"
  else
    printf '%s✗%s  %s antwortet nicht\n' "$ROT" "$AUS" "$URL"
    return 1
  fi
}

alle_instanzen() {
  find "$INSTANZ_VERZEICHNIS" -name '*.env' -exec basename {} .env \; | sort
}

# ---------------------------------------------------------------------- Start

ZIEL="${1:-}"
MODUS_ARG="${2:-}"

[[ -n "$ZIEL" ]] || {
  melde "Verwendung: $0 <instanz|alle> [--pruefen]"
  melde ""
  melde "Instanzen:"
  for i in $(alle_instanzen); do melde "  $i"; done
  exit 1
}

if [[ "$MODUS_ARG" == "--pruefen" ]]; then
  fehlt=0
  if [[ "$ZIEL" == "alle" ]]; then
    for i in $(alle_instanzen); do pruefen "$i" || fehlt=1; done
  else
    pruefen "$ZIEL" || fehlt=1
  fi
  exit $fehlt
fi

if [[ "$ZIEL" == "alle" ]]; then
  # Test und Dithmarschen laufen bewusst einzeln und vorab.
  for i in $(alle_instanzen); do
    [[ "$i" == "test" || "$i" == "dithmarschen" ]] && continue
    ausrollen "$i"
  done
  melde ""
  gut "Alle uebrigen Instanzen sind auf dem neuen Stand"
else
  ausrollen "$ZIEL"
fi
