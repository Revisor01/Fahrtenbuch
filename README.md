# Digitales Fahrtenbuch

Ein modernes, webbasiertes System zur Verwaltung und Abrechnung von Dienstfahrten. Entwickelt für Organisationen jeder Art, die eine professionelle Verwaltung ihrer Fahrtkosten benötigen.

[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/Revisor01/Fahrtenbuch)

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

### Quick Start (Docker Compose)

Für eine schnelle und einfache Installation ohne manuelles Klonen des Repositorys kannst du direkt mit Docker Compose arbeiten:

1.  Erstelle eine `.env`-Datei (siehe Beispiel unten) und passe die Umgebungsvariablen an.
2.  Erstelle eine `docker-compose.yml`-Datei mit folgendem Inhalt (oder verwende die bereitgestellte):
    ```yaml
    version: '3.8'
    services:
      frontend:
        image: revisoren/fahrtenbuch-app:latest
        ports:
          - "9642:80"
        depends_on:
          - backend
        restart: unless-stopped

      backend:
        image: revisoren/fahrtenbuch-server:latest
        ports:
          - "5000:5000"
        environment:
          - DB_HOST=${DB_HOST}
          - DB_USER=${DB_USER}
          - DB_PASSWORD=${DB_PASSWORD}
          - DB_NAME=${DB_NAME}
          - JWT_SECRET=${JWT_SECRET}
          - SMTP_HOST=${SMTP_HOST}
          - SMTP_PORT=${SMTP_PORT}
          - SMTP_SECURE=${SMTP_SECURE}
          - SMTP_USER=${SMTP_USER}
          - SMTP_PASSWORD=${SMTP_PASSWORD}
          - MAIL_FROM=${MAIL_FROM}
          - FRONTEND_URL=${FRONTEND_URL}
          - INITIAL_ADMIN_EMAIL=${INITIAL_ADMIN_EMAIL}
          - INITIAL_ADMIN_USERNAME=${INITIAL_ADMIN_USERNAME}
          - INITIAL_ADMIN_PASSWORD=${INITIAL_ADMIN_PASSWORD}
          - DEFAULT_ERSTATTUNG_TRAEGER=${DEFAULT_ERSTATTUNG_TRAEGER}
          - DEFAULT_ERSTATTUNG_MITFAHRER=${DEFAULT_ERSTATTUNG_MITFAHRER}
          - DEFAULT_ERSTATTUNG_DATUM=${DEFAULT_ERSTATTUNG_DATUM}
        restart: unless-stopped
        volumes:
          - fahrtenbuch_data:/app/data
        depends_on:
          - db

      db:
        image: mysql:8
        environment:
          MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
          MYSQL_DATABASE: ${DB_NAME}
          MYSQL_USER: ${DB_USER}
          MYSQL_PASSWORD: ${DB_PASSWORD}
          MYSQL_INIT_COMMAND: "SET GLOBAL log_bin_trust_function_creators = 1;" # Hinzufügen
        volumes:
          - fahrtenbuch_data:/var/lib/mysql
        ports:
          - "3306:3306"
        command:
          - --character-set-server=utf8mb4
          - --collation-server=utf8mb4_unicode_ci
          - --log_bin_trust_function_creators=1
        healthcheck:
          test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
          timeout: 5s
          retries: 10

    volumes:
      fahrtenbuch_data:
    ```
3.  Starte die Anwendung mit Docker Compose:
    ```bash
    docker-compose up -d
    ```

### Beispiel `.env` Datei

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

### Entwicklungsumgebung (Optional)

Für die Entwicklung kannst du eine separate `docker-compose.dev.yml` Datei erstellen, um lokale Änderungen im Code zu ermöglichen, ohne jedes Mal ein neues Image bauen zu müssen:

1.  Erstelle eine `docker-compose.dev.yml` Datei mit folgendem Inhalt:
    ```yaml
    version: '3.8'

    services:
      frontend:
        build:
          context: ./frontend
          dockerfile: Dockerfile
        ports:
          - "9642:80"
        depends_on:
          - backend

      backend:
        build:
          context: ./backend
          dockerfile: Dockerfile
        ports:
          - "5000:5000"
        environment:
          - DB_HOST=${DB_HOST}
          - DB_USER=${DB_USER}
          - DB_PASSWORD=${DB_PASSWORD}
          - DB_NAME=${DB_NAME}
          - JWT_SECRET=${JWT_SECRET}
        volumes:
          - ./backend:/app
          - /app/node_modules
    ```

2.  Starte die Entwicklungsumgebung:
    ```bash
    docker-compose -f docker-compose.dev.yml up -d
    ```

    **Erklärung:**
    - Diese Konfiguration verwendet ein lokales Dockerfile für den Build.
    - Die Volumes mounten deine lokalen Backend und Frontend Ordner in die Container, so dass Code-Änderungen sofort wirksam werden.
    - Der Ordner `/app/node_modules` wird als Volume definiert, damit die Abhängigkeiten im Container nicht mit den lokalen in Konflikt geraten.

### Verzeichnisstruktur (mit Entwicklungsumgebung)

```
/fahrtenbuch/
├── frontend/           # React Frontend
│   └── Dockerfile      # Dockerfile für Entwicklung
├── backend/            # Node.js Backend
│   └── Dockerfile      # Dockerfile für Entwicklung
├── db/                # Datenbank
├── docker-compose.yml
└── docker-compose.dev.yml # für lokale Entwicklung
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

Copyright (c) 2024 Simon Luthe

Alle Rechte vorbehalten.

Diese Software darf von Einzelpersonen für nicht-kommerzielle Zwecke frei genutzt werden.

Die Nutzung dieser Software durch Organisationen, Institutionen oder für kommerzielle Zwecke ist nur unter einer der folgenden Bedingungen gestattet:

1.  **Kommerzielle Lizenz:** Der Erwerb einer gültigen kommerziellen Lizenz vom Urheberrechtsinhaber. Bitte kontaktieren Sie [mail@simonluthe.de](mailto:mail@simonluthe.de), um eine Lizenz zu erwerben.

2.  **Genehmigung:** Eine ausdrückliche, schriftliche Genehmigung vom Urheberrechtsinhaber. Bitte kontaktieren Sie [mail@simonluthe.de](mailto:mail@simonluthe.de), um eine Genehmigung zu beantragen.

DIESE SOFTWARE WIRD "WIE BESEHEN" OHNE JEGLICHE AUSDRÜCKLICHE ODER STILLSCHWEIGENDE GARANTIE ZUR VERFÜGUNG GESTELLT, EINSCHLIESSLICH, ABER NICHT BESCHRÄNKT AUF DIE GARANTIEN DER MARKTGÄNGIGKEIT, DER EIGNUNG FÜR EINEN BESTIMMTEN ZWECK UND DER NICHTVERLETZUNG VON RECHTEN DRITTER. IN KEINEM FALL SIND DIE AUTOREN ODER COPYRIGHT-INHABER HAFTBAR FÜR ANSPRÜCHE, SCHÄDEN ODER ANDERE VERPFLICHTUNGEN, SEI ES DURCH VERTRAG, UNERLAUBTE HANDLUNG ODER ANDERWEITIG, DIE SICH AUS, AUSSERHALB ODER IM ZUSAMMENHANG MIT DER SOFTWARE ODER DER NUTZUNG ODER ANDEREN GESCHÄFTEN MIT DER SOFTWARE ERGEBEN.

## 📞 Support

Bei Fragen oder Problemen:
- GitHub Issues
- E-Mail: [mail@simonluthe.de](mailto:mail@simonluthe.de)