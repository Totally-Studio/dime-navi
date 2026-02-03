# Firebase & Google Cloud Migration Checklist

**Purpose:** Guide for transferring Firebase project ownership to client
**Current Project:** `dimenotesv2`
**Date:** 2026-01-17

---

## Pre-Migration Preparation

### 1. Document Current State

- [ ] Export current Firestore data (backup)
- [ ] Document all security rules
- [ ] List all API keys and their restrictions
- [ ] Document environment variables
- [ ] Note current billing usage/costs
- [ ] Screenshot current Firebase console settings

### 2. Gather Credentials & Access Info

| Item | Current Value | Notes |
|------|---------------|-------|
| Project ID | `dimenotesv2` | Cannot be changed |
| Project Number | `253073039735` | |
| Firebase API Key | `AIzaSyBDcvYs02...` | Restricted by referrer |
| Gemini API Key | `AIzaSyBBx6b1eE...` | Move to server-side |
| Auth Domain | `dimenotesv2.firebaseapp.com` | |
| Storage Bucket | `dimenotesv2.firebasestorage.app` | |

---

## Migration Options

### Option A: Transfer Existing Project (Recommended)

**Pros:** No data migration, same URLs, no downtime
**Cons:** Project ID stays the same

#### Steps:

1. **Add Client as Owner**
   - [ ] Go to Firebase Console → Project Settings → Users and Permissions
   - [ ] Click "Add Member"
   - [ ] Enter client's Google account email
   - [ ] Set role to "Owner"
   - [ ] Client accepts invitation

2. **Transfer Billing**
   - [ ] Client creates Google Cloud Billing Account
   - [ ] Go to GCP Console → Billing
   - [ ] Link project to client's billing account
   - [ ] Remove old billing account

3. **Transfer API Keys**
   - [ ] Client regenerates Firebase API key (optional, for security)
   - [ ] Client creates new Gemini API key in their GCP project
   - [ ] Update environment variables with new keys

4. **Remove Developer Access**
   - [ ] Client removes original developer from project
   - [ ] Or downgrade to "Viewer" role

---

### Option B: Create New Project (Clean Slate)

**Pros:** Fresh start, client owns from day one
**Cons:** Data migration required, URL changes, potential downtime

#### Steps:

1. **Client Creates New Firebase Project**
   - [ ] Go to Firebase Console
   - [ ] Create new project (choose new project ID)
   - [ ] Enable required services (see below)

2. **Configure New Project**
   - [ ] Enable Authentication (Google provider)
   - [ ] Create Firestore database
   - [ ] Set up Hosting
   - [ ] Configure security rules

3. **Migrate Data**
   - [ ] Export Firestore data from old project
   - [ ] Import into new project
   - [ ] Verify data integrity

4. **Update Application**
   - [ ] Update all environment variables
   - [ ] Rebuild and redeploy
   - [ ] Update WordPress plugin settings

5. **DNS/URL Changes**
   - [ ] Update widget URL in WordPress plugin
   - [ ] Add custom domain (optional)

---

## Services to Enable in New Project

If creating a new project, enable these services:

### Firebase Services
- [ ] **Authentication** - Enable Google Sign-In provider
- [ ] **Cloud Firestore** - Create database in production mode
- [ ] **Hosting** - Initialize hosting
- [ ] **Performance Monitoring** - Optional but recommended

### Google Cloud Services
- [ ] **Generative Language API** (Gemini) - Enable in GCP Console
- [ ] **Cloud Resource Manager API** - Usually auto-enabled

---

## Security Rules Migration

Copy these rules to the new project's `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isSuperAdmin() {
      return isAuthenticated() &&
             request.auth.token.email == 'admin@clientdomain.com'; // UPDATE THIS
    }

    // Knowledge Base - Public read
    match /knowledgebase_wp/{docId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }

    // User data - Owner only
    match /users/{userId}/{document=**} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }

    // Prompts - Admin write, auth read
    match /prompts/{promptId} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }

    // AI Logs - Auth create/read
    match /ai_logs/{logId} {
      allow create, read: if isAuthenticated();
    }
  }
}
```

**Important:** Update the super admin email to client's admin email.

---

## Environment Variables to Transfer

Create `.env.production` for client:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=<new-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<app-id>

# Google AI - Client should create their own
VITE_GEMINI_API_KEY=<client-gemini-key>

# WordPress - Client's site
VITE_WORDPRESS_API_URL=https://client-site.com/wp-json
VITE_WORDPRESS_BASE_URL=https://client-site.com
```

---

## WordPress Plugin Updates

After migration, update plugin settings:

1. **Widget URL**
   - Old: `https://dimenotesv2.web.app/widget.js`
   - New: `https://<new-project-id>.web.app/widget.js`
   - Or custom domain: `https://widget.clientdomain.com/widget.js`

2. **Plugin Settings Page**
   - Go to WordPress Admin → NaVi Widget
   - Update "Widget Script URL"
   - Clear any caches

---

## Post-Migration Verification

### Functional Testing
- [ ] Widget loads on WordPress site
- [ ] Users can send messages
- [ ] AI responses are generated
- [ ] Citations display correctly
- [ ] Bookmarks can be saved
- [ ] Download options work
- [ ] Authentication works (if used)

### Technical Verification
- [ ] Firestore rules deployed
- [ ] No console errors
- [ ] API keys working
- [ ] Billing active on client account
- [ ] Monitoring/logging active

---

## Ongoing Maintenance Transfer

### Documentation to Provide
- [ ] This migration checklist
- [ ] Technical architecture document
- [ ] Development notes
- [ ] Build/deploy commands
- [ ] Environment variable template

### Access to Provide
- [ ] GitHub repository (if applicable)
- [ ] Source code
- [ ] Build scripts
- [ ] WordPress plugin files

### Training Topics
- [ ] How to deploy updates
- [ ] How to sync WordPress content
- [ ] How to monitor usage/costs
- [ ] How to update prompts
- [ ] Basic troubleshooting

---

## Cost Estimation for Client

### Monthly Estimates (based on typical usage)

| Service | Estimated Usage | Estimated Cost |
|---------|-----------------|----------------|
| Firestore Reads | ~100K/month | ~$0.06 |
| Firestore Writes | ~10K/month | ~$0.02 |
| Hosting Bandwidth | ~5GB/month | ~$0.75 |
| Gemini API | ~1M tokens/month | ~$0.40 |
| **Total** | | **~$1-5/month** |

*Actual costs vary based on traffic. Monitor via GCP Billing console.*

### Free Tier Limits
- Firestore: 50K reads, 20K writes per day
- Hosting: 10GB storage, 360MB/day transfer
- Auth: 10K users

---

## Emergency Contacts

| Role | Contact | Notes |
|------|---------|-------|
| Original Developer | [Your contact] | For technical questions |
| Firebase Support | console.firebase.google.com | For service issues |
| GCP Support | cloud.google.com/support | For billing issues |

---

## Checklist Summary

### Before Handover
- [ ] All documentation complete
- [ ] Data backed up
- [ ] Security rules documented
- [ ] API keys documented

### During Handover
- [ ] Client added as Owner
- [ ] Billing transferred
- [ ] Access verified

### After Handover
- [ ] Functional testing complete
- [ ] Developer access removed/reduced
- [ ] Client trained on basics
- [ ] Support period agreed

---

*Migration Checklist Complete*
