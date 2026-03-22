<!-- GSD:project-start source:PROJECT.md -->
## Project

**Fahrtenbuch**

Eine browserbasierte Fahrtenbuch-App für kirchliche Mitarbeitende zur Erfassung und Abrechnung von Dienstfahrten mit Privatfahrzeug. React-Frontend + Express-Backend + MySQL, deployed auf kkd-fahrtenbuch.de. Unterstützt Einzel- und Mehrmonats-Exporte mit offiziellem Abrechnungsformular, Kostenstellen, Unterschriftsfeldern und flexibler Zeitraum-Auswahl.

**Core Value:** Der Excel-Export muss das offizielle Abrechnungsformular korrekt abbilden — mit vollständigem Datum, Unterschriftsfeldern und flexiblem Zeitraum — damit Nutzer die Abrechnung direkt einreichen können ohne manuelle Nacharbeit.

### Constraints

- **Responsive**: Alle UI-Änderungen müssen auf Desktop und Mobile funktionieren
- **Tech Stack**: React, Express, MySQL, ExcelJS — kein Rewrite
- **Deployment**: Docker Compose auf KKD-Server, Caddy Reverse Proxy
- **Excel-Format**: Offizielles Dienstfahrten-Abrechnungsformular (PDF-Referenz vorhanden)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (Node.js) - Backend runtime
- JavaScript (React) - Frontend application
- SQL - Database schema and migrations
- HTML5 - Frontend markup (compiled from JSX)
- CSS3 - Styling with Tailwind CSS and PostCSS
## Runtime
- Node.js 20 - Both frontend and backend build/serve
- npm - Dependency and script management
- Lockfile: `package-lock.json` present in both `frontend/` and `backend/`
## Frameworks
- Express.js 4.17.1 - Backend HTTP server and REST API
- React 18.3.1 - Frontend UI framework with hooks and context API
- React Router DOM 7.1.1 - Client-side routing
- React Test Scripts (via react-scripts 5.0.1) - Jest-based testing framework
- @testing-library/react 13.4.0 - React component testing utilities
- @testing-library/jest-dom 5.17.0 - Jest DOM matchers
- react-scripts 5.0.1 - Frontend build tooling (webpack, babel, dev server)
- nodemon 2.0.12 - Backend auto-reload during development
- Webpack (implicit via react-scripts) - Frontend bundling
- Babel (implicit via react-scripts) - JavaScript transpilation
- Tailwind CSS 3.4.12 - Utility-first CSS framework
- PostCSS 8.4.47 - CSS transformation pipeline
- Autoprefixer 10.4.20 - Browser vendor prefix generation
- Heroicons (React) 2.2.0 - Official Tailwind Labs icon library
- Lucide React 0.451.0 - Modern icon library
## Key Dependencies
- express 4.17.1 - Core backend framework for API routing and middleware
- react 18.3.1 - Core frontend UI library
- mysql2 2.3.0 - MySQL database driver with promise support
- jsonwebtoken 9.0.2 - JWT token generation and verification for authentication
- bcrypt 5.1.1 - Password hashing with salt rounds (critical for security)
- axios 1.7.7 - HTTP client for frontend API requests
- cors 2.8.5 - Cross-origin resource sharing middleware
- dotenv 10.0.0 / 16.4.7 - Environment variable management
- nodemailer 6.9.16 - SMTP email sending for password reset and verification emails
- exceljs 4.4.0 - Excel (.xlsx) file generation for exports
- xlsx 0.18.5 - Excel file parsing and generation
- jszip 3.10.1 - ZIP archive creation for bulk exports
- @babel/plugin-proposal-private-property-in-object 7.21.11 - Babel support for private class fields
- dotenv-webpack 8.1.0 - Webpack plugin for injecting env vars into frontend build
## Configuration
- Database: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Authentication: `JWT_SECRET`
- Email (SMTP): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`
- URLs: `FRONTEND_URL`, `CORS_ORIGIN`
- Initial Admin: `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_ADMIN_EMAIL`
- Defaults: `DEFAULT_ERSTATTUNG_TRAEGER`, `DEFAULT_ERSTATTUNG_MITFAHRER`, `DEFAULT_ERSTATTUNG_DATUM`
- `REACT_APP_TITLE` - Application title displayed in UI
- `REACT_APP_ALLOW_REGISTRATION` - Enable/disable user self-registration
- `REACT_APP_ALLOWED_EMAIL_DOMAINS` - Comma-separated list of allowed email domains for registration
- `REACT_APP_REGISTRATION_CODE` - Optional registration code requirement
- Backend: `Dockerfile` at `backend/Dockerfile` - Multi-stage not used, Node 20 base image
- Frontend: `backend/Dockerfile` - Multi-stage build: Node 20 → Nginx Alpine
- Frontend: `frontend/nginx.conf` - Nginx configuration for SPA routing (try_files fallback to index.html)
- Compose: `docker-compose.yml` (development) and `docker-compose.example.yml` (production template)
## Platform Requirements
- Node.js 20+ (specified in Dockerfiles)
- npm for dependency management
- Docker and Docker Compose (for containerized development)
- Docker and Docker Compose
- MySQL 8 database (included in compose stack)
- Reverse proxy (Caddy on server.godsapp.de at kkd-fahrtenbuch.de)
- Server: KKD (185.248.143.234, Caddy reverse proxy, /opt/fahrtenbuch/ stack directory)
- Frontend: Port 9642 (exposed by Nginx container)
- Backend: Port 5000 (Node.js server)
- Database: Port 3306 (MySQL, internal to compose network)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase with `.js` extension (e.g., `FahrtForm.js`, `Modal.js`, `OrtForm.js`)
- Backend controllers: camelCase ending with "Controller" (e.g., `fahrtController.js`, `ortController.js`, `authController.js`)
- Backend models: PascalCase (e.g., `Fahrt.js`, `User.js`, `Ort.js`)
- Utility files: camelCase (e.g., `distanceCalculator.js`, `excelExport.js`)
- Routes: camelCase (e.g., `fahrten.js`, `distanzen.js`, `abrechnungstraeger.js`)
- Frontend: camelCase for all functions and handlers (e.g., `handleSubmit`, `handleChange`, `renderOrteOptions`, `fetchDistanz`)
- Backend: camelCase for exported functions (e.g., `createFahrt`, `updateFahrt`, `getAllOrte`, `deleteOrt`)
- Async functions follow naming convention without special prefix (e.g., `fetchFahrten`, `fetchMonthlyData`)
- Frontend state variables: camelCase (e.g., `isLoggedIn`, `selectedMonth`, `formData`, `mitfahrer`)
- Backend request/response data: camelCase (e.g., `vonOrtId`, `nachOrtId`, `kilometer`, `anlass`)
- Database column names: snake_case (e.g., `von_ort_id`, `nach_ort_id`, `user_id`, `ist_dienstort`)
- Boolean variables: prefix with `is` or `has` (e.g., `istWohnort`, `isKilometerLocked`, `hasActiveNotification`)
- No TypeScript used in this project
- Database models are classes with static methods in PascalCase (e.g., `class Fahrt`, `class User`, `class Ort`)
## Code Style
- No dedicated formatter is configured (no `.prettierrc` or similar)
- 2-space indentation observed in all files
- Lines are generally kept reasonably short but no strict enforced limit
- ESLint configured in frontend via `react-app` preset
- Config location: `frontend/package.json` (eslintConfig section)
- No explicit `.eslintrc` file - uses defaults from `react-scripts`
- Backend has no linting configured (only `nodemon` for development)
## Import Organization
- No path aliases are used in this project
- Relative paths with `../` are standard throughout
## Error Handling
- Backend controllers: try/catch blocks with error logging via `console.error()` and standard HTTP error responses
- Frontend: axios error handling with conditional logic
- Transaction support: Database models use connection transactions with `.beginTransaction()`, `.commit()`, and `.rollback()`
- Examples: `User.createUserWithProfile()` in `User.js`, `Fahrt.create()` in `Fahrt.js`
- 400: Invalid request data (validation errors)
- 401: Authentication failures (missing token, invalid token)
- 403: Authorization failures (insufficient permissions)
- 404: Resource not found
- 500: Server errors with error message details
## Logging
- Error logging includes context: `console.error('Fehler beim Erstellen der Fahrt:', error);`
- Frontend logs to console during debug/development
- Backend logs to stdout (captured by docker/deployment system)
- Sensitive data (passwords, tokens) never logged
- German error messages for user-facing errors
- English comments for code clarity
## Comments
- German language used in user-facing messages (toasts, error notifications)
- English used in code comments explaining logic
- Comments explain the "why" rather than the "what"
- Comments mark important assumptions or non-obvious behaviors
- Not used in this project
- No function documentation format observed
- Inline comments used sparingly for complex logic
- `// Annahme: Der Benutzer ist authentifiziert` (in `ortController.js`)
- `// Kilometerberechnung, falls vonOrtId und nachOrtId vorhanden sind` (in `fahrtController.js`)
- `// Fügen Sie authMiddleware zu allen Routen hinzu` (in route files)
## Function Design
- Controller functions: Typically 40-80 lines handling request validation, business logic, and response
- Component functions: Typically 150-300 lines including state management and JSX rendering
- Utility functions: Kept small and focused (10-30 lines)
- Backend controller functions: Always take `(req, res)` parameters
- Model methods: Take data objects and userId for data isolation
- Frontend handlers: Take event objects (e.g., `(e)`) or data parameters
- Optional parameters use destructuring: `const { name, adresse, istWohnort = false } = req.body`
- Controllers: Always return via `res.status().json()` - no direct returns
- Model methods: Return database results, IDs, or boolean success status
- Frontend handlers: Usually void, modify state via setters
- Async functions: Return promises, errors handled via try/catch
## Module Design
- Backend models: Export class directly with static methods (e.g., `module.exports = Fahrt;`)
- Backend controllers: Export functions as object properties (e.g., `exports.createFahrt = async (req, res) => {}`)
- Backend routes: Export router object (e.g., `module.exports = router;`)
- Frontend components: Export as default (e.g., `export default FahrtForm;`)
- Frontend context/utilities: Named exports or default export
- No barrel files (index.js re-exports) observed in this project
- Each import is specific to the individual file
- `const Fahrt = require('../models/Fahrt');` - Direct model import
- `const { authMiddleware } = require('./middleware/authMiddleware');` - Named import
- `import { AppContext } from './App';` - Named context import
## Code Organization Patterns
- Models in `backend/models/` implement database operations
- Use `db.execute()` for parameterized queries (SQL injection prevention)
- Models return raw data or inserted IDs
- Database connections pooled via `db.getConnection()`
- Routes in `backend/routes/` define endpoints
- Controllers in `backend/controllers/` handle business logic
- Middleware in `backend/middleware/` handles cross-cutting concerns (auth, roles)
- Standard RESTful patterns: POST for create, GET for read, PUT for update, DELETE for delete
- Context API used via `AppContext` in `App.js`
- State providers wrap entire app via `AppProvider` component
- Custom hooks for shared logic (not explicitly observed but pattern set)
- Local component state with `useState` for form fields
- Frontend: axios for HTTP with async/await
- Backend: async/await for database operations
- Frontend interceptors for global error handling (401 logout)
- No explicit promise chains - async/await throughout
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Express.js backend serving REST API
- React frontend consuming REST API
- Database-driven with MySQL
- Middleware-based authentication (JWT + API Keys)
- User-scoped data isolation
- Transaction-based operations for data consistency
## Layers
- Purpose: React-based web UI for managing trips, locations, billing, and reports
- Location: `frontend/src/`
- Contains: React components, forms, modals, context providers, CSS/theme files
- Depends on: Axios HTTP client, React Router, Context API for state management
- Used by: End users via browser
- Purpose: HTTP endpoints handling request routing and middleware application
- Location: `backend/routes/`
- Contains: Express Router definitions with HTTP method mappings
- Depends on: Controllers, middleware for auth/authorization
- Used by: Frontend requests, authenticated clients
- Purpose: Request handling, data validation, service orchestration
- Location: `backend/controllers/`
- Contains: Controller functions that process requests and coordinate models/services
- Depends on: Models, services (mail), utilities, middleware results
- Used by: Routes, error handling
- Purpose: Database abstraction and data access
- Location: `backend/models/`
- Contains: Class-based static methods for CRUD operations, transactions, complex queries
- Depends on: Database connection pool, utils
- Used by: Controllers, services
- Purpose: Configuration, database connection, initialization
- Location: `backend/config/`, `backend/migrations/`
- Contains: Database pool setup, migration runner, environment config
- Depends on: mysql2, environment variables
- Used by: Models, initialization process
- Purpose: Reusable business logic (mail sending, distance calculation, Excel export)
- Location: `backend/services/`, `backend/utils/`
- Contains: Distance calculator, mail service, Excel export, migration runner
- Depends on: External packages (nodemailer, exceljs), database
- Used by: Controllers, models
- Purpose: Cross-cutting concerns (authentication, authorization)
- Location: `backend/middleware/`
- Contains: Auth middleware (JWT + API key validation), role-based middleware
- Depends on: jsonwebtoken, models (User, ApiKey)
- Used by: Routes, globally in app setup
## Data Flow
- `AppContext` holds global state: user, token, trips, locations, billing providers
- Component-level state for forms and modals
- Axios interceptor sets auth header globally
- Token stored in localStorage, repopulated on app load
- `refreshAllData()` fetches all related data via Promise.all()
## Key Abstractions
- Purpose: Scope all queries to current user's data
- Examples: `Fahrt.findAll(userId)`, `Abrechnung.find(userId)`, `Distanz.findAll(userId)`
- Pattern: Every model method accepts userId parameter and filters results in SQL WHERE clause
- Prevents cross-user data leakage
- Purpose: Auto-calculate kilometers between known locations or store manual overrides
- Examples: `backend/utils/distanceCalculator.js`
- Pattern: When trip created with from/to location IDs, lookup distance in Distanz table; if not found, use manual kilometer input
- Used in: Trip creation form, trip creation controller
- Purpose: Track which organization/provider receives billing
- Examples: `AbrechnungsTraeger` (Billing Provider), `AbrechnungsErstattung` (Reimbursement)
- Pattern: Each trip assigned to one billing provider; reports aggregated per provider and time period
- Purpose: Generate downloadable trip reports with user metadata
- Examples: `backend/utils/excelExport.js` → `fahrtController.exportToExcel()`
- Pattern: Query trips for period → fetch user profile → format data → create workbook → stream to client
- Purpose: Allow programmatic access without JWT tokens
- Examples: `backend/models/ApiKey.js` → validated in `authMiddleware`
- Pattern: X-API-Key header checked before JWT, if valid loads user from database
## Entry Points
- Location: `backend/app.js`
- Triggers: `npm start` or `npm run dev`
- Responsibilities:
- Location: `frontend/src/index.js`
- Triggers: npm/yarn start, build process
- Responsibilities:
- Location: `backend/initDb.js`
- Triggers: At app startup via `initializeDatabase()`
- Responsibilities:
- Location: `backend/routes/auth.js` → `backend/controllers/authController.js`
- Triggers: User login/register requests
- Responsibilities:
## Error Handling
- Database transactions automatically rollback on exception
- Controllers catch errors, log, return appropriate HTTP status (400, 401, 403, 500)
- Model methods throw errors up to controller for handling
- Frontend axios interceptors catch 401 responses, redirect to login
- Validation happens in controller before model operations
## Cross-Cutting Concerns
- User input validated in controller before passing to model
- Database schema constraints (NOT NULL, FOREIGN KEY, UNIQUE)
- Email verification required for certain operations (email_verified flag)
- JWT issued at login with 1-day expiration
- API keys validated via database lookup with last_used timestamp update
- All protected routes require `authMiddleware` attachment
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
