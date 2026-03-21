# Technology Stack

**Analysis Date:** 2026-03-21

## Languages

**Primary:**
- JavaScript (Node.js) - Backend runtime
- JavaScript (React) - Frontend application
- SQL - Database schema and migrations

**Secondary:**
- HTML5 - Frontend markup (compiled from JSX)
- CSS3 - Styling with Tailwind CSS and PostCSS

## Runtime

**Environment:**
- Node.js 20 - Both frontend and backend build/serve

**Package Manager:**
- npm - Dependency and script management
- Lockfile: `package-lock.json` present in both `frontend/` and `backend/`

## Frameworks

**Core:**
- Express.js 4.17.1 - Backend HTTP server and REST API
- React 18.3.1 - Frontend UI framework with hooks and context API
- React Router DOM 7.1.1 - Client-side routing

**Testing:**
- React Test Scripts (via react-scripts 5.0.1) - Jest-based testing framework
- @testing-library/react 13.4.0 - React component testing utilities
- @testing-library/jest-dom 5.17.0 - Jest DOM matchers

**Build/Dev:**
- react-scripts 5.0.1 - Frontend build tooling (webpack, babel, dev server)
- nodemon 2.0.12 - Backend auto-reload during development
- Webpack (implicit via react-scripts) - Frontend bundling
- Babel (implicit via react-scripts) - JavaScript transpilation

**Styling:**
- Tailwind CSS 3.4.12 - Utility-first CSS framework
- PostCSS 8.4.47 - CSS transformation pipeline
- Autoprefixer 10.4.20 - Browser vendor prefix generation

**Icons:**
- Heroicons (React) 2.2.0 - Official Tailwind Labs icon library
- Lucide React 0.451.0 - Modern icon library

## Key Dependencies

**Critical:**
- express 4.17.1 - Core backend framework for API routing and middleware
- react 18.3.1 - Core frontend UI library
- mysql2 2.3.0 - MySQL database driver with promise support
- jsonwebtoken 9.0.2 - JWT token generation and verification for authentication
- bcrypt 5.1.1 - Password hashing with salt rounds (critical for security)
- axios 1.7.7 - HTTP client for frontend API requests

**Infrastructure:**
- cors 2.8.5 - Cross-origin resource sharing middleware
- dotenv 10.0.0 / 16.4.7 - Environment variable management
- nodemailer 6.9.16 - SMTP email sending for password reset and verification emails
- exceljs 4.4.0 - Excel (.xlsx) file generation for exports
- xlsx 0.18.5 - Excel file parsing and generation
- jszip 3.10.1 - ZIP archive creation for bulk exports

**Development:**
- @babel/plugin-proposal-private-property-in-object 7.21.11 - Babel support for private class fields
- dotenv-webpack 8.1.0 - Webpack plugin for injecting env vars into frontend build

## Configuration

**Environment:**
Backend requires these environment variables (see `docker-compose.example.yml`):
- Database: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Authentication: `JWT_SECRET`
- Email (SMTP): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`
- URLs: `FRONTEND_URL`, `CORS_ORIGIN`
- Initial Admin: `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_ADMIN_EMAIL`
- Defaults: `DEFAULT_ERSTATTUNG_TRAEGER`, `DEFAULT_ERSTATTUNG_MITFAHRER`, `DEFAULT_ERSTATTUNG_DATUM`

Frontend environment variables (build-time, via Docker build args):
- `REACT_APP_TITLE` - Application title displayed in UI
- `REACT_APP_ALLOW_REGISTRATION` - Enable/disable user self-registration
- `REACT_APP_ALLOWED_EMAIL_DOMAINS` - Comma-separated list of allowed email domains for registration
- `REACT_APP_REGISTRATION_CODE` - Optional registration code requirement

**Build:**
- Backend: `Dockerfile` at `backend/Dockerfile` - Multi-stage not used, Node 20 base image
- Frontend: `backend/Dockerfile` - Multi-stage build: Node 20 → Nginx Alpine
- Frontend: `frontend/nginx.conf` - Nginx configuration for SPA routing (try_files fallback to index.html)
- Compose: `docker-compose.yml` (development) and `docker-compose.example.yml` (production template)

## Platform Requirements

**Development:**
- Node.js 20+ (specified in Dockerfiles)
- npm for dependency management
- Docker and Docker Compose (for containerized development)

**Production:**
- Docker and Docker Compose
- MySQL 8 database (included in compose stack)
- Reverse proxy (Caddy on server.godsapp.de at kkd-fahrtenbuch.de)
- Server: KKD (185.248.143.234, Caddy reverse proxy, /opt/fahrtenbuch/ stack directory)

**Ports:**
- Frontend: Port 9642 (exposed by Nginx container)
- Backend: Port 5000 (Node.js server)
- Database: Port 3306 (MySQL, internal to compose network)

---

*Stack analysis: 2026-03-21*
