# Digitales Fahrtenbuch

Ein modernes, webbasiertes System zur Verwaltung und Abrechnung von Dienstfahrten. Entwickelt für Organisationen jeder Art, die eine professionelle Verwaltung ihrer Fahrtkosten benötigen.

[![Version](https://img.shields.io/badge/version-1.1.0-green.svg)](https://github.com/Revisor01/Fahrtenbuch)
[![Docker Image Frontend](https://img.shields.io/docker/v/revisoren/fahrtenbuch-app)](https://hub.docker.com/r/revisoren/fahrtenbuch-app)
[![Docker Image Backend](https://img.shields.io/docker/v/revisoren/fahrtenbuch-server)](https://hub.docker.com/r/revisoren/fahrtenbuch-server)
[![License](https://img.shields.io/badge/license-Custom-blue.svg)](LICENSE)

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

## 🔐 Registrierung und Zugriffskontrolle

Das System bietet flexible Möglichkeiten zur Steuerung der Benutzerregistrierung:

### Registrierungsoptionen:

1. **Offene Registrierung**
- Aktivierung durch `REACT_APP_ALLOW_REGISTRATION=true`
- Jeder kann sich mit beliebiger E-Mail registrieren

2. **Domain-beschränkte Registrierung**
- `REACT_APP_ALLOW_REGISTRATION=true`
- `REACT_APP_ALLOWED_EMAIL_DOMAINS=domain1.de,domain2.de`
- Nur E-Mails von spezifizierten Domains erlaubt

3. **Code-geschützte Registrierung**
- `REACT_APP_ALLOW_REGISTRATION=true`
- `REACT_APP_REGISTRATION_CODE=geheimer-code`
- Registrierung nur mit korrektem Code möglich

4. **Geschlossenes System**
- `REACT_APP_ALLOW_REGISTRATION=false`
- Nur Administratoren können neue Benutzer anlegen

## 🛠 Installation

### Voraussetzungen
- Docker & Docker Compose
- Reverse Proxy (Apache/Nginx)
- SSL-Zertifikat
- Mind. 2GB RAM
- 10GB Speicherplatz

### Quick Start (Docker Compose)

1. Erstelle eine `.env`-Datei mit den benötigten Umgebungsvariablen (siehe Beispiel unten)
2. Erstelle eine `docker-compose.yml` mit folgendem Inhalt:

```yaml
services:
frontend:
image: revisoren/fahrtenbuch-app:latest
ports:
- "9642:80"
environment:
- REACT_APP_TITLE=${REACT_APP_TITLE}
- REACT_APP_ALLOW_REGISTRATION=${REACT_APP_ALLOW_REGISTRATION}
- REACT_APP_ALLOWED_EMAIL_DOMAINS=${REACT_APP_ALLOWED_EMAIL_DOMAINS}
- REACT_APP_REGISTRATION_CODE=${REACT_APP_REGISTRATION_CODE}
- NODE_ENV=production
depends_on:
- backend
restart: unless-stopped
command: sh -c "sed -i 's|DEFAULT_TITLE|$REACT_APP_TITLE|g' /usr/share/nginx/html/config.js && \
sed -i 's|DEFAULT_ALLOW_REGISTRATION|$REACT_APP_ALLOW_REGISTRATION|g' /usr/share/nginx/html/config.js && \
sed -i 's|DEFAULT_ALLOWED_EMAIL_DOMAINS|$REACT_APP_ALLOWED_EMAIL_DOMAINS|g' /usr/share/nginx/html/config.js && \
sed -i 's|DEFAULT_REGISTRATION_CODE|$REACT_APP_REGISTRATION_CODE|g' /usr/share/nginx/html/config.js && \
nginx -g 'daemon off;'"

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
- CORS_ORIGIN=${CORS_ORIGIN}
- INITIAL_ADMIN_EMAIL=${INITIAL_ADMIN_EMAIL}
- INITIAL_ADMIN_USERNAME=${INITIAL_ADMIN_USERNAME}
- INITIAL_ADMIN_PASSWORD=${INITIAL_ADMIN_PASSWORD}
- DEFAULT_ERSTATTUNG_TRAEGER=${DEFAULT_ERSTATTUNG_TRAEGER}
- DEFAULT_ERSTATTUNG_MITFAHRER=${DEFAULT_ERSTATTUNG_MITFAHRER}
- DEFAULT_ERSTATTUNG_DATUM=${DEFAULT_ERSTATTUNG_DATUM}
- INITIAL_TRAEGER_1_NAME=${INITIAL_TRAEGER_1_NAME}
- INITIAL_TRAEGER_2_NAME=${INITIAL_TRAEGER_2_NAME}
- STANDARD_ORT_1_NAME=${STANDARD_ORT_1_NAME}
- STANDARD_ORT_1_ADRESSE=${STANDARD_ORT_1_ADRESSE}
- STANDARD_ORT_2_NAME=${STANDARD_ORT_2_NAME}
- STANDARD_ORT_2_ADRESSE=${STANDARD_ORT_2_ADRESSE}
- NODE_ENV=production
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
volumes:
- /opt/fahrtenbuch/db/mysql:/var/lib/mysql
command: 
- --character-set-server=utf8mb4
- --collation-server=utf8mb4_unicode_ci
- --log_bin_trust_function_creators=1
- --innodb-use-native-aio=0
healthcheck:
test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
timeout: 5s
retries: 10

volumes:
fahrtenbuch_data:
```

3. Starte die Anwendung:

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

# Frontend Configuration
FRONTEND_URL=https://fahrtenbuch.example.com
CORS_ORIGIN=https://fahrtenbuch.example.com
REACT_APP_TITLE=Digitales Fahrtenbuch
REACT_APP_ALLOW_REGISTRATION=false
REACT_APP_ALLOWED_EMAIL_DOMAINS=example.com,example.org
REACT_APP_REGISTRATION_CODE=secret-code

# Admin Account
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=change-me

# Erstattungssätze
DEFAULT_ERSTATTUNG_TRAEGER=0.30
DEFAULT_ERSTATTUNG_MITFAHRER=0.05
DEFAULT_ERSTATTUNG_DATUM=2025-01-01

# Initial Setup (Optional)
INITIAL_TRAEGER_1_NAME=Kirchenkreis
INITIAL_TRAEGER_2_NAME=Kirchengemeinde
STANDARD_ORT_1_NAME=Meldorf
STANDARD_ORT_1_ADRESSE=Nordermarkt 8, 25704 Meldorf
STANDARD_ORT_2_NAME=Heide
STANDARD_ORT_2_ADRESSE=Markt 16, 25746 Heide
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

Copyright (c) 2025 Simon Luthe

Alle Rechte vorbehalten.

Diese Software darf von Einzelpersonen für private Zwecke frei genutzt werden.

Die Nutzung dieser Software durch Organisationen, Institutionen, Vereine, Kirchen oder andere juristische Personen ist nur nach vorheriger Vereinbarung mit dem Urheberrechtsinhaber gestattet.

Für eine Nutzungsvereinbarung kontaktieren Sie bitte [mail@simonluthe.de](mailto:mail@simonluthe.de).

## Haftungsausschluss

DIESE SOFTWARE WIRD "WIE BESEHEN" OHNE JEGLICHE AUSDRÜCKLICHE ODER STILLSCHWEIGENDE GARANTIE ZUR VERFÜGUNG GESTELLT, EINSCHLIESSLICH, ABER NICHT BESCHRÄNKT AUF DIE GARANTIEN DER MARKTGÄNGIGKEIT, DER EIGNUNG FÜR EINEN BESTIMMTEN ZWECK UND DER NICHTVERLETZUNG VON RECHTEN DRITTER. IN KEINEM FALL SIND DIE AUTOREN ODER COPYRIGHT-INHABER HAFTBAR FÜR ANSPRÜCHE, SCHÄDEN ODER ANDERE VERPFLICHTUNGEN, SEI ES DURCH VERTRAG, UNERLAUBTE HANDLUNG ODER ANDERWEITIG, DIE SICH AUS, AUSSERHALB ODER IM ZUSAMMENHANG MIT DER SOFTWARE ODER DER NUTZUNG ODER ANDEREN GESCHÄFTEN MIT DER SOFTWARE ERGEBEN.

## 📞 Support

Bei Fragen oder Problemen:
- GitHub Issues
- E-Mail: [mail@simonluthe.de](mailto:mail@simonluthe.de)