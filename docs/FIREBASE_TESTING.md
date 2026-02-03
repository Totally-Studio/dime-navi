# Firebase Emulator Testing - Quick Start

## Overview

You now have comprehensive Firebase testing with:
- ✅ **Firebase Auth Integration** - Test user sign-in/sign-out
- ✅ **Firestore Integration** - Test database operations
- ✅ **E2E with Real Auth** - Test RBAC with actual users

## Running Tests with Emulators

### Terminal 1: Start Emulators
```bash
firebase emulators:start
```

**Keep this running!** The emulators need to be active for integration tests.

### Terminal 2: Run Tests

**Unit Tests** (don't need emulators):
```bash
npm run test:unit
```

**Integration Tests** (need emulators running):
```bash
npm run test:integration
```

**E2E Tests**:
```bash
npm run test:e2e:ui
```

**All Tests**:
```bash
npm run test:all
```

## What Was Added

### New Test Files

**Integration Tests** (`tests/integration/`):
- `firebaseAuth.test.ts` - 17 tests for Auth (sign in, sign out, roles)
- `firestore.test.ts` - 17 tests for Firestore (CRUD, queries, collections)

**Test Helpers** (`tests/helpers/`):
- `authHelpers.ts` - Create users, sign in, sign out, manage test accounts

**Updated E2E Tests** (`tests/e2e/`):
- `auth.spec.ts` - Authentication flow tests
- `prompt-studio.spec.ts` - RBAC tests with real Firebase Auth

### Test Users

Pre-configured test users:
```typescript
// Super Admin
email: 'toby@totally.group'
password: 'testPassword123!'

// Client Admin
email: 'clientadmin@test.com'
password: 'testPassword123!'

// Regular User
email: 'user@test.com'
password: 'testPassword123!'
```

### New NPM Scripts

```json
{
  "test:integration": "vitest run tests/integration",
  "test:integration:watch": "vitest tests/integration",
  "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
}
```

## Quick Test

1. **Start emulators** (Terminal 1):
   ```bash
   firebase emulators:start
   ```

2. **Run integration tests** (Terminal 2):
   ```bash
   npm run test:integration
   ```

3. **View Emulator UI**:
   Open http://127.0.0.1:4000
   - See test users in Auth tab
   - See test data in Firestore tab

## Example: Creating a Test User

```typescript
import { initializeTestFirebase } from '../setup/firebase-emulator';
import { createTestUser, TEST_USERS } from '../helpers/authHelpers';

const { auth, db } = initializeTestFirebase();
const user = await createTestUser(auth, db, TEST_USERS.superAdmin);
// User is now created in emulator and signed in
```

## Troubleshooting

**Error: Connection refused**
- Make sure Firebase Emulators are running (`firebase emulators:start`)

**Error: Tests timeout**
- Emulators might be slow to start
- Increase timeout in test file: `testTimeout: 30000`

**Error: User already exists**
- Restart emulators to clear data
- Or use different email addresses

## Next Steps

1. Add more integration tests for your features
2. Update E2E tests to use real authentication
3. Test Firestore security rules
4. Add test data seeding for consistent tests

See [TESTING.md](./TESTING.md) for complete documentation.
