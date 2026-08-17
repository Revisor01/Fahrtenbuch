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
