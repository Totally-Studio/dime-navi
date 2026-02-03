# Testing Guide for DimeNotes

This guide explains how to run and write tests for the DimeNotes application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Firebase Emulators](#firebase-emulators)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js 18+** - Already installed
2. **Java Runtime Environment 11+** - Required for Firebase Emulators
   - Download: https://www.oracle.com/java/technologies/downloads/
   - Or OpenJDK: https://adoptium.net/

### Installation

All testing dependencies are already installed. If you need to reinstall:

```bash
npm install
npx playwright install chromium
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm run test:unit

# Run in watch mode (re-runs on file changes)
npm run test:unit:watch

# Run with UI
npm run test:unit:ui
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (great for debugging)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts
```

### Run All Tests

```bash
npm run test:all
```

## Writing Tests

### Unit Tests

Unit tests live in `tests/unit/` and use Vitest + React Testing Library.

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { hasRole } from '../../src/services/roleService';

describe('roleService', () => {
  describe('hasRole', () => {
    it('should allow super_admin to access super_admin features', () => {
      expect(hasRole('super_admin', 'super_admin')).toBe(true);
    });
  });
});
```

### E2E Tests

E2E tests live in `tests/e2e/` and use Playwright.

**Example:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DimeNotes/i);
  });
});
```

### Test Helpers

**Mock Users** (`tests/fixtures/mockUsers.ts`):

```typescript
import { mockSuperAdmin, mockRegularUser } from '../fixtures/mockUsers';

// Use in tests
const role = getUserRoleFromEmail(mockSuperAdmin as User);
```

**Firebase Emulator** (`tests/setup/firebase-emulator.ts`):

```typescript
import { initializeTestFirebase } from '../setup/firebase-emulator';

// Initialize Firebase with emulators
const { auth, db } = initializeTestFirebase();
```

## Firebase Emulators

### Starting Emulators

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only auth,firestore
```

The Emulator UI will be available at: http://localhost:4000

### Emulator Ports

- **Firestore**: 8080
- **Auth**: 9099
- **UI**: 4000

### Connecting Tests to Emulators

Tests in `tests/setup/firebase-emulator.ts` automatically connect to emulators when initialized.

```typescript
// Already configured in setup/firebase-emulator.ts
connectAuthEmulator(auth, 'http://localhost:9099');
connectFirestoreEmulator(db, 'localhost', 8080);
```

### Testing with Emulators

1. Start emulators in one terminal:
   ```bash
   firebase emulators:start
   ```

2. Run tests in another terminal:
   ```bash
   npm run test:all
   ```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` or `develop`
- **Schedule**: Nightly at 2 AM UTC

Configuration: `.github/workflows/test.yml`

### Viewing Test Results

1. Go to the **Actions** tab in GitHub
2. Click on the workflow run
3. Download artifacts:
   - `test-results` - Raw test output
   - `playwright-report` - Visual Playwright report

## Test Coverage

View coverage reports:

```bash
npm run test:unit -- --coverage
```

Coverage reports are saved to `coverage/` directory.

## Troubleshooting

### Java Not Found (Firebase Emulators)

**Error:** `Error: Java is not installed`

**Solution:**
1. Install Java JRE 11+: https://adoptium.net/
2. Verify installation: `java -version`
3. Restart terminal and try again

### Playwright Browsers Not Installed

**Error:** `Executable doesn't exist at...`

**Solution:**
```bash
npx playwright install chromium
```

### Port Already in Use

**Error:** `Port 8080 is not open`

**Solution:**
```bash
# Kill processes on emulator ports
# Windows:
netstat -ano | findstr :8080
taskkill /PID <pid> /F

# Or change ports in firebase.json
```

### Tests Failing in CI

1. Check that all dependencies are in `package.json`
2. Ensure tests don't rely on local state or files
3. Check GitHub Actions logs for specific errors

### Slow Test Performance

**Unit Tests:**
- Use `vi.mock()` to mock heavy dependencies
- Avoid real Firebase API calls

**E2E Tests:**
- Use `page.waitForLoadState('networkidle')` instead of arbitrary waits
- Run tests in parallel (default in Playwright)

## Best Practices

### Unit Tests

✅ **Do:**
- Test pure functions and logic
- Mock external dependencies
- Test edge cases and error conditions
- Use descriptive test names

❌ **Don't:**
- Test implementation details
- Make real API calls
- Test UI in unit tests (use E2E instead)

### E2E Tests

✅ **Do:**
- Test critical user flows
- Use data-testid for stable selectors
- Wait for elements properly
- Clean up test data

❌ **Don't:**
- Test every edge case (use unit tests)
- Rely on timing-based waits
- Have tests depend on each other
- Hardcode test data in tests

## Writing Tests with GitHub Copilot

You can use GitHub Copilot to generate tests:

1. Create a new test file
2. Add a comment describing the test:
   ```typescript
   // Test that super_admin can access Prompt Studio
   ```
3. Let Copilot suggest the test implementation
4. Review and adjust as needed

### Example Prompts

For unit tests:
```typescript
// Test the roleService.hasRole function for all role combinations
```

For E2E tests:
```typescript
// Test that clicking the Prompt Studio link navigates to /prompt-studio
```

## Next Steps

- [ ] Install Java for Firebase Emulators
- [ ] Run `npm run test:unit` to verify setup
- [ ] Start Firebase Emulators: `firebase emulators:start`
- [ ] Run `npm run test:e2e` to test E2E setup
- [ ] Add more tests for your features
- [ ] Set up Firebase Auth emulator for authentication tests

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
