# Ausrollen

```bash
./deploy/deploy.sh test            # immer zuerst
./deploy/deploy.sh dithmarschen    # Referenz, erst wenn Test sauber laeuft
./deploy/deploy.sh alle [--pruefen]
```

Umgebung: `KKD_SSH_HOST`, `KKD_SSH_PASS` (oder `deploy/lokal.env`, ignoriert).
Je Instanz eine `deploy/instanzen/<name>.env` (ignoriert) mit `HOST`, `PFAD`,
`MODUS` (`image`|`build`), `COMPOSE_BEFEHL`, `COMPOSE_DATEI`, `URL`,
`DB_CONTAINER`, `DB_NAME`. Keine Zugangsdaten darin, die liest das Skript aus
der `stack.env` auf dem Server.

`backup.sh` laeuft per Cron auf dem Server; Ziel in `BACKUP_SFTP_ZIEL`. Eine
Instanz, die nicht in `INSTANZEN` steht, wird nicht gesichert.
