# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** MVC (Model-View-Controller) with layered separation

**Key Characteristics:**
- Express.js backend serving REST API
- React frontend consuming REST API
- Database-driven with MySQL
- Middleware-based authentication (JWT + API Keys)
- User-scoped data isolation
- Transaction-based operations for data consistency

## Layers

**Presentation Layer (Frontend):**
- Purpose: React-based web UI for managing trips, locations, billing, and reports
- Location: `frontend/src/`
- Contains: React components, forms, modals, context providers, CSS/theme files
- Depends on: Axios HTTP client, React Router, Context API for state management
- Used by: End users via browser

**API Layer (Backend Routes):**
- Purpose: HTTP endpoints handling request routing and middleware application
- Location: `backend/routes/`
- Contains: Express Router definitions with HTTP method mappings
- Depends on: Controllers, middleware for auth/authorization
- Used by: Frontend requests, authenticated clients

**Business Logic Layer (Controllers):**
- Purpose: Request handling, data validation, service orchestration
- Location: `backend/controllers/`
- Contains: Controller functions that process requests and coordinate models/services
- Depends on: Models, services (mail), utilities, middleware results
- Used by: Routes, error handling

**Persistence Layer (Models):**
- Purpose: Database abstraction and data access
- Location: `backend/models/`
- Contains: Class-based static methods for CRUD operations, transactions, complex queries
- Depends on: Database connection pool, utils
- Used by: Controllers, services

**Infrastructure Layer:**
- Purpose: Configuration, database connection, initialization
- Location: `backend/config/`, `backend/migrations/`
- Contains: Database pool setup, migration runner, environment config
- Depends on: mysql2, environment variables
- Used by: Models, initialization process

**Utility/Service Layer:**
- Purpose: Reusable business logic (mail sending, distance calculation, Excel export)
- Location: `backend/services/`, `backend/utils/`
- Contains: Distance calculator, mail service, Excel export, migration runner
- Depends on: External packages (nodemailer, exceljs), database
- Used by: Controllers, models

**Middleware Layer:**
- Purpose: Cross-cutting concerns (authentication, authorization)
- Location: `backend/middleware/`
- Contains: Auth middleware (JWT + API key validation), role-based middleware
- Depends on: jsonwebtoken, models (User, ApiKey)
- Used by: Routes, globally in app setup

## Data Flow

**Typical Request Flow (Authenticated):**

1. Frontend component calls `axios.get('/api/fahrten')`
2. Axios includes `Authorization: Bearer {token}` header
3. Express routes request to `GET /api/fahrten`
4. `authMiddleware` validates JWT or API key
5. Verified user attached to `req.user`
6. Route handler invokes `fahrtController.getAllFahrten()`
7. Controller calls `Fahrt.findAll(userId)` with user-scoped filter
8. Model executes SQL query using database connection pool
9. Results returned to controller
10. Controller formats and returns JSON response
11. Frontend receives data, updates state via Context API
12. Components re-render with new data

**Create with Transaction (Trip Creation):**

1. Frontend submits form with trip data (from location, to location, date, reason)
2. Controller validates: billing provider exists and belongs to user
3. If origin/destination are known locations: controller calls `getDistance()`
4. Controller builds transaction: `Fahrt.create()` + optional `Mitfahrer.create()`
5. Model begins transaction
6. Trip inserted → receives `fahrtId`
7. Passengers inserted with trip reference
8. Transaction commits or rolls back on error
9. Controller returns created trip with ID
10. Frontend optimistically updates local state, confirms with user

**State Management (Frontend):**
- `AppContext` holds global state: user, token, trips, locations, billing providers
- Component-level state for forms and modals
- Axios interceptor sets auth header globally
- Token stored in localStorage, repopulated on app load
- `refreshAllData()` fetches all related data via Promise.all()

## Key Abstractions

**User Authorization:**
- Purpose: Scope all queries to current user's data
- Examples: `Fahrt.findAll(userId)`, `Abrechnung.find(userId)`, `Distanz.findAll(userId)`
- Pattern: Every model method accepts userId parameter and filters results in SQL WHERE clause
- Prevents cross-user data leakage

**Distance Calculation:**
- Purpose: Auto-calculate kilometers between known locations or store manual overrides
- Examples: `backend/utils/distanceCalculator.js`
- Pattern: When trip created with from/to location IDs, lookup distance in Distanz table; if not found, use manual kilometer input
- Used in: Trip creation form, trip creation controller

**Billing Provider Aggregation:**
- Purpose: Track which organization/provider receives billing
- Examples: `AbrechnungsTraeger` (Billing Provider), `AbrechnungsErstattung` (Reimbursement)
- Pattern: Each trip assigned to one billing provider; reports aggregated per provider and time period

**Excel Export Pipeline:**
- Purpose: Generate downloadable trip reports with user metadata
- Examples: `backend/utils/excelExport.js` → `fahrtController.exportToExcel()`
- Pattern: Query trips for period → fetch user profile → format data → create workbook → stream to client

**API Key Authentication:**
- Purpose: Allow programmatic access without JWT tokens
- Examples: `backend/models/ApiKey.js` → validated in `authMiddleware`
- Pattern: X-API-Key header checked before JWT, if valid loads user from database

## Entry Points

**Backend Server Entry:**
- Location: `backend/app.js`
- Triggers: `npm start` or `npm run dev`
- Responsibilities:
  - Loads environment config
  - Initializes database (migrations)
  - Creates Express app
  - Mounts CORS middleware
  - Mounts all route handlers
  - Serves static React build
  - Listens on PORT (5000 dev, configurable production)

**Frontend Entry:**
- Location: `frontend/src/index.js`
- Triggers: npm/yarn start, build process
- Responsibilities:
  - Mounts React to DOM
  - Wraps App in providers (Theme, Context)

**Database Initialization:**
- Location: `backend/initDb.js`
- Triggers: At app startup via `initializeDatabase()`
- Responsibilities:
  - Runs all pending migrations
  - Hashes and updates initial admin password

**Authentication Flow:**
- Location: `backend/routes/auth.js` → `backend/controllers/authController.js`
- Triggers: User login/register requests
- Responsibilities:
  - User lookup by username/email
  - Password validation via bcrypt
  - JWT token generation with user ID and role
  - Email verification tokens for new registrations

## Error Handling

**Strategy:** Try-catch blocks in controllers and models; transaction rollback on database errors; meaningful error messages to client

**Patterns:**
- Database transactions automatically rollback on exception
- Controllers catch errors, log, return appropriate HTTP status (400, 401, 403, 500)
- Model methods throw errors up to controller for handling
- Frontend axios interceptors catch 401 responses, redirect to login
- Validation happens in controller before model operations

## Cross-Cutting Concerns

**Logging:** Console.log in controllers and middleware; timestamp and context included in auth logs

**Validation:**
- User input validated in controller before passing to model
- Database schema constraints (NOT NULL, FOREIGN KEY, UNIQUE)
- Email verification required for certain operations (email_verified flag)

**Authentication:**
- JWT issued at login with 1-day expiration
- API keys validated via database lookup with last_used timestamp update
- All protected routes require `authMiddleware` attachment

---

*Architecture analysis: 2026-03-21*
