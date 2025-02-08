# Digitales Fahrtenbuch

Ein modernes, webbasiertes System zur Verwaltung und Abrechnung von Dienstfahrten. Entwickelt für Organisationen jeder Art, die eine professionelle Verwaltung ihrer Fahrtkosten benötigen.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/SimonLuthe/Fahrtenbuch)

## 🚀 Funktionen

### Fahrtenverwaltung
- Intuitive Erfassung von Dienstfahrten
- Automatische Distanzberechnung zwischen gespeicherten Orten
- Flexible Eingabe einmaliger Adressen
- Rückfahrten mit einem Klick anlegen
- Mitfahrer:innen-Management mit unterschiedlichen Fahrtrichtungen
- Umfangreiche Bearbeitungsmöglichkeiten

### Abrechnungssystem
- Mehrere Abrechnungsträger parallel verwaltbar
- Unterschiedliche Kilometersätze pro Träger
- Zeitabhängige Erstattungssätze (gültig ab einem bestimmten Datum)
- Separate Mitfahrer-Erstattungssätze
- Automatische Berechnung aller Erstattungen
- Excel-Export im Standard-Format
- Status-Tracking (eingereicht/erhalten)

### Berichtswesen
- Monats- und Jahresübersichten
- Filterung nach offenen/abgeschlossenen Abrechnungen
- Detaillierte Einzelfahrten-Auflistung
- Verschiedene Exportformate

## 💻 Technische Details

### Architektur
- Frontend: React mit TailwindCSS
- Backend: Node.js mit Express
- Datenbank: MySQL 8
- Deployment: Docker & Docker Compose
- Kommunikation über REST-API

### Sicherheit
- JWT-basierte Authentifizierung
- Rollenbasierte Zugriffskontrolle (RBAC)
- API-Key Management für externe Zugriffe
- SSL/TLS-Verschlüsselung
- Sichere Passwortspeicherung (bcrypt)
- CSRF-Schutz
- XSS-Prävention

### API Integration
- RESTful API
- Swagger/OpenAPI Dokumentation (In Planung)
- API-Key Authentifizierung
- Rate Limiting
- Vorgefertigte iOS-Shortcuts (Download-Link folgt)

## 🛠 Installation

### Voraussetzungen
- Docker & Docker Compose
- Reverse Proxy (Apache/Nginx)
- SSL-Zertifikat
- Mind. 2GB RAM
- 10GB Speicherplatz

### Quick Start

1.  Repository klonen:
    ```bash
    git clone https://github.com/your-repo/fahrtenbuch.git
    cd fahrtenbuch
    ```
2.  Konfiguration:
    ```bash
    cp .env.example .env
    nano .env
    ```
3.  Umgebungsvariablen konfigurieren:
    ```env
    # Datenbank
    DB_HOST=db
    DB_USER=fahrtenbuch
    DB_PASSWORD=secure-password
    DB_NAME=fahrtenbuch

    # JWT
    JWT_SECRET=your-secure-random-string

    # SMTP
    SMTP_HOST=smtp.example.com
    SMTP_PORT=587
    SMTP_SECURE=false
    SMTP_USER=your-user
    SMTP_PASSWORD=your-password
    MAIL_FROM=fahrtenbuch@example.com

    # Frontend
    FRONTEND_URL=https://fahrtenbuch.example.com
    APP_TITLE=Digitales Fahrtenbuch

    # Admin Account
    INITIAL_ADMIN_EMAIL=admin@example.com
    INITIAL_ADMIN_USERNAME=admin
    INITIAL_ADMIN_PASSWORD=change-me

    # Erstattungssätze
    DEFAULT_ERSTATTUNG_TRAEGER=0.30
    DEFAULT_ERSTATTUNG_MITFAHRER=0.05
    DEFAULT_ERSTATTUNG_DATUM=2024-01-01
    ```
4.  Docker Compose starten:
    ```bash
    docker-compose up -d
    ```

### Verzeichnisstruktur

```
/fahrtenbuch/
├── frontend/           # React Frontend
├── backend/            # Node.js Backend
│   ├── data/         # Uploads & Templates
│   └── migrations/    # SQL Migrations
├── db/                # Datenbank
└── docker-compose.yml
```

### Apache-Konfiguration

```apache
<VirtualHost *:443>
    ServerName fahrtenbuch.example.com

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    ProxyPreserveHost On

    # Frontend
    ProxyPass / http://localhost:9642/
    ProxyPassReverse / http://localhost:9642/

    # Backend API
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    ErrorLog ${APACHE_LOG_DIR}/fahrtenbuch_error.log
    CustomLog ${APACHE_LOG_DIR}/fahrtenbuch_access.log combined
</VirtualHost>
```

## 🔧 Wartung

### Backup
Tägliches Backup empfohlen:

1.  MySQL Datenbank
2.  Upload-Verzeichnis
3.  Konfigurationsdateien

Backup-Script:
```bash
#!/bin/bash
BACKUP_DIR="/backup/fahrtenbuch"
DATE=$(date +%Y-%m-%d)

# Datenbank
docker exec fahrtenbuch-db \
  mysqldump -u root -p${DB_PASSWORD} ${DB_NAME} \
  > $BACKUP_DIR/db_${DATE}.sql

# Dateien
tar -czf $BACKUP_DIR/files_${DATE}.tar.gz \
  /home/users/revisor/www/fahrtenbuch/

# Aufräumen (30 Tage)
find $BACKUP_DIR -type f -mtime +30 -exec rm {} \;
```

### Updates

```bash
# Images aktualisieren
docker-compose pull

# Neustart
docker-compose down
docker-compose up -d
```

### Monitoring
- Container-Logs: `docker-compose logs`
- MySQL-Logs: `docker-compose logs db`
- API-Logs: `docker-compose logs backend`

## 📝 Lizenz

MIT License

Copyright (c) 2024 Simon Luthe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 📞 Support

Bei Fragen oder Problemen:
- GitHub Issues
- E-Mail: [support@example.com](mailto:support@example.com)
- Dokumentation: [docs.example.com](https://docs.example.com)