# Codebase Concerns

**Analysis Date:** 2026-03-21

## Tech Debt

**Incomplete Mitfahrer Reimbursement Logic:**
- Issue: Mitfahrer (passenger) reimbursement rates are hardcoded to 0.05 EUR/km instead of using date-specific rates from database
- Files: `backend/controllers/fahrtController.js` (line 341-342)
- Impact: Incorrect reimbursement calculations when passenger rates change. Monthly reports will not reflect current passenger reimbursement rates.
- Fix approach: Query `mitfahrer_erstattung_saetze` table with the travel date to fetch the correct rate for that period, similar to how main reimbursement rates are handled

**Excessive Debug Logging in Production:**
- Issue: 168+ console.log/console.error statements remain in codebase, including 4 "DEBUGGING" prefixed logs in Frontend
- Files:
  - `frontend/src/App.js` (lines 689, 704, 723, 735, 740) - Return trip matching logic
  - Multiple other files with console.error statements
- Impact: Log pollution in production environment, potential exposure of sensitive data in error logs, poor performance in large-scale deployments
- Fix approach: Remove all "DEBUGGING" logs immediately. Replace remaining debug logs with proper logging framework (e.g., winston, pino) with environment-based log levels (debug only in development)

**Monolithic Frontend Component:**
- Issue: `App.js` has 2,949 lines - main component handles authentication, data fetching, business logic, and UI rendering
- Files: `frontend/src/App.js`
- Impact: Difficult to test, maintain, and extend. Changes in one area risk breaking others. Hard to reason about component behavior.
- Fix approach: Break into smaller components with clear separation: AppProvider (context only), useAppData (custom hook for fetching), Dashboard (main UI), etc.

**Insufficient Input Validation:**
- Issue: Minimal validation of incoming request bodies before processing. No schema validation library (e.g., joi, zod) used.
- Files:
  - `backend/controllers/fahrtController.js` - Missing checks for required fields
  - `backend/controllers/userController.js` - No email format validation
  - `backend/controllers/ortController.js` - No validation of address or location names
- Impact: Can accept invalid data, malformed dates, negative kilometers, empty strings. Data integrity issues in database.
- Fix approach: Implement schema validation middleware using joi or zod. Validate all required fields, data types, formats, and ranges before reaching model layer.

**Missing Error Messages Exposure:**
- Issue: Some error responses return `error.message` directly to client (e.g., fahrtController lines 64, 117, 126)
- Files: `backend/controllers/fahrtController.js` (multiple locations), other controllers
- Impact: Internal database errors and stack traces exposed to users, potential information disclosure vulnerability
- Fix approach: Log full errors server-side, return generic client-safe messages ("An error occurred") in responses

## Known Bugs

**Return Trip Matching Logic Fragility:**
- Symptoms: Return trip auto-linking may fail when location IDs don't match exactly or when "Rückfahrt" text casing differs
- Files: `frontend/src/App.js` (lines 713-741)
- Trigger: Creating a return trip when origin/destination are swapped but not exact ID matches, or mixed case "rückfahrt"/"Rückfahrt"
- Workaround: Manually link trips by editing and setting the anlass field consistently

**Race Condition in Axios Interceptors:**
- Symptoms: Multiple 401 logout triggers from parallel failed requests
- Files: `frontend/src/App.js` (lines 117-126)
- Trigger: Several API calls fail simultaneously due to expired token
- Workaround: Token refresh would prevent this, but currently not implemented
- Fix: Implement token refresh mechanism or request queueing when 401 occurs

## Security Considerations

**Weak Password Requirements:**
- Risk: No minimum password length, complexity rules, or entropy checks enforced
- Files: `backend/controllers/userController.js`
- Current mitigation: bcrypt hashing on storage
- Recommendations:
  - Enforce minimum 12 character password with mixed case, numbers, symbols
  - Check against common password lists using library like `zxcvbn-typescript`
  - Implement rate limiting on password change endpoint

**No Rate Limiting on Authentication:**
- Risk: Brute force attacks possible on login endpoint
- Files: `backend/routes/auth.js`
- Current mitigation: None
- Recommendations: Use `express-rate-limit` package with exponential backoff

**CORS Origin Configuration Inconsistency:**
- Risk: Development default hardcoded as `https://kkd-fahrtenbuch.de` in code (line 22, app.js)
- Files: `backend/app.js` (line 22)
- Current mitigation: Overridden by environment variable in production
- Recommendations: Fail fast with error if CORS_ORIGIN env var not set, don't provide defaults

**Missing CSRF Protection:**
- Risk: State-changing operations (POST/PUT/DELETE) not protected against cross-site request forgery
- Files: Backend API endpoints lack CSRF tokens
- Current mitigation: None (relies on Bearer token in header)
- Recommendations: Add CSRF tokens for browser-based requests, or enforce SameSite cookie policy if using cookies

**JWT Token Storage in localStorage:**
- Risk: Tokens stored in localStorage vulnerable to XSS attacks
- Files: `frontend/src/App.js` (lines 30, 143, 144)
- Current mitigation: None
- Recommendations: Move to httpOnly, Secure cookie with SameSite=Strict if feasible, or implement token refresh with shorter expiry

**No Request Body Size Limits:**
- Risk: DoS vulnerability - unlimited upload of Excel exports or large data
- Files: `backend/app.js` (express.json() called without limit parameter)
- Current mitigation: None
- Recommendations: Set `express.json({ limit: '10mb' })` and validate file sizes

**SQL Injection Resistance:**
- Status: Mostly protected by parameterized queries
- Files: All database calls in controllers and models
- Note: Code uses prepared statements correctly (`db.execute()` with placeholders), so SQL injection risk is low. Continue this practice.

## Performance Bottlenecks

**N+1 Query Problem in User Listing:**
- Problem: `getAllUsers()` executes main query, then runs separate queries for each user's dienstort
- Files: `backend/controllers/userController.js` (lines 36-50)
- Cause: Loop with database query for each user (N users = 1 + N queries)
- Improvement path: Use LEFT JOIN with GROUP_CONCAT or separate single query with all needed data, cache dienstort data

**Unrestricted Monthly Data Queries:**
- Problem: No pagination or date range filtering on journey listing
- Files: `backend/controllers/fahrtController.js`
- Cause: All journeys loaded into memory, then filtered client-side
- Improvement path: Implement backend-side filtering by date range, pagination (limit/offset)

**Frontend Monolithic Data Fetching:**
- Problem: `refreshAllData()` fetches all orte, distanzen, fahrten, abrechnungstraeger in parallel without checking if data changed
- Files: `frontend/src/App.js` (lines 56-85)
- Cause: No change detection, always full refetch
- Improvement path: Implement server-side timestamps, only refetch if data actually changed

**No Database Query Optimization:**
- Problem: Multiple LEFT JOINs in complex queries, no indexes documented
- Files: `backend/controllers/userController.js`, `backend/models/Fahrt.js`
- Cause: No query performance analysis done
- Improvement path: Add indexes on frequently queried columns (user_id, datum, abrechnung), analyze EXPLAIN plans

## Fragile Areas

**Mitfahrer (Passenger) Module:**
- Files: `backend/models/Mitfahrer.js`, `frontend/src/MitfahrerModal.js`, passenger logic scattered across controllers
- Why fragile: Passenger handling is distributed across multiple files with inconsistent field names (richtung/direction/Arbeitsstaette). Changes to passenger data structure require updates in multiple locations.
- Safe modification: Create dedicated MitfahrerService with all passenger logic (create, update, delete, calculate reimbursement)
- Test coverage: Minimal - no dedicated tests for passenger creation/deletion scenarios

**Abrechnungsstatus (Billing Status) Tracking:**
- Files: `backend/controllers/fahrtController.js`, `frontend/src/App.js`
- Why fragile: Multiple status fields (eingereicht_kirchengemeinde, eingereicht_kirchenkreis, erhalten_kirchengemeinde) tracked separately, status updates are hard-coded without validation
- Safe modification: Create explicit state machine for status transitions with validation
- Test coverage: None visible

**Excel Export:**
- Files: `backend/utils/excelExport.js` (229 lines)
- Why fragile: Large utility function with complex logic, tightly coupled to data format. Changes to reimbursement calculation logic must be mirrored in export logic.
- Safe modification: Extract reimbursement calculation into separate module used by both API and export
- Test coverage: No tests found

## Scaling Limits

**Database Scalability:**
- Current capacity: Single MySQL 8 instance (no replication/clustering)
- Limit: Performance degrades significantly above ~100K journeys per user across all users, or 1M total journeys
- Scaling path:
  - Add read replicas for reporting queries
  - Archive old journeys (>2 years) to separate table
  - Implement connection pooling (currently db.execute() uses default pool)

**Frontend Bundle Size:**
- Current capacity: Create React App default optimizations
- Limit: No code splitting observed, all routes loaded at startup
- Scaling path: Implement React.lazy() for modals, implement proper route-based code splitting

**Real-Time Collaboration:**
- Current: Not supported - concurrent edits to same journey cause conflicts
- Capacity: Single user per journey maximum
- Scaling path: Implement optimistic locking or operational transformation if real-time collaboration needed

## Dependencies at Risk

**outdated/unmaintained packages:**
- `react-scripts 5.0.1` - CRA is in maintenance mode, consider migration to Vite or Next.js
- `exceljs 4.4.0` - Check for security patches, not actively developed
- Risk: Security vulnerabilities not patched, missing modern optimizations
- Migration plan: Move to `xlsx` (already in package.json but not used) or `fast-xlsx` for faster exports

**Missing Security Packages:**
- No `helmet` for HTTP headers
- No `express-rate-limit` for rate limiting
- No input validation library (joi/zod)
- Risk: Vulnerable to common attacks (XSS, CSRF, brute force)
- Add to dependencies: `helmet`, `express-rate-limit`, `zod` (or `joi`)

## Missing Critical Features

**No Audit Logging:**
- Problem: Cannot track who changed what and when. User profile edits, journey deletions, status changes not logged.
- Blocks: Compliance requirements, dispute resolution, security investigation
- Impact: Medium - organizational risk if inaccurate data claims arise

**No Data Export for Tax/Compliance:**
- Problem: Only Excel export supported, no standardized formats (CSV, PDF with signatures)
- Blocks: Simplified compliance with tax authorities in some regions
- Impact: Medium

**No Two-Factor Authentication:**
- Problem: Only username/password authentication
- Blocks: Enhanced security for admin accounts
- Impact: Medium - low adoption, high security value

**No API Key Expiration/Rotation:**
- Problem: API keys created but no expiration or manual rotation mechanism
- Blocks: Compromised key remediation difficult
- Impact: Medium - low likelihood but high impact if key compromised

## Test Coverage Gaps

**Frontend has no meaningful tests:**
- What's not tested: App.js context management, API interactions, form validation, state transitions
- Files: `frontend/src/App.test.js` is empty, other components have no test files
- Risk: Refactoring breaks functionality silently, regressions not caught until production
- Priority: High - critical path code (auth, journey creation) needs coverage

**Backend has no test suite:**
- What's not tested: Controller logic, authorization checks, reimbursement calculations, data validation
- Files: No test files found in `backend/`
- Risk: Changes to billing logic or auth could introduce critical bugs
- Priority: High - billing accuracy is mission-critical

**No integration tests:**
- What's not tested: End-to-end workflows (create journey → add passenger → calculate reimbursement → export)
- Files: None
- Risk: Components work in isolation but fail together
- Priority: High

**No performance tests:**
- What's not tested: Query performance, concurrent request handling, large dataset handling
- Files: None
- Risk: Performance regressions discovered in production
- Priority: Medium

---

*Concerns audit: 2026-03-21*
