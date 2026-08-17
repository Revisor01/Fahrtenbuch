#!/usr/bin/env bash
#
# Naechtliche Sicherung aller Fahrtenbuch-Datenbanken auf diesem Server.
#
# Laeuft per Cron auf dem jeweiligen Server, nicht vom Arbeitsplatz aus:
#   0 3 * * * /opt/backups/backup.sh
#
# Warum im Repo: Das bisherige Skript lag nur auf dem Server. Ging die Maschine
# verloren, waere mit ihr auch die Sicherungslogik weg gewesen. Ausserdem stand
# dort das MySQL-Root-Passwort im Klartext — hier kommen die Zugangsdaten aus
# der stack.env der jeweiligen Instanz, und ein Dump der eigenen Datenbank
# braucht kein root.
#
# Welche Instanzen gesichert werden, steht in der Liste unten. Kommt ein
# Kirchenkreis dazu, wird er dort eingetragen — sonst laeuft er ungesichert,
# und das faellt erst im Ernstfall auf.

set -uo pipefail

# ---------------------------------------------------------------- Instanzen
#
# Je Zeile: <name>|<stack-pfad>|<db-container>|<db-name>
# Der Rest (Nutzer, Passwort) kommt aus <stack-pfad>/stack.env.

INSTANZEN=(
  "dithmarschen|/opt/fahrtenbuch|fahrtenbuch-db-1|fahrtenbuch"
)

ZIEL="/opt/backups/fahrtenbuch"
LOG="/opt/backups/fahrtenbuch-backup.log"
SFTP_ZIEL="u528399-sub3@u528399-sub3.your-storagebox.de"
TAGE_LOKAL=14

# Meldung bei Fehlern. Ohne sie faellt ein stillgelegtes Backup erst auf, wenn
# man es braucht — der teuerste Zeitpunkt.
NTFY_URL="https://push.godsapp.de/fahrtenbuch"
NTFY_TOKEN_DATEI="/opt/backups/.ntfy-token"

STAND=$(date +%Y-%m-%d_%H-%M)
FEHLER=()

notiz() { echo "[$(date)] $*" >> "$LOG"; }

melde_fehler() {
  [[ -f "$NTFY_TOKEN_DATEI" ]] || return 0
  local token
  token=$(cat "$NTFY_TOKEN_DATEI")
  curl -s -m 20 \
    -H "Authorization: Bearer $token" \
    -H "Title: Fahrtenbuch-Backup fehlgeschlagen" \
    -H "Priority: high" \
    -H "Tags: warning" \
    -d "$1" "$NTFY_URL" > /dev/null || true
}

mkdir -p "$ZIEL"
notiz "── Sicherung gestartet ──"

# ------------------------------------------------------------- Datenbanken

DATEIEN=()

for eintrag in "${INSTANZEN[@]}"; do
  IFS='|' read -r name pfad container db <<< "$eintrag"

  if ! docker ps --format '{{.Names}}' | grep -qx "$container"; then
    notiz "FEHLER $name: Container $container laeuft nicht"
    FEHLER+=("$name: Datenbank-Container laeuft nicht")
    continue
  fi

  nutzer=$(grep -m1 '^DB_USER=' "$pfad/stack.env" 2>/dev/null | cut -d= -f2-)
  kennwort=$(grep -m1 '^DB_PASSWORD=' "$pfad/stack.env" 2>/dev/null | cut -d= -f2-)

  if [[ -z "$nutzer" || -z "$kennwort" ]]; then
    notiz "FEHLER $name: Zugangsdaten in $pfad/stack.env nicht gefunden"
    FEHLER+=("$name: Zugangsdaten fehlen")
    continue
  fi

  datei="${db}_${STAND}.sql.gz"
  docker exec "$container" mysqldump -u "$nutzer" -p"$kennwort" \
    --single-transaction "$db" 2>/dev/null | gzip > "$ZIEL/$datei"

  # Beide Bedingungen noetig: mysqldump kann scheitern, waehrend gzip brav eine
  # leere Datei schreibt. Ein leerer Dump ist schlimmer als gar keiner — er
  # sieht aus wie eine Sicherung.
  if [[ ${PIPESTATUS[0]} -eq 0 && -s "$ZIEL/$datei" ]]; then
    groesse=$(du -h "$ZIEL/$datei" | cut -f1)
    tabellen=$(gunzip -c "$ZIEL/$datei" | grep -c '^CREATE TABLE')
    if [[ "$tabellen" -lt 5 ]]; then
      notiz "FEHLER $name: nur $tabellen Tabellen im Dump — unvollstaendig"
      FEHLER+=("$name: Dump unvollstaendig ($tabellen Tabellen)")
    else
      notiz "OK $name: $datei ($groesse, $tabellen Tabellen)"
      DATEIEN+=("$datei")
    fi
  else
    notiz "FEHLER $name: Dump fehlgeschlagen"
    FEHLER+=("$name: Dump fehlgeschlagen")
    rm -f "$ZIEL/$datei"
  fi
done

# ------------------------------------------------------- Mailserver-Konfig

if [[ -d /opt/docker-mailserver/config ]]; then
  maildatei="mailserver-config_${STAND}.tar.gz"
  if tar czf "$ZIEL/$maildatei" -C /opt/docker-mailserver config/ 2>/dev/null; then
    notiz "OK Mailserver-Konfiguration: $maildatei"
    DATEIEN+=("$maildatei")
  else
    notiz "FEHLER Mailserver-Konfiguration"
    FEHLER+=("Mailserver-Konfiguration")
  fi
fi

# ------------------------------------------------ Auswaerts (Hetzner-Box)

if [[ ${#DATEIEN[@]} -gt 0 ]]; then
  befehle="mkdir fahrtenbuch\n"
  for d in "${DATEIEN[@]}"; do
    befehle+="put $ZIEL/$d fahrtenbuch/$d\n"
  done
  befehle+="quit\n"

  if echo -e "$befehle" | sftp -o StrictHostKeyChecking=no -P 23 "$SFTP_ZIEL" >> "$LOG" 2>&1; then
    notiz "OK auswaerts gesichert: ${#DATEIEN[@]} Datei(en)"
  else
    notiz "FEHLER beim Uebertragen zur Hetzner-Box"
    FEHLER+=("Uebertragung zur Hetzner-Box")
  fi
else
  notiz "FEHLER nichts zu uebertragen — keine Sicherung entstanden"
  FEHLER+=("keine einzige Sicherung entstanden")
fi

# ------------------------------------------------------------- Aufraeumen

find "$ZIEL" -name '*.sql.gz' -mtime +$TAGE_LOKAL -delete
find "$ZIEL" -name 'mailserver-config_*.tar.gz' -mtime +$TAGE_LOKAL -delete

# --------------------------------------------------------------- Abschluss

if [[ ${#FEHLER[@]} -gt 0 ]]; then
  notiz "── mit ${#FEHLER[@]} Fehler(n) beendet ──"
  melde_fehler "$(printf '%s\n' "${FEHLER[@]}")"
  exit 1
fi

notiz "── abgeschlossen, alles in Ordnung ──"
exit 0
