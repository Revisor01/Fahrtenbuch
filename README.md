<p align="center">
  <img src="frontend/public/icons/icon-256.png" alt="Fahrtenbuch" width="128" height="128">
</p>

<h1 align="center">Fahrtenbuch</h1>

<p align="center">
  Dienstfahrten erfassen und monatlich abrechnen —<br>
  der Export ist das fertig ausgefüllte Abrechnungsformular.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Plattform-Web%20%C2%B7%20PWA-blue" alt="Plattform">
  <img src="https://img.shields.io/docker/v/revisoren/fahrtenbuch-app?label=Docker&logo=docker" alt="Docker-Image">
  <img src="https://img.shields.io/badge/Lizenz-privat%20frei-lightgrey" alt="Lizenz">
</p>

## Worum es geht

Wer dienstlich mit dem eigenen Auto fährt, muss die Fahrten belegen und
monatlich abrechnen. Das passiert oft in Excel-Tabellen, die von Hand ins
offizielle Formular übertragen werden — fehleranfällig und mühsam.

Fahrtenbuch übernimmt beides: erfassen und abrechnen. Der Export ist das
offizielle Abrechnungsformular, vollständig ausgefüllt, mit Kostenstelle, IBAN
und Unterschriftsfeldern. Was herauskommt, kann direkt eingereicht werden.

## Funktionen

### Fahrten erfassen
- **Zwei Schritte** — Ziel wählen, bestätigen, fertig; Anlässe werden aus dem
  Verlauf vorgeschlagen
- **Kilometer automatisch** — Strecken zwischen gespeicherten Orten werden
  gemerkt und wiederverwendet
- **Adress-Vorschläge** beim Tippen, auch für einmalige Ziele
- **Rückfahrt mit einem Tipp** — legt die Gegenrichtung am selben Tag an
- **Favoriten** — wiederkehrende Strecken auf einen Tipp

### Mitfahrer:innen
- Je Fahrt erfassbar, mit Arbeitsstätte und Richtung, eigener Erstattungssatz
- Bei Hin- und Rückfahrt gilt die Angabe für beide Fahrten des Paares

### Abrechnung
- **Mehrere Abrechnungsträger** nebeneinander, je mit eigenem Satz und
  Kostenstelle
- **Sätze nach Datum** — jede Fahrt wird mit dem Satz gerechnet, der an ihrem
  Tag galt
- **Einzel- und Mehrmonats-Export** als Excel und PDF
- **Stand je Träger und Monat** — erfasst, eingereicht, erstattet

### Übersicht
- Startseite mit offenen Beträgen, Monatssummen und letzten Fahrten
- Kilometer-Verlauf über das Jahr
- Hell und Dunkel, am Handy wie am Rechner, als App installierbar (PWA)

## Installation

Fahrtenbuch läuft als eigene Instanz je Organisation; Konten vergibt die
jeweilige Organisation. Im Browser lässt es sich über „Zum Home-Bildschirm“
als App installieren. Eine eigene Instanz einrichten: siehe
[Selbst betreiben](#selbst-betreiben).

## Versionen

Was sich wann geändert hat, steht in [CHANGELOG.md](CHANGELOG.md) — aus Sicht
der Nutzer:innen geschrieben. Die
[Releases](https://github.com/Revisor01/Fahrtenbuch/releases) fassen jede
Version zusammen.

## Selbst betreiben

Nötig sind Docker mit Docker Compose und ein Reverse Proxy mit TLS davor. Die
fertigen Abbilder liegen auf Docker Hub (`revisoren/fahrtenbuch-app` und
`revisoren/fahrtenbuch-server`).

**1. Compose-Datei anlegen.** Die Vorlage
[docker-compose.example.yml](docker-compose.example.yml) enthält Oberfläche,
Backend und MySQL 8.4 samt Kommentaren zu jeder Variable.

```bash
curl -O https://raw.githubusercontent.com/Revisor01/Fahrtenbuch/master/docker-compose.example.yml
mv docker-compose.example.yml docker-compose.yml
```

**2. Werte setzen** — in einer `.env` neben der Compose-Datei. Geheimnisse
zufällig erzeugen, etwa mit `openssl rand -hex 32`.

| Variable | Pflicht | Bedeutung |
|----------|---------|-----------|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | ja | Zugang zur Datenbank |
| `JWT_SECRET` | ja | signiert die Anmeldungen, mindestens 32 Zeichen (kürzere meldet das Backend beim Start) |
| `FRONTEND_URL`, `CORS_ORIGIN` | ja | öffentliche Adresse der Oberfläche |
| `INITIAL_ADMIN_USERNAME`, `…_PASSWORD`, `…_EMAIL` | ja | erstes Admin-Konto beim ersten Start |
| `DEFAULT_ERSTATTUNG_TRAEGER`, `…_MITFAHRER`, `…_DATUM` | nein | Kilometersätze ab einem Datum |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | nein | Mails für Registrierung und Passwort |
| `REACT_APP_TITLE` | nein | Titel der Oberfläche |
| `ALLOW_REGISTRATION`, `ALLOWED_EMAIL_DOMAINS`, `REGISTRATION_CODE` | nein | wer sich selbst registrieren darf (Backend) |
| `REACT_APP_ALLOW_REGISTRATION`, `REACT_APP_ALLOWED_EMAIL_DOMAINS`, `REACT_APP_REGISTRATION_CODE` | nein | dasselbe für die Anzeige in der Oberfläche; der Code selbst bleibt im Backend |
| `DOKU_USER`, `DOKU_PASSWORT` | nein | schaltet die API-Dokumentation unter `/api-docs` frei |

Ohne SMTP läuft alles, es werden nur keine Mails verschickt.

**3. Starten.**

```bash
docker compose up -d
```

Die Oberfläche hört auf Port 9642, das Backend nur lokal auf Port 5000. Die
Datenbank wird beim ersten Start angelegt, Migrationen laufen bei jedem Start
des Backends mit. Danach mit dem ersten Admin-Konto anmelden.

**Update:** `docker compose pull && docker compose up -d`. Vor einem Update
lohnt eine Sicherung der Datenbank, sie enthält alles Wesentliche
(`mysqldump --single-transaction` läuft ohne Sperre im laufenden Betrieb).

## Aufbau

```
Fahrtenbuch
├── backend/          — Node.js und Express, MySQL, Migrationen, Export
│   ├── migrations/   — Schema-Änderungen, laufen beim Start
│   ├── templates/    — das offizielle Abrechnungsformular
│   └── test/         — Tests, laufen bei jedem Pull Request
├── frontend/         — React und Vite, Tailwind, PWA; iOS-Hülle mit Capacitor
└── docker-compose.example.yml
```

**Worauf es beim Bauen ankommt:**
- **Jede Abfrage ist auf die eigene Person begrenzt.** Niemand sieht fremde
  Fahrten, auch nicht über die API.
- **Ein Abbild für viele Organisationen.** Titel, Registrierung und erlaubte
  Domains kommen zur Laufzeit aus der Umgebung, nicht aus dem Build.
- **Das Formular ist die Vorlage.** Der Excel-Export füllt das offizielle
  Formular; PDF entsteht daraus mit LibreOffice.
- **Sätze gelten ab einem Datum.** Eine Fahrt wird mit dem Satz ihres Tages
  gerechnet, auch wenn sich der Satz später ändert.

## Mitmachen

Fehlermeldungen und Vorschläge sind willkommen — gern als
[Issue](https://github.com/Revisor01/Fahrtenbuch/issues). Sicherheitslücken
bitte vertraulich melden, wie in [SECURITY.md](SECURITY.md) beschrieben. Pull
Requests laufen durch Tests und einen Secret-Scan; die Grundsätze für Beiträge
stehen in [CLAUDE.md](CLAUDE.md).

## Datenschutz

Fahrtenbuch enthält keine Analyse, keine Werbung und keine fremden Dienste.
Die Daten liegen in der Datenbank der Instanz, die die Organisation selbst
betreibt; für den Schutz dort ist sie verantwortlich. Passwörter werden nur als
Hash gespeichert, API-Schlüssel ebenso.

## Lizenz

Copyright © 2024–2026 Simon Luthe. Alle Rechte vorbehalten.

Einzelpersonen dürfen die Software für private Zwecke frei nutzen. Die Nutzung
durch Organisationen, Institutionen, Vereine, Kirchen oder andere juristische
Personen braucht eine vorherige Vereinbarung. Die Bedingungen stehen in
[LICENSE](LICENSE).

## Kontakt

Pastor Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)
