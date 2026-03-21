# Coding Conventions

**Analysis Date:** 2026-03-21

## Naming Patterns

**Files:**
- React components: PascalCase with `.js` extension (e.g., `FahrtForm.js`, `Modal.js`, `OrtForm.js`)
- Backend controllers: camelCase ending with "Controller" (e.g., `fahrtController.js`, `ortController.js`, `authController.js`)
- Backend models: PascalCase (e.g., `Fahrt.js`, `User.js`, `Ort.js`)
- Utility files: camelCase (e.g., `distanceCalculator.js`, `excelExport.js`)
- Routes: camelCase (e.g., `fahrten.js`, `distanzen.js`, `abrechnungstraeger.js`)

**Functions:**
- Frontend: camelCase for all functions and handlers (e.g., `handleSubmit`, `handleChange`, `renderOrteOptions`, `fetchDistanz`)
- Backend: camelCase for exported functions (e.g., `createFahrt`, `updateFahrt`, `getAllOrte`, `deleteOrt`)
- Async functions follow naming convention without special prefix (e.g., `fetchFahrten`, `fetchMonthlyData`)

**Variables:**
- Frontend state variables: camelCase (e.g., `isLoggedIn`, `selectedMonth`, `formData`, `mitfahrer`)
- Backend request/response data: camelCase (e.g., `vonOrtId`, `nachOrtId`, `kilometer`, `anlass`)
- Database column names: snake_case (e.g., `von_ort_id`, `nach_ort_id`, `user_id`, `ist_dienstort`)
- Boolean variables: prefix with `is` or `has` (e.g., `istWohnort`, `isKilometerLocked`, `hasActiveNotification`)

**Types:**
- No TypeScript used in this project
- Database models are classes with static methods in PascalCase (e.g., `class Fahrt`, `class User`, `class Ort`)

## Code Style

**Formatting:**
- No dedicated formatter is configured (no `.prettierrc` or similar)
- 2-space indentation observed in all files
- Lines are generally kept reasonably short but no strict enforced limit

**Linting:**
- ESLint configured in frontend via `react-app` preset
- Config location: `frontend/package.json` (eslintConfig section)
- No explicit `.eslintrc` file - uses defaults from `react-scripts`
- Backend has no linting configured (only `nodemon` for development)

## Import Organization

**Order (Frontend - React):**
1. React imports (e.g., `import React, { useState, useEffect }`)
2. External libraries (e.g., `import axios from 'axios'`, `import { BrowserRouter } from 'react-router-dom'`)
3. Icons and UI libraries (e.g., `import { HelpCircle, Settings } from 'lucide-react'`)
4. Local components (e.g., `import FahrtForm from './FahrtForm'`)
5. Context and utilities (e.g., `import { AppContext } from './App'`, `import { renderOrteOptions } from './utils'`)
6. CSS files (e.g., `import './index.css'`)

**Order (Backend - Node.js):**
1. Built-in modules (e.g., `const path = require('path')`, `const crypto = require('crypto')`)
2. External packages (e.g., `const express = require('express')`, `const bcrypt = require('bcrypt')`)
3. Local modules (e.g., `const db = require('../config/database')`, `const Fahrt = require('../models/Fahrt')`)
4. Middleware (e.g., `const { authMiddleware } = require('./middleware/authMiddleware')`)

**Path Aliases:**
- No path aliases are used in this project
- Relative paths with `../` are standard throughout

## Error Handling

**Patterns:**
- Backend controllers: try/catch blocks with error logging via `console.error()` and standard HTTP error responses
  - Example from `fahrtController.js`: `catch (error) { console.error('Fehler beim Erstellen der Fahrt:', error); res.status(500).json({ message: 'Fehler beim Erstellen der Fahrt', error: error.message }); }`
- Frontend: axios error handling with conditional logic
  - Errors logged via `console.error()` before rejection
  - User-facing errors displayed via `showNotification()` modal system
- Transaction support: Database models use connection transactions with `.beginTransaction()`, `.commit()`, and `.rollback()`
- Examples: `User.createUserWithProfile()` in `User.js`, `Fahrt.create()` in `Fahrt.js`

**Status Codes:**
- 400: Invalid request data (validation errors)
- 401: Authentication failures (missing token, invalid token)
- 403: Authorization failures (insufficient permissions)
- 404: Resource not found
- 500: Server errors with error message details

## Logging

**Framework:** No dedicated logging framework - uses `console.error()` for errors and `console.log()` for general output

**Patterns:**
- Error logging includes context: `console.error('Fehler beim Erstellen der Fahrt:', error);`
- Frontend logs to console during debug/development
- Backend logs to stdout (captured by docker/deployment system)
- Sensitive data (passwords, tokens) never logged
- German error messages for user-facing errors
- English comments for code clarity

## Comments

**When to Comment:**
- German language used in user-facing messages (toasts, error notifications)
- English used in code comments explaining logic
- Comments explain the "why" rather than the "what"
- Comments mark important assumptions or non-obvious behaviors

**JSDoc/TSDoc:**
- Not used in this project
- No function documentation format observed
- Inline comments used sparingly for complex logic

**Examples from codebase:**
- `// Annahme: Der Benutzer ist authentifiziert` (in `ortController.js`)
- `// Kilometerberechnung, falls vonOrtId und nachOrtId vorhanden sind` (in `fahrtController.js`)
- `// Fügen Sie authMiddleware zu allen Routen hinzu` (in route files)

## Function Design

**Size:**
- Controller functions: Typically 40-80 lines handling request validation, business logic, and response
- Component functions: Typically 150-300 lines including state management and JSX rendering
- Utility functions: Kept small and focused (10-30 lines)

**Parameters:**
- Backend controller functions: Always take `(req, res)` parameters
- Model methods: Take data objects and userId for data isolation
- Frontend handlers: Take event objects (e.g., `(e)`) or data parameters
- Optional parameters use destructuring: `const { name, adresse, istWohnort = false } = req.body`

**Return Values:**
- Controllers: Always return via `res.status().json()` - no direct returns
- Model methods: Return database results, IDs, or boolean success status
- Frontend handlers: Usually void, modify state via setters
- Async functions: Return promises, errors handled via try/catch

**Example from `fahrtController.js` (createFahrt):**
```javascript
exports.createFahrt = async (req, res) => {
  try {
    const { vonOrtId, nachOrtId, datum, ... } = req.body;
    const userId = req.user.id;
    // ... validation and business logic
    const id = await Fahrt.create(fahrtData, null, userId);
    res.status(201).json({ id, message: 'Fahrt erfolgreich erstellt' });
  } catch (error) {
    console.error('Fehler beim Erstellen der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen der Fahrt', error: error.message });
  }
};
```

## Module Design

**Exports:**
- Backend models: Export class directly with static methods (e.g., `module.exports = Fahrt;`)
- Backend controllers: Export functions as object properties (e.g., `exports.createFahrt = async (req, res) => {}`)
- Backend routes: Export router object (e.g., `module.exports = router;`)
- Frontend components: Export as default (e.g., `export default FahrtForm;`)
- Frontend context/utilities: Named exports or default export

**Barrel Files:**
- No barrel files (index.js re-exports) observed in this project
- Each import is specific to the individual file

**Example patterns:**
- `const Fahrt = require('../models/Fahrt');` - Direct model import
- `const { authMiddleware } = require('./middleware/authMiddleware');` - Named import
- `import { AppContext } from './App';` - Named context import

## Code Organization Patterns

**Database Layer:**
- Models in `backend/models/` implement database operations
- Use `db.execute()` for parameterized queries (SQL injection prevention)
- Models return raw data or inserted IDs
- Database connections pooled via `db.getConnection()`

**API Layer:**
- Routes in `backend/routes/` define endpoints
- Controllers in `backend/controllers/` handle business logic
- Middleware in `backend/middleware/` handles cross-cutting concerns (auth, roles)
- Standard RESTful patterns: POST for create, GET for read, PUT for update, DELETE for delete

**Frontend State Management:**
- Context API used via `AppContext` in `App.js`
- State providers wrap entire app via `AppProvider` component
- Custom hooks for shared logic (not explicitly observed but pattern set)
- Local component state with `useState` for form fields

**Async Patterns:**
- Frontend: axios for HTTP with async/await
- Backend: async/await for database operations
- Frontend interceptors for global error handling (401 logout)
- No explicit promise chains - async/await throughout

---

*Convention analysis: 2026-03-21*
