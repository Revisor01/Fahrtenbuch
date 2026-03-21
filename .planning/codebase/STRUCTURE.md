# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```
/Users/simonluthe/Documents/Fahrtenbuch/
├── backend/                    # Express.js REST API server
│   ├── config/                # Database configuration
│   ├── controllers/           # Request handlers
│   ├── middleware/            # Authentication & authorization
│   ├── migrations/            # SQL migration files
│   ├── models/                # Database abstraction (ORM-like)
│   ├── routes/                # HTTP endpoint definitions
│   ├── services/              # Business services (mail, etc)
│   ├── templates/             # Email templates
│   ├── utils/                 # Utilities (distance calc, export, migration runner)
│   ├── app.js                 # Express app setup & routes mounting
│   ├── initDb.js              # Database initialization script
│   ├── package.json           # Dependencies
│   └── docker-compose.yml     # Docker build definition
├── frontend/                  # React web application
│   ├── public/                # Static assets
│   ├── src/                   # React source code
│   │   ├── components/        # Reusable React components
│   │   ├── App.js             # Main app with routing & context
│   │   ├── index.js           # React DOM mount point
│   │   ├── index.css          # Global styles
│   │   ├── themes.css         # Theme definitions
│   │   ├── darkMode.css       # Dark mode overrides
│   │   ├── utils.js           # Helper functions
│   │   ├── ThemeContext.js    # Theme provider
│   │   └── *.js               # Feature/page components
│   ├── package.json           # Dependencies
│   └── docker-compose.yml     # Docker build definition
├── .github/workflows/         # CI/CD pipelines
├── .planning/codebase/        # Codebase analysis documents
├── docker-compose.yml         # Multi-service orchestration
└── README.md                  # Project documentation
```

## Directory Purposes

**`backend/config/`:**
- Purpose: Database connection and environment configuration
- Contains: `database.js` (mysql2 connection pool)
- Key files: `database.js`

**`backend/controllers/`:**
- Purpose: HTTP request handlers and business logic coordination
- Contains: One file per resource (fahrtController, ortController, userController, etc)
- Key files:
  - `fahrtController.js` - Trip CRUD, export, reports
  - `userController.js` - User management (admin)
  - `authController.js` - Login, register, password reset
  - `ortController.js` - Location CRUD
  - `distanzController.js` - Distance CRUD
  - `abrechnungstraegerController.js` - Billing provider CRUD
  - `mitfahrerErstattungController.js` - Passenger reimbursement rates

**`backend/middleware/`:**
- Purpose: Cross-cutting concerns (auth, authorization)
- Contains: Authentication and role-based authorization
- Key files: `authMiddleware.js` (JWT + API key validation, role checks)

**`backend/migrations/`:**
- Purpose: Database schema versioning
- Contains: SQL files executed in order at startup
- Key files:
  - `0001_initial_schema.sql` - Tables, constraints, indexes
  - `0002_admin_user.sql` - Initial admin user
  - `0003_create_email_verifications_table.sql` - Email verification
  - `0004_initial_abrechnungstraeger.sql` - Billing provider seeds
  - `0005_add_standard_orte.sql` - Standard location seeds

**`backend/models/`:**
- Purpose: Database access layer (query building, CRUD, transactions)
- Contains: Class-based static methods for data operations
- Key files:
  - `User.js` - User profile and authentication operations
  - `Fahrt.js` - Trip CRUD, monthly/yearly summaries
  - `Mitfahrer.js` - Passenger data per trip
  - `Ort.js` - Location CRUD (from/to locations)
  - `Distanz.js` - Distance lookup between locations
  - `AbrechnungsTraeger.js` - Billing provider CRUD
  - `Abrechnung.js` - Trip billing status tracking
  - `MitfahrerErstattung.js` - Reimbursement rate CRUD
  - `ApiKey.js` - API key validation and management

**`backend/routes/`:**
- Purpose: HTTP endpoint routing
- Contains: Express Router definitions mapping HTTP methods to controllers
- Key files:
  - `auth.js` - POST /login, POST /register
  - `fahrten.js` - CRUD + export + reporting endpoints
  - `orte.js` - Location CRUD
  - `distanzen.js` - Distance lookup/CRUD
  - `abrechnungstraeger.js` - Billing provider CRUD
  - `users.js` - User admin endpoints
  - `apiKeys.js` - API key management
  - `profile.js` - User profile read
  - `mitfahrerErstattung.js` - Reimbursement rates

**`backend/services/`:**
- Purpose: Reusable business logic extracted from controllers
- Contains: Specialized services (mail, notifications)
- Key files: `mailService.js` (email sending via SMTP)

**`backend/templates/`:**
- Purpose: Email template content
- Contains: HTML email templates
- Notes: Referenced by mailService for welcome, verification, password reset

**`backend/utils/`:**
- Purpose: Utility functions and complex operations
- Contains:
  - `distanceCalculator.js` - Lookup/calculate distance between locations
  - `excelExport.js` - Trip report Excel generation
  - `Migrator.js` - Migration runner (executes SQL files in order)

**`frontend/src/`:**
- Purpose: React source code
- Contains: Components, pages, styling, state management
- Key files:
  - `App.js` (96KB) - Main app with routing, context provider, global state
  - `FahrtForm.js` - Trip creation/editing form
  - `LandingPage.js` - Login/register UI
  - `ProfileModal.js` - User profile editor
  - `UserManagement.js` - Admin user CRUD
  - `ResetPassword.js`, `SetPassword.js`, `VerifyEmail.js` - Auth flows
  - `ThemeContext.js` - Dark mode provider
  - `utils.js` - Helper functions for rendering dropdowns, formatting

**`frontend/src/components/`:**
- Purpose: Reusable React components
- Contains: Forms, modals, lists for specific features
- Key files:
  - `OrtForm.js`, `OrteListe.js` - Location management UI
  - `DistanzForm.js`, `DistanzenListe.js` - Distance management UI
  - `AbrechnungstraegerForm.js` - Billing provider UI
  - `ErstattungssaetzeForm.js` - Reimbursement rates UI
  - `Modal.js` - Reusable modal wrapper
  - `InfoModal.js`, `HilfeModal.js` - Info/help dialogs
  - `NewFeaturesModal.js` - Feature announcements

## Key File Locations

**Entry Points:**
- `backend/app.js` - Backend server startup, route mounting, static file serving
- `backend/initDb.js` - Database migration runner (called by app.js)
- `frontend/src/index.js` - React app mount point

**Configuration:**
- `backend/config/database.js` - MySQL connection pool
- `.env` file (not committed) - Environment variables (DB creds, JWT secret, SMTP config)
- `docker-compose.yml` - Multi-service docker orchestration
- `frontend/package.json` - Proxy to `http://localhost:5000` for local development

**Core Logic:**
- `backend/controllers/fahrtController.js` - Trip operations (create, read, update, delete, export, monthly/yearly summaries)
- `backend/controllers/authController.js` - Authentication (login, register, password reset)
- `backend/models/Fahrt.js` - Trip persistence and complex queries
- `backend/middleware/authMiddleware.js` - JWT + API key validation
- `frontend/src/App.js` - React routing, global state (context), API coordination

**Testing:**
- `frontend/src/App.test.js` - Basic React test (minimal)
- `backend/package.json` - `"test": "echo \"Error: no test specified\" && exit 1"` (no tests configured)

## Naming Conventions

**Files:**
- Controllers: `{resource}Controller.js` (e.g., `fahrtController.js`, `userController.js`)
- Models: `{Resource}.js` with PascalCase (e.g., `Fahrt.js`, `AbrechnungsTraeger.js`)
- Routes: `{resource}.js` lowercase (e.g., `fahrten.js`, `orte.js`)
- Middleware: `{purpose}Middleware.js` (e.g., `authMiddleware.js`)
- Services: `{service}Service.js` (e.g., `mailService.js`)
- Frontend components: `{Feature}Modal.js`, `{Feature}Form.js`, `{Feature}Liste.js` (e.g., `OrtForm.js`, `DistanzForm.js`)
- Frontend utilities: `utils.js`, CSS files co-located with usage

**Directories:**
- Backend feature directories: lowercase plural (controllers, models, routes, services)
- Frontend feature directories: lowercase singular (components)
- Singular naming: `config`, `middleware`, `utils`, `services`, `templates`

**Code:**
- Database column names: snake_case (e.g., `von_ort_id`, `einmaliger_von_ort`, `email_verified`)
- JavaScript variables: camelCase (e.g., `vonOrtId`, `mitfahrerData`, `fahrtId`)
- React component names: PascalCase (e.g., `FahrtForm`, `OrtForm`, `ProfileModal`)
- Model class names: PascalCase (e.g., `Fahrt`, `Mitfahrer`, `AbrechnungsTraeger`)
- Controller exports: camelCase function names (e.g., `exports.createFahrt`, `exports.getAllFahrten`)

## Where to Add New Code

**New Feature (e.g., new resource like "Fahrzeugtag"):**

1. **Database Schema:**
   - Create migration file in `backend/migrations/000X_add_fahrzeugtag_table.sql`
   - Define table with proper relationships and user_id foreign key

2. **Backend Model:**
   - Create `backend/models/Fahrzeugtag.js`
   - Implement static methods: `create()`, `findAll(userId)`, `findById()`, `update()`, `delete()`
   - Use database connection pool with promises: `const [rows] = await db.execute(...)`
   - Include userId in all WHERE clauses for security

3. **Backend Routes:**
   - Create `backend/routes/fahrzeugtag.js`
   - Import controller and auth middleware
   - Mount routes: POST, GET /, GET/:id, PUT/:id, DELETE/:id
   - Apply `authMiddleware` to protect endpoints

4. **Backend Controller:**
   - Create `backend/controllers/fahrzeugtag Controller.js`
   - Implement handler functions matching routes
   - Extract userId from `req.user.id`
   - Call model methods, handle errors, return JSON responses

5. **App.js Route Registration:**
   - In `backend/app.js`, import new routes: `const fahrzeugtag Routes = require('./routes/fahrzeugtag')`
   - Mount route: `app.use('/api/fahrzeugtag', authMiddleware, fahrzeutagRoutes)`

6. **Frontend Component:**
   - Create component files in `frontend/src/components/` for form, list, modal
   - Use axios to call `/api/fahrzeugtag` endpoints
   - Get auth token from context: `token` from `AppContext`
   - Update global state in `App.js` context as needed (add state, add fetch function, add to `refreshAllData`)

7. **Frontend Pages:**
   - Add page component or integrate into existing tab in `App.js`
   - Add route in `<Routes>` block if needed

**New Component (UI reusable):**
- Create in `frontend/src/components/{ComponentName}.js`
- Accept props for data and callbacks
- Use context for global state if needed

**New Utility Function:**
- Backend: `backend/utils/{purpose}.js` with exported functions
- Frontend: Add to `frontend/src/utils.js` or create dedicated file if complex
- Export as named exports

**New Service (business logic):**
- Create `backend/services/{service}Service.js`
- Class-based with static methods preferred for consistency
- Import in controller and call from handler functions

## Special Directories

**`backend/migrations/`:**
- Purpose: Database schema versioning
- Generated: No (hand-written SQL)
- Committed: Yes
- Pattern: Numbered sequentially (0001, 0002, ...), run once in order
- How to add: Create new migration file, migrations run automatically on `initDb.js`

**`frontend/public/`:**
- Purpose: Static assets served by Express
- Generated: No
- Committed: Yes (images, icons, manifest)
- Note: React built version also served from here after build

**`node_modules/` (both backend and frontend):**
- Purpose: Installed npm dependencies
- Generated: Yes (npm install)
- Committed: No (.gitignore)

**`dist/` and `build/` (frontend):**
- Purpose: Compiled production-ready React and backend code
- Generated: Yes (npm run build)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-03-21*
