# External Integrations

**Analysis Date:** 2026-03-21

## APIs & External Services

**Email/SMTP:**
- Mailcow instance at mail.kkd-fahrtenbuch.de (Port 85)
  - Service: Password reset and welcome email delivery
  - SDK/Client: nodemailer 6.9.16
  - Auth: Environment variables `SMTP_USER`, `SMTP_PASSWORD`
  - Implementation: `backend/services/mailService.js`
  - Endpoints:
    - Welcome email with password setup link (24-hour token)
    - Email verification emails (24-hour token)
    - Password reset emails (24-hour token)

**Internal Service APIs:**
- Gottesdienst-Formatter: gd.kkd-fahrtenbuch.de (Port 5001)
  - Status: Defined in server config but no direct integration found in codebase
  - May be used by external tools consuming Fahrtenbuch data

## Data Storage

**Databases:**
- MySQL 8.0
  - Connection: Environment variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - Client: mysql2 2.3.0 with promise support
  - Connection Pooling: 10 concurrent connections via mysql2 pool
  - Config location: `backend/config/database.js`
  - Tables: users, user_profiles, fahrten, orte, distanzen, abrechnungstraeger, mitfahrer, mitfahrer_erstattung, api_keys, email_verifications
  - Character set: utf8mb4 with unicode collation for German characters
  - Health check: mysqladmin ping command in compose stack

**File Storage:**
- Local filesystem only
  - Excel/XLSX exports generated in-memory via exceljs 4.4.0 and xlsx 0.18.5
  - ZIP archives created in-memory via jszip 3.10.1
  - No persistent file storage needed (exports generated on-demand)
  - Backend temp storage: `/app/data` volume mounted in production

**Caching:**
- None - Application-level caching via localStorage in browser
- Frontend uses localStorage for: token, user object, theme preference

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `backend/middleware/authMiddleware.js` and `backend/controllers/authController.js`
  - Token generation: jsonwebtoken 9.0.2 (secret: `JWT_SECRET`)
  - Token expiration: 24 hours
  - Password hashing: bcrypt 5.1.1 with 12 salt rounds

**API Key Authentication:**
- Custom API key system for programmatic access
  - Header: `X-API-Key`
  - Validation: `backend/models/ApiKey.js`
  - Usage tracking: last_used timestamp recorded on each request
  - Scope: Can be used as alternative to JWT Bearer token

**User Registration:**
- Email-based with optional restrictions
  - Configuration: `REACT_APP_ALLOWED_EMAIL_DOMAINS` (optional domain whitelist)
  - Optional: `REACT_APP_REGISTRATION_CODE` (registration code requirement)
  - Verification: Email verification link sent to confirm address (24-hour token)
  - Email verification required for core features (enforced by `requireVerifiedEmail` middleware)

**Password Management:**
- Token-based password reset and setup
  - Reset flow: User requests reset → email sent with 24-hour token → user sets new password
  - Initial setup: During registration, welcome email with setup link sent
  - Token storage: `verification_token` field in users table (crypto.randomBytes)
  - Expiration: 24 hours (checked in controllers, not db-level TTL)

## Monitoring & Observability

**Error Tracking:**
- None detected - No external error tracking service (Sentry, Rollbar, etc.)
- Console logging only: `console.error()` for backend errors, `console.log()` for debug info

**Logs:**
- Console output to Docker container logs
- Mailcow has separate logs at mail.kkd-fahrtenbuch.de
- Backup script logs: `/opt/backups/fahrtenbuch-backup.log` on server

## CI/CD & Deployment

**Hosting:**
- Docker containers on server.godsapp.de (Hetzner, IP 185.248.143.234)
- Stack location: `/opt/fahrtenbuch/docker-compose.yml`
- Reverse proxy: Caddy (`/etc/caddy/Caddyfile`)

**CI Pipeline:**
- GitHub Actions workflow defined at `.github/workflows/docker-publish.yml`
- Workflow: Builds and pushes images to Docker registry (Docker Hub: revisoren/fahrtenbuch-*)
- Images: revisoren/fahrtenbuch-app (frontend), revisoren/fahrtenbuch-server (backend)
- Triggered: On commits/releases

**Deployment Process:**
1. Commit to GitHub
2. GitHub Actions builds images and pushes to Docker Hub
3. Manual pull and restart on server: `docker-compose pull && docker-compose up -d`

**Backup:**
- Automated daily backup at 3:00 UTC
- Script: `/opt/backups/fahrtenbuch-backup.sh`
- Target: Hetzner Storage Box (u528399-sub3, SFTP Port 23)
- Method: mysqldump with --single-transaction flag
- Retention: 365-day rotation
- Auth: SSH key-based (no password)

## Environment Configuration

**Required Environment Variables:**

Database:
```
DB_HOST=db              # Docker compose service name or IP
DB_USER=fahrtenbuch     # MySQL user
DB_PASSWORD=***         # MySQL password
DB_NAME=fahrtenbuch     # Database name
```

Email/SMTP:
```
SMTP_HOST=mail.kkd-fahrtenbuch.de
SMTP_PORT=587           # Or 465 for secure
SMTP_SECURE=true        # Boolean: use TLS
SMTP_USER=***           # Mailcow user
SMTP_PASSWORD=***       # Mailcow password
MAIL_FROM=noreply@kkd-fahrtenbuch.de
```

Auth:
```
JWT_SECRET=***          # Random secret for token signing (256+ bits recommended)
```

URLs:
```
FRONTEND_URL=https://kkd-fahrtenbuch.de
CORS_ORIGIN=https://kkd-fahrtenbuch.de
NODE_ENV=production     # In docker-compose.example.yml (implicit)
```

Initial Admin User:
```
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=***          # Set on first deployment
INITIAL_ADMIN_EMAIL=admin@example.com
```

Frontend Build Args (optional):
```
REACT_APP_TITLE="Fahrtenbuch Kirchenkreis Dithmarschen"
REACT_APP_ALLOW_REGISTRATION=true
REACT_APP_ALLOWED_EMAIL_DOMAINS=kkd.de,kirchenkreis.de
REACT_APP_REGISTRATION_CODE=***     # Optional code gate
```

**Secrets Location:**
- Development: `.env` file (not in git, created from docker-compose.yml)
- Production: `stack.env` file in `/opt/fahrtenbuch/` on server (referenced by docker-compose.yml)
- Database password stored in compose environment: referenced by both backend and db services

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Email-based notifications via SMTP (nodemailer):
  - Welcome emails to new registrants
  - Password reset confirmation emails
  - Email verification links (for changing email address)
  - All emails include one-time token links for token-based actions

---

*Integration audit: 2026-03-21*
