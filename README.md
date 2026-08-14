<p align="center">
  <img src="frontend/public/icons/icon-256.png" alt="Fahrtenbuch" width="128" height="128">
</p>

<h1 align="center">Fahrtenbuch</h1>

<p align="center">
  Dienstfahrten erfassen und monatlich abrechnen.<br>
  Für Mitarbeitende, die dienstlich mit dem eigenen Auto unterwegs sind — und die Abrechnung ohne Nacharbeit einreichen wollen.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-24-brightgreen?logo=nodedotjs" alt="Node 24">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/Vite-6-purple?logo=vite" alt="Vite 6">
  <img src="https://img.shields.io/badge/MySQL-8.4_LTS-orange?logo=mysql" alt="MySQL 8.4">
  <img src="https://img.shields.io/docker/v/revisoren/fahrtenbuch-app?label=Docker&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-Custom-lightgrey" alt="License">
</p>

---

## Worum es geht

Wer dienstlich mit dem privaten Auto fährt, muss die Fahrten belegen und monatlich abrechnen. Das passiert oft in Excel-Tabellen, die von Hand ins offizielle Formular übertragen werden — fehleranfällig und mühsam.

Diese App übernimmt beides: erfassen und abrechnen. **Der Export ist das offizielle Abrechnungsformular** — vollständig ausgefüllt, mit Unterschriftsfeldern, Kostenstelle und IBAN. Was herauskommt, kann direkt eingereicht werden.

## Funktionen

### Fahrten erfassen
- **Zwei-Schritt-Erfassung** — Ziel wählen, bestätigen, fertig. Anlass-Vorschläge aus dem Verlauf
- **Automatische Kilometer** — Distanzen zwischen gespeicherten Orten werden gepflegt und wiederverwendet
- **Adress-Vorschläge** — beim Tippen, auch für einmalige Ziele; Hausnummern werden übernommen
- **Rückfahrt mit einem Tipp** — legt die Gegenrichtung am selben Tag an, verknüpft als Paar
- **Favoriten** — wiederkehrende Strecken auf einen Tipp, wahlweise mit Rückfahrt
- **Wohnort im Profil** — liefert die Anschrift für das Abrechnungsformular

### Mitfahrer:innen
- Je Fahrt erfassbar, mit Arbeitsstätte und Richtung (hin / zurück / beides)
- **„Hin- und Rückfahrt" gilt für beide Fahrten** eines verknüpften Paares — sichtbar auf beiden, beim Löschen wird die Gegenhälfte mit entfernt
- Eigener Erstattungssatz, getrennt ausgewiesen

### Abrechnung
- Mehrere Abrechnungsträger parallel, je mit eigenem Kilometersatz und Kostenstelle
- **Zeitabhängige Sätze** — jede Fahrt wird mit dem Satz gerechnet, der an ihrem Datum galt
- **Einzel- und Mehrmonats-Export** — etwa ein ganzes Quartal in einer Abrechnung
- **Excel und PDF**, bei mehreren Dateien automatisch als ZIP
- Statusverfolgung je Träger und Monat: erfasst → eingereicht → erstattet

### Übersicht
- Startseite mit offenen Beträgen, Monatssummen und den letzten Fahrten
- Kilometer-Verlauf über das Jahr, aufschlüsselbar je Monat
- Helles und dunkles Design, auf dem Handy wie am Rechner bedienbar
- Installierbar als App (PWA)

## Technik

| Bereich | Stack |
|---|---|
| Frontend | React 18, Vite 6, Tailwind CSS |
| Backend | Node.js 24, Express 4 |
| Datenbank | MySQL 8.4 LTS |
| Export | ExcelJS, LibreOffice (PDF) |
| Betrieb | Docker Compose, Reverse Proxy |

**Sicherheit:** JWT-Authentifizierung mit Ablauf, bcrypt für Passwörter, rollenbasierte Rechte, API-Keys für externe Zugriffe, Zod-Validierung aller Eingaben, Rate Limiting, Helmet-Header. Alle Datenbankabfragen sind auf die eigene Nutzer-ID begrenzt.

**Konfiguration zur Laufzeit:** Titel, Registrierungsregeln und erlaubte Domains kommen aus Umgebungsvariablen des Containers — dasselbe Image läuft damit bei mehreren Organisationen.

## Registrierung steuern

Vier Betriebsarten über Umgebungsvariablen:

| Modus | Einstellung |
|---|---|
| Offen | `REACT_APP_ALLOW_REGISTRATION=true` |
| Nur bestimmte Domains | zusätzlich `REACT_APP_ALLOWED_EMAIL_DOMAINS=domain.de,weitere.de` |
| Nur mit Code | zusätzlich `REGISTRATION_CODE=…` (der Wert bleibt im Backend) |
| Geschlossen | `REACT_APP_ALLOW_REGISTRATION=false` — nur Admins legen Konten an |

## Installation

**Voraussetzungen:** Docker & Docker Compose, Reverse Proxy mit SSL, ~2 GB RAM.

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
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: revisoren/fahrtenbuch-server:latest
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
      - INITIAL_ADMIN_USERNAME=${INITIAL_ADMIN_USERNAME}
      - INITIAL_ADMIN_PASSWORD=${INITIAL_ADMIN_PASSWORD}
      - INITIAL_ADMIN_EMAIL=${INITIAL_ADMIN_EMAIL}
      - DEFAULT_ERSTATTUNG_TRAEGER=${DEFAULT_ERSTATTUNG_TRAEGER}
      - DEFAULT_ERSTATTUNG_MITFAHRER=${DEFAULT_ERSTATTUNG_MITFAHRER}
      - DEFAULT_ERSTATTUNG_DATUM=${DEFAULT_ERSTATTUNG_DATUM}
      - NODE_ENV=production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./db/mysql:/var/lib/mysql
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --log_bin_trust_function_creators=1
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 5s
      retries: 10
    restart: unless-stopped
```

```bash
docker compose up -d
```

Die Datenbank wird beim ersten Start angelegt, Migrationen laufen automatisch mit. Der Admin-Zugang entsteht aus `INITIAL_ADMIN_*`.

<details>
<summary><b>Beispiel-<code>.env</code></b></summary>

```env
# Datenbank
DB_HOST=db
DB_USER=fahrtenbuch
DB_PASSWORD=sicheres-passwort
DB_NAME=fahrtenbuch

# Authentifizierung
JWT_SECRET=lange-zufallszeichenfolge

# E-Mail (Registrierung, Passwort zurücksetzen)
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASSWORD=passwort
MAIL_FROM=noreply@example.com

# Adressen
FRONTEND_URL=https://fahrtenbuch.example.com
CORS_ORIGIN=https://fahrtenbuch.example.com

# Oberfläche
REACT_APP_TITLE=Fahrtenbuch
REACT_APP_ALLOW_REGISTRATION=false
REACT_APP_ALLOWED_EMAIL_DOMAINS=
REACT_APP_REGISTRATION_CODE=

# Erster Admin
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=bitte-aendern
INITIAL_ADMIN_EMAIL=admin@example.com

# Erstattungssätze beim ersten Start
DEFAULT_ERSTATTUNG_TRAEGER=0.30
DEFAULT_ERSTATTUNG_MITFAHRER=0.05
DEFAULT_ERSTATTUNG_DATUM=2025-01-01
```
</details>

## Betrieb

**Update:**
```bash
docker compose pull && docker compose up -d
```
Schema-Änderungen laufen beim Start des Backends automatisch. Vor einem Update mit Migration empfiehlt sich ein Backup.

**Backup** — die Datenbank enthält alles Wesentliche:
```bash
docker exec fahrtenbuch-db-1 sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction fahrtenbuch' | gzip > backup-$(date +%F).sql.gz
```
`--single-transaction` funktioniert im laufenden Betrieb ohne Sperre.

**Logs:** `docker compose logs -f backend`

## Lizenz

Copyright © 2026 Simon Luthe. Alle Rechte vorbehalten.

Einzelpersonen dürfen die Software für private Zwecke frei nutzen. Die Nutzung durch Organisationen, Institutionen, Vereine, Kirchen oder andere juristische Personen bedarf einer vorherigen Vereinbarung — Anfragen an [mail@simonluthe.de](mailto:mail@simonluthe.de).

Die Software wird ohne jede Gewährleistung bereitgestellt; eine Haftung für Schäden aus ihrer Nutzung ist ausgeschlossen.

## Kontakt

GitHub Issues · [mail@simonluthe.de](mailto:mail@simonluthe.de)
