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
Instanz, die nicht in `INSTANZEN` steht, wird nicht gesichert. Die `stack.env`
geht verschluesselt mit, Passphrase in `PASSPHRASE_DATEI` (nur root, bleibt auf
dem Server). Zurueckholen:
`openssl enc -d -aes-256-cbc -pbkdf2 -in secrets_<stand>.tar.gz.enc -pass file:<passphrase> | tar xzf -`
