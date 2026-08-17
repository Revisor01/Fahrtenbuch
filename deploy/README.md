# Ausrollen

```bash
export KKD_SSH_PASS='…'          # nur fuer Dithmarschen noetig

./deploy/deploy.sh test           # immer zuerst
./deploy/deploy.sh dithmarschen   # Referenz — erst wenn Test sauber laeuft
./deploy/deploy.sh alle           # uebrige Kirchenkreise

./deploy/deploy.sh alle --pruefen # nur nachsehen, aendert nichts
```

Das Skript sichert vor dem Ausrollen die Datenbank, prueft danach, ob die
Instanz antwortet, ob die Container mit dem **neuen** Image laufen, und ob der
Datenstand unveraendert ist. Bei jedem Fehler bricht es ab.

## Eine Instanz hinzufuegen

Eine Datei `instanzen/<name>.env` anlegen — `dithmarschen.env` als Vorlage:

| Feld | Bedeutung |
|---|---|
| `HOST` | `benutzer@server` fuer SSH |
| `PFAD` | Verzeichnis des Stacks auf dem Server |
| `MODUS` | `image` (Docker Hub) oder `build` (aus `$PFAD/repo`) |
| `COMPOSE_BEFEHL` | `docker compose` (v2+) oder `docker-compose` (v1) |
| `COMPOSE_DATEI` | meist `docker-compose.yml` |
| `URL` | wird nach dem Start geprueft |
| `DB_CONTAINER`, `DB_NAME` | nur bei echten Daten — dann wird vorher gesichert |

**Keine Zugangsdaten in diese Dateien.** Passwoerter stehen in der `stack.env`
auf dem jeweiligen Server; das Skript liest sie dort.

Neue Instanzen werden von `alle` automatisch erfasst. `test` und
`dithmarschen` sind davon ausgenommen — die laufen bewusst einzeln und vorab.

## Wenn etwas schiefgeht

Die Sicherung vor dem letzten Deploy liegt auf dem Server unter
`/opt/backups/vor-deploy/` (die letzten zehn). Zurueckspielen:

```bash
gunzip -c /opt/backups/vor-deploy/<datei>.sql.gz \
  | docker exec -i <db-container> mysql -u <nutzer> -p<kennwort> <datenbank>
```

Am 17.08.2026 einmal vollstaendig durchgespielt: 14 Tabellen, keine verwaisten
Verweise. Sollte nach groesseren Aenderungen am Schema wiederholt werden.

## Sicherung

`backup.sh` laeuft per Cron auf dem jeweiligen Server (KKD: taeglich 3:00,
`/opt/backups/backup.sh`). Es sichert alle Datenbanken, die in der Liste am
Anfang des Skripts stehen, plus die Mailserver-Konfiguration, und schiebt alles
zur Hetzner-Box.

**Einen Kirchenkreis aufnehmen** — Zeile in `INSTANZEN` ergaenzen:

```
"rantzau|/opt/fahrtenbuch-rantzau|fahrtenbuch-rantzau-db-1|fahrtenbuch_rantzau"
```

Danach das Skript auf den Server kopieren:

```bash
scp deploy/backup.sh root@<server>:/opt/backups/backup.sh
```

**Wer nicht in der Liste steht, wird nicht gesichert** — und das faellt erst im
Ernstfall auf. Deshalb gehoert der Eintrag zum Aufsetzen einer Instanz dazu.

### Was das Skript prueft

- Laeuft der Datenbank-Container ueberhaupt?
- Sind Zugangsdaten in der `stack.env` zu finden?
- Ist der Dump nicht leer und enthaelt mindestens fuenf Tabellen? Ein leerer
  Dump ist schlimmer als keiner — er sieht aus wie eine Sicherung.
- Kam die Uebertragung zur Hetzner-Box durch?

Bei jedem Fehler: Eintrag im Log, Push an `push.godsapp.de/fahrtenbuch` und
Rueckgabewert 1. Laeuft alles, meldet sich nichts.

Das Token dafuer liegt auf dem Server unter `/opt/backups/.ntfy-token`
(nur root lesbar), nicht im Repo.
