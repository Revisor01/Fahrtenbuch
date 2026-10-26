<p align="center">
  <img src="frontend/public/icons/icon-256.png" alt="Fahrtenbuch" width="128" height="128">
</p>

<h1 align="center">Fahrtenbuch</h1>

<p align="center">
  Record business trips and claim them every month —<br>
  the export is the completed reimbursement form.
</p>

<p align="center">
  <a href="README.md">Deutsch</a> · <b>English</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Web%20%C2%B7%20PWA-blue" alt="Platform">
  <img src="https://img.shields.io/docker/v/revisoren/fahrtenbuch-app?label=Docker&logo=docker" alt="Docker image">
  <img src="https://img.shields.io/badge/License-free%20for%20individuals%2C%20organisations%20by%20agreement-lightgrey" alt="License">
</p>

## What it is about

Anyone who drives their own car for work has to document the trips and claim
them every month. This often happens in Excel sheets that are copied by hand
into the official form — error-prone and tedious.

Fahrtenbuch (German for “logbook”) does both: recording and claiming. The
export is the official reimbursement form, completely filled in, with cost
centre, IBAN and signature fields. What comes out can be submitted directly.

## Features

### Recording trips
- **Two steps** — pick a destination, confirm, done; purposes are suggested
  from your history
- **Automatic distances** — routes between saved places are remembered and
  reused
- **Address suggestions** as you type, also for one-off destinations
- **Return trip with one tap** — adds the opposite direction on the same day
- **Favourites** — recurring routes with one tap

### Passengers
- Can be recorded per trip, with workplace and direction, at their own rate
- For an outbound and return trip, the entry applies to both trips of the pair

### Claims
- **Several payers** side by side, each with its own rate and cost centre
- **Rates by date** — every trip is calculated at the rate that applied on its
  day
- **Single and multi-month export** as Excel and PDF
- **Status per payer and month** — recorded, submitted, reimbursed

### Overview
- Start page with outstanding amounts, monthly totals and recent trips
- Distance over the year
- Light and dark, on the phone as on the computer, installable as an app (PWA)

## Installation

Fahrtenbuch runs as a separate instance per organisation; accounts are issued
by the respective organisation. In the browser it can be installed as an app
via “Add to Home Screen”. To set up your own instance, see
[Running it yourself](#running-it-yourself).

## Versions

What changed when is in [CHANGELOG.md](CHANGELOG.md) (in German, written from
the users' point of view). The
[releases](https://github.com/Revisor01/Fahrtenbuch/releases) summarise each
version.

## Running it yourself

You may run Fahrtenbuch yourself freely for your own trips, including business
trips. Parishes, church districts and other organisations need a written
agreement (see [License](#license)).

You need Docker with Docker Compose and a reverse proxy with TLS in front. The
ready-made images are on Docker Hub (`revisoren/fahrtenbuch-app` and
`revisoren/fahrtenbuch-server`).

**1. Create the Compose file.** The template
[docker-compose.example.yml](docker-compose.example.yml) contains the
frontend, the backend and MySQL 8.4, with comments on every variable.

```bash
curl -O https://raw.githubusercontent.com/Revisor01/Fahrtenbuch/master/docker-compose.example.yml
mv docker-compose.example.yml docker-compose.yml
```

**2. Set the values** — in a `.env` next to the Compose file. Generate secrets
randomly, for example with `openssl rand -hex 32`.

| Variable | Required | Meaning |
|----------|----------|---------|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | database access |
| `JWT_SECRET` | yes | signs the logins, at least 32 characters (the backend reports shorter ones at startup) |
| `FRONTEND_URL`, `CORS_ORIGIN` | yes | public address of the frontend |
| `INITIAL_ADMIN_USERNAME`, `…_PASSWORD`, `…_EMAIL` | yes | first admin account on first start |
| `DEFAULT_ERSTATTUNG_TRAEGER`, `…_MITFAHRER`, `…_DATUM` | no | mileage rates from a given date |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | no | emails for registration and password |
| `REACT_APP_TITLE` | no | title of the frontend |
| `ALLOW_REGISTRATION`, `ALLOWED_EMAIL_DOMAINS`, `REGISTRATION_CODE` | no | who may register themselves (backend) |
| `REACT_APP_ALLOW_REGISTRATION`, `REACT_APP_ALLOWED_EMAIL_DOMAINS`, `REACT_APP_REGISTRATION_CODE` | no | the same for what the frontend shows; the code itself stays in the backend |
| `DOKU_USER`, `DOKU_PASSWORT` | no | enables the API documentation under `/api-docs` |

Without SMTP everything works, only no emails are sent.

**3. Start.**

```bash
docker compose up -d
```

The frontend listens on port 9642, the backend only locally on port 5000. The
database is created on first start, and migrations run every time the backend
starts. Then log in with the first admin account.

**Update:** `docker compose pull && docker compose up -d`. Before an update it
is worth backing up the database, which holds everything that matters
(`mysqldump --single-transaction` runs without locking while in use).

## Structure

```
Fahrtenbuch
├── backend/          — Node.js and Express, MySQL, migrations, export
│   ├── migrations/   — schema changes, run at startup
│   ├── templates/    — the official reimbursement form
│   └── test/         — tests, run on every pull request
├── frontend/         — React and Vite, Tailwind, PWA; iOS shell with Capacitor
└── docker-compose.example.yml
```

**What matters when building:**
- **Every query is limited to the user's own data.** Nobody sees other
  people's trips, not even through the API.
- **One image for many organisations.** Title, registration and allowed
  domains come from the environment at runtime, not from the build.
- **The form is the template.** The Excel export fills in the official form;
  the PDF is created from it with LibreOffice.
- **Rates apply from a date.** A trip is calculated at the rate of its day,
  even if the rate changes later.

## Contributing

Bug reports and suggestions are welcome as an
[issue](https://github.com/Revisor01/Fahrtenbuch/issues). Please report
security issues privately as described in [SECURITY.md](SECURITY.md). Pull
requests are welcome; [CONTRIBUTING.md](CONTRIBUTING.md) explains what applies
to the rights in your contribution.

## Privacy

Fahrtenbuch contains no analytics, no advertising and no third-party services.
The data is stored in the database of your own instance; whoever runs it is
responsible for protecting it there. Passwords are stored only as a hash, and
so are API keys.

## License

**Source available for inspection — free for individuals, for organisations
only with written permission.** The full text is in [LICENSE](LICENSE), an
English translation in [LICENSE.en.md](LICENSE.en.md) (the German version is
legally binding).

- **Free for you:** reading, studying, reporting security issues, writing
  about it — and running and adapting Fahrtenbuch yourself for your own trips,
  including business and official trips.
- **Needs an agreement:** use by or for a parish, a church district, a
  company, an association or a public authority, running it for others,
  passing it on to third parties and using parts of the code in other
  software. Requests to [mail@simonluthe.de](mailto:mail@simonluthe.de).

## Contact

Pastor Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)
