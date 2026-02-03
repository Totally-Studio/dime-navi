# Firebase Setup & Troubleshooting

## Issues Fixed

### 1. Firebase Configuration ✅
**Problem**: Multiple configuration mismatches
- Wrong project ID in some places
- Incomplete environment variables
- Hardcoded values instead of env variables

**Solution**: Updated the following files:
- [.env.local](.env.local) - Added all required Firebase env variables
- [services/firebaseConfig.ts](services/firebaseConfig.ts) - Updated to use correct config

**Correct Configuration**:
```
Project ID: dimenotesv2
Auth Domain: dimenotesv2.firebaseapp.com
Storage Bucket: dimenotesv2.firebasestorage.app
Messaging Sender ID: 253073039735
App ID: 1:253073039735:web:3d99ae9f1c09dff11b8172
```

### 2. Firestore Security Rules ✅ (Created, Needs Deployment)
**Problem**: No security rules configured, causing 400 errors

**Solution**: Created firestore.rules with proper authentication-based access control

**Files Created**:
- [firestore.rules](firestore.rules) - Security rules
- [firestore.indexes.json](firestore.indexes.json) - Database indexes
- [firebase.json](firebase.json) - Firebase project configuration
- [.firebaserc](.firebaserc) - Firebase CLI project alias

## Remaining Steps (Manual)

### Option 1: Deploy Rules via Firebase Console (Easiest)
1. Go to https://console.firebase.google.com/project/dimenotesv2/firestore/rules
2. Copy the contents of `firestore.rules`
3. Paste into the rules editor
4. Click "Publish"

### Option 2: Deploy Rules via Firebase CLI
1. Login to Firebase CLI:
   ```bash
   firebase login
   ```

2. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option 3: Use Temporary Open Rules (NOT RECOMMENDED FOR PRODUCTION)
For quick testing only, you can temporarily set open rules in the Firebase Console:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
**⚠️ WARNING**: This allows any authenticated user to read/write all data!

## Testing the Fix

After deploying the rules, restart your dev server:
```bash
npm run dev
```

The Firestore 400 errors should disappear and you should see successful connections.

## Current GCloud Setup

✅ Authenticated as: toby@totally.group
✅ Active Project: dimenotesv2
✅ Firestore Database: (default) - Active and configured
✅ Application Default Credentials: Configured

## Troubleshooting

### If you still see 400 errors:
1. **Clear browser cache and localStorage**
   - Open DevTools (F12)
   - Application tab → Clear storage
   - Reload the page

2. **Check Authentication**
   - Make sure users are properly authenticated
   - Check the auth state in your app

3. **Verify Project ID**
   - Look in browser DevTools console
   - Make sure it's connecting to `dimenotesv2` not `gen-lang-client-*`

4. **Check Firestore Rules**
   - Go to Firebase Console → Firestore → Rules
   - Make sure rules are published and not in error state

### The `gen-lang-client-0241252822` Mystery
The console errors showed attempts to connect to project `gen-lang-client-0241252822`. This is likely:
- A browser extension (like a Gemini/Google AI extension)
- Another tab/window with a different Firebase project
- Cached configuration in localStorage

**Solution**: Clear your browser's application data for localhost:5173

## Files Modified

- ✅ `.env.local` - Updated with complete Firebase config
- ✅ `services/firebaseConfig.ts` - Fixed to use env variables
- ✅ `firestore.rules` - Created security rules
- ✅ `firestore.indexes.json` - Created indexes config
- ✅ `firebase.json` - Created Firebase project config
- ✅ `.firebaserc` - Created project alias

## Next Steps

1. **Deploy Firestore Rules** (see options above)
2. **Restart your dev server**
3. **Clear browser cache/storage**
4. **Test the application**

If issues persist, check the browser console for new error messages and verify authentication is working correctly.
