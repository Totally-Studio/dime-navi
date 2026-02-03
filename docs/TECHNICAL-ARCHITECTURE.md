# NaVi Widget - Technical Architecture Documentation

**Version:** 1.0
**Date:** 2026-01-17
**Prepared for:** Client Handover & Firebase Migration

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Application Architecture](#2-application-architecture)
3. [Widget Architecture](#3-widget-architecture)
4. [Data Architecture](#4-data-architecture)
5. [WordPress Plugin](#5-wordpress-plugin)
6. [Firebase & Google Cloud Services](#6-firebase--google-cloud-services)
7. [Security Model](#7-security-model)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. System Overview

### 1.1 What is NaVi?

NaVi is an AI-powered knowledge assistant widget designed to help users navigate and understand content on WordPress-based websites. It provides:

- **Contextual Q&A** - Users ask questions, NaVi responds with relevant information
- **Source Citations** - All responses include references to source documents
- **Resource Discovery** - Suggests related content from the knowledge base
- **Bookmarking** - Users can save references for later

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐     │
│  │  WordPress Site │    │       NaVi Widget (React)       │     │
│  │                 │    │  ┌─────────┐ ┌─────────────┐    │     │
│  │  [navi]         │◄──►│  │ Chat    │ │ References  │    │     │
│  │  shortcode      │    │  │ Panel   │ │ Panel       │    │     │
│  │                 │    │  └────┬────┘ └──────┬──────┘    │     │
│  └─────────────────┘    │       │             │           │     │
│                         └───────┼─────────────┼───────────┘     │
└─────────────────────────────────┼─────────────┼─────────────────┘
                                  │             │
                    ┌─────────────▼─────────────▼─────────────┐
                    │           FIREBASE SERVICES              │
                    │  ┌──────────┐ ┌──────────┐ ┌─────────┐  │
                    │  │ Firestore│ │   Auth   │ │ Hosting │  │
                    │  │ Database │ │ (Google) │ │ (CDN)   │  │
                    │  └────┬─────┘ └──────────┘ └─────────┘  │
                    └───────┼─────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Google AI    │
                    │  (Gemini API) │
                    └───────────────┘
```

### 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS, Custom CSS |
| Database | Firebase Firestore |
| Authentication | Firebase Auth (Google OAuth) |
| AI/ML | Google Gemini API (gemini-2.5-flash) |
| Hosting | Firebase Hosting |
| CMS Integration | WordPress REST API |
| Markdown | streaming-markdown library |

---

## 2. Application Architecture

### 2.1 Project Structure

```
dimenotes/
├── src/                          # Main application source
│   ├── components/               # React components
│   │   └── templates/
│   │       └── navi/            # NaVi widget components
│   ├── services/                # Business logic & API calls
│   ├── hooks/                   # React custom hooks
│   └── types.ts                 # TypeScript interfaces
├── components/                   # Widget-specific components
│   └── templates/navi/          # NaVi CSS & components
├── docs/                        # Documentation
├── tests/                       # Test files
├── dist/                        # Build output
│   └── widget/                  # Widget build
├── widget.tsx                   # Widget entry point
├── constants.ts                 # Configuration & prompts
├── firebase.json                # Firebase config
├── firestore.rules              # Security rules
└── vite.config.widget.ts        # Widget build config
```

### 2.2 Key Components

| Component | File | Purpose |
|-----------|------|---------|
| NaViApp | `components/templates/navi/index.tsx` | Main widget container |
| ChatArea | `components/templates/navi/ChatArea.tsx` | Chat interface, messages, actions |
| LeftSidebar | `components/templates/navi/LeftSidebar.tsx` | Chat history |
| RightSidebar | `components/templates/navi/RightSidebar.tsx` | Bookmarks |
| StreamingMarkdown | `components/StreamingMarkdown.tsx` | Renders AI responses |

### 2.3 Service Layer

| Service | Purpose |
|---------|---------|
| `firebaseConfig.ts` | Firebase app initialization |
| `apiClient.ts` | API abstraction layer |
| `backendService.ts` | AI generation, logging, database ops |
| `roleService.ts` | User permissions & roles |
| `knowledgeConfigService.ts` | Knowledge base versioning |
| `wpSyncService.ts` | WordPress content sync |
| `geminiService.ts` | Gemini AI integration |

---

## 3. Widget Architecture

### 3.1 Widget Loading Flow

```
1. WordPress page loads
2. [navi] shortcode renders container div
3. widget.js loaded from Firebase Hosting
4. Widget auto-initializes via data attributes
5. React app mounts into container
6. Widget fetches knowledge base from Firestore
7. User interacts with chat interface
```

### 3.2 Widget Entry Point

**File:** `widget.tsx`

```typescript
// Key initialization
window.DimeNotebookWidget = {
  init: (config) => { /* Initialize widget */ },
  destroy: () => { /* Cleanup */ },
  reinit: (pageContext) => { /* Re-init on page change */ }
};
```

### 3.3 Widget Configuration

The widget accepts configuration via data attributes:

```html
<div
  id="navi-container"
  data-dime-notebook-auto-init="true"
  data-template="navi"
  data-page-context='{"url":"...", "title":"..."}'
></div>
```

### 3.4 Build Configuration

**File:** `vite.config.widget.ts`

- Output: Single IIFE bundle (`widget.js`)
- CSS: Single file (`widget.css`)
- No code splitting (self-contained widget)

---

## 4. Data Architecture

### 4.1 Firestore Collections

```
firestore/
├── knowledgeBase/              # Original knowledge base (legacy)
├── knowledgebase_wp/           # Primary WordPress-synced content
├── knowledgebase_wp_*/         # Staging versions (timestamped)
├── knowledgebase_archive_*/    # Archived versions
├── knowledgebase_config/       # Configuration document
├── users/
│   └── {userId}/
│       ├── outputs/            # Saved AI responses
│       └── chatHistory/        # Chat history
├── prompts/                    # Production prompts
├── dev_prompts/                # Development prompts
├── staging_prompts/            # Staging prompts
└── ai_logs/                    # AI interaction logs
```

### 4.2 Core Data Models

**Resource (Knowledge Base Item)**
```typescript
interface Resource {
  id: string;
  title: string;
  description: string;
  summary: string;
  tags: string[];
  group: string;
  contentType?: 'library' | 'roadmap';
  url?: string;
  checksum?: string;
}
```

**SavedOutput (User's Saved Response)**
```typescript
interface SavedOutput {
  id: string;
  title: string;
  content: string;
  template: Template;
  timestamp: string;
  sourceCount: number;
  tags: string[];
  originalQuery?: string;
}
```

**ChatHistory**
```typescript
interface ChatHistory {
  id: string;
  query: string;
  response: string;
  template: Template;
  timestamp: string;
  sourceCount: number;
}
```

### 4.3 Knowledge Base Versioning

The system supports staged deployments of knowledge base updates:

```
1. Sync from WordPress → Creates staging collection
2. Review in staging environment
3. Promote to production → Archives previous version
4. Rollback if needed → Restore from archive
```

---

## 5. WordPress Plugin

### 5.1 Plugin Structure

```
navi-widget/
├── navi-widget.php             # Main plugin file
├── includes/
│   ├── class-navi-admin.php    # Admin settings page
│   └── class-navi-public.php   # Shortcode & frontend
├── admin-styles.css            # Admin UI styles
└── readme.txt                  # Plugin readme
```

### 5.2 Plugin Settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `widget_url` | `https://dimenotesv2.web.app/widget.js` | Widget script URL |
| `enabled` | `true` | Enable/disable widget |
| `dev_mode` | `false` | Use local dev server |
| `dev_widget_url` | `http://localhost:3000/widget.js` | Dev server URL |
| `max_width` | `1200px` | Container max width |
| `terms_page` | - | Terms & conditions page ID |

### 5.3 Shortcode Usage

```php
// Basic usage
[navi]

// With attributes
[navi max_width="1400px" height="800px" class="custom-class"]
```

### 5.4 Page Context

The plugin automatically passes page context to the widget:

```javascript
{
  url: "https://example.com/page/",
  path: "/page/",
  title: "Page Title",
  postId: 123,
  postType: "page",
  siteUrl: "https://example.com",
  siteName: "Site Name",
  termsPageUrl: "https://example.com/terms/"
}
```

---

## 6. Firebase & Google Cloud Services

### 6.1 Services Used

| Service | Purpose | Billing Impact |
|---------|---------|----------------|
| **Firebase Authentication** | User login (Google OAuth) | Free tier sufficient |
| **Cloud Firestore** | Database | Pay per read/write |
| **Firebase Hosting** | Widget CDN | Pay per GB transferred |
| **Firebase Performance** | Monitoring | Free |
| **Google AI (Gemini)** | Content generation | Pay per token |

### 6.2 Project Details

| Property | Value |
|----------|-------|
| Project ID | `dimenotesv2` |
| Region | Default (us-central1) |
| Auth Domain | `dimenotesv2.firebaseapp.com` |
| Storage Bucket | `dimenotesv2.firebasestorage.app` |

### 6.3 API Keys

| Key | Purpose | Restrictions |
|-----|---------|--------------|
| Firebase API Key | Firebase services | HTTP referrer restricted |
| Gemini API Key | AI generation | None (server-side recommended) |

### 6.4 Billing Considerations

**Firestore:**
- Reads: $0.06 per 100K
- Writes: $0.18 per 100K
- Storage: $0.18 per GB/month

**Hosting:**
- Storage: $0.026 per GB
- Transfer: $0.15 per GB

**Gemini API:**
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

---

## 7. Security Model

### 7.1 Authentication

- **Method:** Google OAuth via Firebase Auth
- **Anonymous Access:** Allowed for widget (read-only)
- **Session:** Managed by Firebase SDK

### 7.2 Firestore Security Rules

```javascript
// Public read access (knowledge base)
match /knowledgebase_wp/{docId} {
  allow read: if true;
  allow write: if request.auth != null && isSuperAdmin();
}

// User-specific data
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Admin-only collections
match /prompts/{promptId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && isSuperAdmin();
}
```

### 7.3 Role Hierarchy

```
public (0) → user (1) → client_admin (2) → super_admin (3)
```

### 7.4 API Key Security

- Firebase keys are restricted by HTTP referrer
- Gemini keys should be moved server-side for production
- Environment variables used for all sensitive data

---

## 8. Deployment Architecture

### 8.1 Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | `dimenotesv2.web.app` | Live users |
| Staging | `dimenotesv2--staging-*.web.app` | Testing |
| UAT | `dimenotesv2--uat-*.web.app` | User acceptance |
| Preview | `dimenotesv2--preview-*.web.app` | Feature preview |
| Local Dev | `localhost:3000` | Development |

### 8.2 Deployment Commands

```bash
# Build widget only
npm run build:widget

# Build all (app + widget)
npm run build:all

# Deploy to production
firebase deploy --only hosting

# Deploy to staging
npm run deploy:staging

# Deploy to UAT
npm run deploy:uat
```

### 8.3 CI/CD Considerations

Currently manual deployment. Recommended additions:
- GitHub Actions for automated builds
- Automated testing before deploy
- Staging → Production promotion workflow

---

## Appendix A: Environment Variables

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=dimenotesv2.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dimenotesv2
VITE_FIREBASE_STORAGE_BUCKET=dimenotesv2.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Google AI
VITE_GEMINI_API_KEY=

# WordPress Integration
VITE_WORDPRESS_API_URL=https://example.com/wp-json
VITE_WORDPRESS_BASE_URL=https://example.com
```

---

## Appendix B: Key File Locations

| Purpose | File Path |
|---------|-----------|
| Firebase Config | `src/services/firebaseConfig.ts` |
| Security Rules | `firestore.rules` |
| Widget Entry | `widget.tsx` |
| Widget Config | `vite.config.widget.ts` |
| Main Styles | `components/templates/navi/NaViStyles.css` |
| Version Number | `constants.ts` (WIDGET_VERSION) |
| Data Types | `src/types.ts` |
| AI Prompts | `constants.ts` |

---

*Document End*
