# Testing Patterns

**Analysis Date:** 2026-03-21

## Test Framework

**Runner:**
- Frontend: `react-scripts test` (Jest via create-react-app)
  - Version: Implicit from `react-scripts@5.0.1`
  - Config: Embedded in `react-scripts` - no custom `jest.config.js` file
  - Location: `frontend/package.json` scripts section
- Backend: **No test framework configured**
  - Backend package.json shows: `"test": "echo \"Error: no test specified\" && exit 1"`
  - No Jest, Mocha, or other test runner installed
  - No test files present in backend

**Assertion Library:**
- Frontend: `@testing-library/react@^13.4.0` and `@testing-library/jest-dom@^5.17.0`
- Backend: N/A - no testing setup

**Run Commands:**
```bash
npm test                 # Run frontend tests (watch mode default)
npm run build            # Build frontend (includes test during CI)
npm run dev              # Backend development with nodemon (no tests)
npm start                # Backend production mode
```

## Test File Organization

**Location:**
- Frontend: Co-located with components using naming convention `.test.js`
  - Example: `frontend/src/App.test.js` alongside `App.js`
  - Pattern: `[ComponentName].test.js`

**Naming:**
- Frontend test files: PascalCase component name + `.test.js`
- Example: `App.test.js`, `FahrtForm.test.js` (if existed)

**Structure:**
```
frontend/
├── src/
│   ├── App.js
│   ├── App.test.js                    # Tests for App
│   ├── FahrtForm.js                   # (no test file exists)
│   ├── Modal.js                       # (no test file exists)
│   ├── components/
│   │   ├── DistanzForm.js             # (no test file exists)
│   │   └── OrtForm.js                 # (no test file exists)
│   └── setupTests.js                  # Jest configuration
```

## Test Structure

**Suite Organization (Current):**
```javascript
// frontend/src/App.test.js
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
```

**Setup File (`setupTests.js`):**
```javascript
// frontend/src/setupTests.js
import '@testing-library/jest-dom';
```

The setup file:
- Loads testing-library DOM matchers
- Runs before all test files
- Global Jest setup configuration

**Patterns:**
- **Setup**: `setupTests.js` automatically loaded by Jest via react-scripts
- **Teardown**: Jest handles cleanup automatically; no explicit teardown observed
- **Assertion**: Testing-library provides `screen` utilities for querying DOM

## Mocking

**Framework:** Jest mocking (built into react-scripts)

**Patterns:**
- No explicit mocking observed in current test file
- Jest can mock axios for API calls: `jest.mock('axios')`
- Mocking would be done at top of test file:
  ```javascript
  jest.mock('axios');
  import axios from 'axios';
  ```
- Example pattern (not currently used):
  ```javascript
  axios.get.mockResolvedValue({
    data: { id: 1, name: 'Test' }
  });
  ```

**What to Mock:**
- HTTP requests via axios (API calls)
- External library integrations
- localStorage access (if needed)
- Context providers for isolated component tests

**What NOT to Mock:**
- React components in same directory (render actual components)
- Built-in DOM elements
- Navigation logic (react-router-dom) - test navigation interactions
- Context consumers when testing context behavior

## Fixtures and Factories

**Test Data:**
- No dedicated fixtures or factory patterns observed
- Test data typically inline in test files
- Example from `App.test.js`: Uses direct component rendering without data setup

**Location:**
- Would typically live in `frontend/src/__tests__/fixtures/` or similar if implemented
- Currently no fixtures directory present
- Data setup done directly in test functions

**Recommended pattern (not yet implemented):**
```javascript
// frontend/src/__tests__/fixtures/ortFixtures.js
export const mockOrte = [
  { id: 1, name: 'Meldorf', ist_dienstort: true },
  { id: 2, name: 'Home', ist_wohnort: true }
];

// In test file:
import { mockOrte } from '../fixtures/ortFixtures';
```

## Coverage

**Requirements:** Not enforced - no coverage configuration found

**View Coverage (if configured):**
```bash
npm test -- --coverage    # Would show coverage if configured
```

Currently no coverage thresholds or reporting configured in `package.json`.

## Test Types

**Unit Tests:**
- Scope: Individual React components
- Approach: Render component, query DOM elements, assert presence/values
- Pattern in `App.test.js`: Renders component and checks for text content
- Not extensively implemented - only placeholder test exists

**Integration Tests:**
- Not explicitly configured
- Would test interactions between components and API calls
- Example: Testing form submission with mocked API
- No integration tests currently present

**E2E Tests:**
- Framework: Not used
- No Cypress, Playwright, or similar configured
- Manual testing appears to be primary QA method

## Common Patterns

**Async Testing:**
- Would use async/await with Testing Library:
```javascript
test('async data loading', async () => {
  render(<FahrtForm />);
  const button = screen.getByRole('button', { name: /submit/i });

  // fireEvent is available for user interactions
  fireEvent.click(button);

  // Wait for async operations
  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```
- Not observed in current tests

**Error Testing:**
- Would test error states and error messages:
```javascript
jest.mock('axios');
axios.get.mockRejectedValue(new Error('Network error'));

test('handles API errors', async () => {
  render(<FahrtForm />);
  // Verify error message is shown
  await waitFor(() => {
    expect(screen.getByText(/fehler/i)).toBeInTheDocument();
  });
});
```
- Not currently implemented

## Testing Best Practices (Not Yet Implemented)

**Gaps in current setup:**
1. Backend has no tests at all
   - Critical components without coverage: authentication, database operations, business logic
   - Recommendation: Add Jest or Mocha with sample tests for critical endpoints

2. Frontend has minimal tests
   - Only placeholder test for App component
   - No component tests for forms, modals, or context usage
   - Recommendation: Add tests for:
     - `FahrtForm.js` - form validation and submission
     - `Modal.js` - modal open/close behavior
     - `OrtForm.js`, `DistanzForm.js` - form interactions
     - API integration (mocked axios calls)

3. No integration tests between frontend and backend

4. No E2E tests for user workflows

**Recommended testing additions:**
- Backend: Add `npm test` command using Jest with `--setupFiles` for database mocking
- Frontend: Increase coverage of critical user flows (login, form submission, CRUD operations)
- Fixture setup for consistent test data across components

---

*Testing analysis: 2026-03-21*
