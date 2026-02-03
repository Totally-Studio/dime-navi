# NaVi Widget Architecture

## Overview

The NaVi Widget is a self-contained, embeddable React component that provides AI-powered knowledge assistance. It's built as an IIFE (Immediately Invoked Function Expression) bundle that exposes a global `window.DimeNaviWidget` API.

## Architecture Principles

1. **Decoupled & Standalone** - Widget has no dependencies on main DiMe Notes app
2. **IIFE Bundle** - Single JS file that can be embedded anywhere
3. **Firebase Backend** - Leverages Firestore for data and Firebase Auth for users
4. **Streaming Responses** - Real-time AI response streaming with citations
5. **Immutable Data** - All state updates create new objects, never mutate

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Embedding Website                        │
│  <script src="navi-widget.js"></script>                    │
│  <div id="dime-navi-widget"></div>                         │
│  window.DimeNaviWidget.mount('dime-navi-widget')           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    NaVi Widget (IIFE)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  NaViApp.tsx (Root Component)                        │  │
│  │  ┌────────────┬──────────────┬────────────────────┐ │  │
│  │  │ LeftSidebar│  ChatArea    │   RightSidebar     │ │  │
│  │  │ (Bookmarks)│  (Main UI)   │   (References)     │ │  │
│  │  └────────────┴──────────────┴────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
                    ↓              ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│   Firebase Firestore     │  │   Google Gemini API      │
│  - Users                 │  │  - AI Response Gen       │
│  - Bookmarks             │  │  - Streaming             │
│  - Chat History          │  │  - Citations             │
│  - Prompt Metrics        │  │                          │
│  - Knowledge Base        │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

## Component Hierarchy

```
window.DimeNaviWidget (Global API)
│
└── NaViApp (Root Component)
    ├── LeftSidebar
    │   ├── Bookmarks List
    │   └── Chat History
    │
    ├── ChatArea (Main Interface)
    │   ├── ResponseDisplay
    │   │   ├── StreamingMarkdown
    │   │   └── Citation Links
    │   ├── Input Form
    │   └── SignInPrompt (if not authenticated)
    │
    └── RightSidebar
        └── ReferencesPanel
            └── Citation Details

Modals (Overlay)
├── ResourceModal (Resource preview)
└── TermsModal (Terms of service)
```

## Data Flow

### Query Submission Flow

```
User Input
    ↓
ChatArea.handleSubmit()
    ↓
backendService.submitQuery()
    ↓
Firebase Cloud Function / Gemini API
    ↓
Streaming Response (Server-Sent Events)
    ↓
ResponseDisplay renders with StreamingMarkdown
    ↓
citationParser extracts citations
    ↓
RightSidebar displays references
    ↓
promptMetricsService logs to Firestore
```

### Authentication Flow

```
User clicks "Sign In"
    ↓
SignInPrompt.handleAnonymousSignIn()
    ↓
Firebase Auth creates anonymous user
    ↓
useAuth hook updates auth state
    ↓
NaViApp re-renders with authenticated UI
    ↓
User can upgrade to Google account
```

### Bookmark Flow

```
User clicks bookmark icon
    ↓
ChatArea.handleBookmark()
    ↓
Firestore: users/{userId}/bookmarks/
    ↓
LeftSidebar updates bookmark list
    ↓
User can load bookmarks from history
```

## Service Layer

### backendService.ts
Primary service for AI interactions:
- `submitQuery()` - Send query to backend, receive streaming response
- `loadChatHistory()` - Fetch user's chat history
- `loadKnowledge()` - Fetch knowledge base resources
- Error handling and retry logic

### firebaseConfig.ts
Firebase initialization:
- Initialize Firebase app with env vars
- Export `auth`, `db` (Firestore), `storage`
- Environment-aware configuration (.env.local vs .env.client)

### promptMetricsService.ts
Analytics and logging:
- `logPrompt()` - Log query and response to Firestore
- Track user engagement metrics
- Monitor citation usage
- Track errors and performance

### apiClient.ts
HTTP client utility:
- Wraps fetch with error handling
- Request/response interceptors
- Timeout management
- Retry logic

## State Management

### Local State (React useState)
- Component-specific UI state
- Form inputs
- Modal visibility
- Loading states

### Context (useAuth)
- Global authentication state
- User profile
- Auth status
- Sign-in/out methods

### Firebase Real-time
- Chat history (Firestore real-time listeners)
- Bookmarks (Firestore snapshots)
- User preferences (synced across devices)

### No Redux/MobX
Widget is small enough that local state + context + Firebase suffice.

## Key Utilities

### citationParser.ts
Extracts citations from AI responses:
- Pattern: `[Source:ID:Title]` or `[Source: Title]`
- Returns array of `Citation` objects
- Handles both old and new formats
- De-duplicates citations

### resourceModal.ts
Manages resource preview modals:
- `openResourceInModal(resource)` - Opens modal with resource
- Supports PDFs, images, external links
- Handles WordPress resources
- Toast notifications on errors

### formatter.ts
Text formatting utilities:
- Date formatting
- Number formatting
- String truncation
- Markdown sanitization

## CSS Architecture

### Global Styles (index.css)
- Tailwind base + utilities
- CSS variables for theming
- Widget-specific overrides
- Animation keyframes

### Component Styles
- NaViStyles.css - Main widget styles
- ResponseContent.css - Response-specific styles
- response-stream.css - Streaming animation
- TermsModal.css - Terms modal styles

### Tailwind CSS 4.x
- Utility-first approach
- Dark mode support via CSS variables
- Responsive breakpoints
- Custom animations

## Build System

### Vite Configuration (vite.config.navi-widget.ts)

**Entry Point:**
- `navi-widget.tsx` - Exports `window.DimeNaviWidget`

**Output:**
- Format: IIFE (Immediately Invoked Function Expression)
- Single bundle: `navi-widget.js`
- Single stylesheet: `navi-widget.css`
- Copied separately: `response-stream.css`

**Optimizations:**
- Tree-shaking (removes unused code)
- Minification (esbuild)
- Inline dynamic imports
- No code splitting (single file for easy embedding)

**Aliases:**
- `@/*` → `src/*`
- `@components/*` → `components/*`
- `@templates/*` → `components/templates/*`

## Deployment Strategy

### Two Firebase Projects

**1. Development (dimenotesv2)**
- Purpose: Testing, staging, development
- Domain: https://navi.totally.software
- Uses: `.env.local`
- Deploy: `npm run deploy:dev`

**2. Production (navi-production-485916)**
- Purpose: Live client-facing widget
- Domain: https://navi.dimesociety.org
- Uses: `.env.client`
- Deploy: `npm run deploy:prod`

### Deployment Process

1. **Development Testing:**
   ```bash
   npm run dev                # Local testing
   npm run build:widget:dev   # Build dev bundle
   npm run deploy:dev         # Deploy to dimenotesv2
   ```

2. **Production Release:**
   ```bash
   npm run build:widget:prod  # Build prod bundle
   npm run deploy:prod        # Deploy to navi-production-485916
   ```

3. **Verification:**
   - Check widget loads at production URL
   - Test authentication flow
   - Verify queries generate responses
   - Check citations and bookmarks
   - Review Firestore logs

## Firebase Structure

### Firestore Collections

```
users/
  {userId}/
    bookmarks/
      {bookmarkId}
        - query: string
        - response: string
        - timestamp: timestamp
        - citations: array

    chatHistory/
      {chatId}
        - query: string
        - response: string
        - timestamp: timestamp
        - citations: array

promptMetrics/
  {metricId}
    - userId: string
    - query: string
    - responseLength: number
    - citationCount: number
    - timestamp: timestamp
    - template: string
    - version: string

knowledgeBase/
  {resourceId}
    - title: string
    - content: string
    - url: string
    - category: string
    - tags: array
```

### Security Rules

- Users can only read/write their own data
- Anonymous users have limited permissions
- Authenticated users (Google) have full permissions
- Knowledge base is read-only
- Prompt metrics are write-only

## Performance Considerations

### Bundle Size
- Target: <1MB total (JS + CSS)
- Current: ~850KB (JS), ~50KB (CSS)
- Techniques: Tree-shaking, minification, no chunking

### Load Time
- Goal: <2 seconds on 3G
- Lazy load: Resource modals, non-critical components
- Prefetch: Common responses, knowledge base index

### Runtime Performance
- Streaming: Progressive rendering during response
- Virtual scrolling: For long chat histories
- Debounced input: Prevent excessive re-renders
- Memoization: React.memo for static components

### Firebase Optimization
- Indexed queries for fast lookups
- Batched writes for multiple operations
- Real-time listeners with local cache
- Pagination for chat history

## Security Measures

### Authentication
- Firebase Auth (anonymous + Google)
- Token refresh handling
- Session persistence
- Automatic sign-out on token expiry

### Data Validation
- Input sanitization
- XSS prevention (React auto-escapes)
- Citation validation
- Resource URL validation

### API Security
- Firebase Security Rules
- API key restrictions (Firebase Console)
- CORS configured correctly
- Rate limiting on backend

### Content Security
- Markdown sanitization
- External link validation
- Resource modal sandboxing
- No eval() or dangerous code execution

## Error Handling

### Levels

1. **User-Facing Errors**
   - Toast notifications (react-toastify)
   - Friendly error messages (errorMessages.ts)
   - Retry options
   - Help text

2. **Developer Errors**
   - Console logging in dev mode
   - Firestore error logs
   - Sentry integration (future)

3. **Silent Errors**
   - Failed bookmark saves (retry in background)
   - Analytics failures (don't block UX)
   - Non-critical service errors

### Error Recovery

- Automatic retry for network errors (3 attempts)
- Fallback to cached data when possible
- Graceful degradation (show partial results)
- Clear user communication

## Testing Strategy

### Unit Tests (Vitest)
- Services: backendService, citationParser, formatter
- Utils: resourceModal, apiClient
- Hooks: useAuth
- Target: 80%+ coverage

### Integration Tests (Vitest)
- Component interactions
- Firebase integration
- State management
- End-to-end flows

### E2E Tests (Playwright)
- Widget embedding
- User authentication
- Query submission
- Bookmark creation
- Citation display

### Manual Testing Checklist
- [ ] Widget loads on test page
- [ ] Anonymous sign-in works
- [ ] Google sign-in works
- [ ] Query generates response
- [ ] Citations display correctly
- [ ] Bookmarks save/load
- [ ] Chat history persists
- [ ] Resource modals open
- [ ] Dark/light mode toggle
- [ ] Mobile responsive

## Future Enhancements

### Planned Features
1. **Offline Support** - Service worker for offline queries
2. **Performance Monitoring** - Firebase Performance SDK
3. **A/B Testing** - Firebase Remote Config
4. **Version Rollback** - Hosting version management
5. **Widget Customization** - Client-configurable themes
6. **Multi-language** - i18n support
7. **Voice Input** - Speech-to-text integration
8. **Export/Share** - Export conversations as PDF/MD

### Infrastructure Improvements
1. **CI/CD Pipeline** - GitHub Actions for automatic deployments
2. **Staging Environment** - Dedicated staging Firebase project
3. **Monitoring** - Real-time error tracking and alerts
4. **Analytics Dashboard** - Usage metrics and insights
5. **Load Testing** - Stress testing for concurrent users

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review Firebase usage/costs monthly
- Check security rules quarterly
- Performance audits quarterly
- User feedback review weekly

### Version Updates
1. Update `WIDGET_VERSION` in constants.ts
2. Test locally
3. Deploy to dev (dimenotesv2)
4. Test on dev environment
5. Deploy to prod (navi-production-485916)
6. Monitor for errors
7. Update documentation

## Troubleshooting

### Common Issues

**Widget doesn't load:**
- Check script src URL
- Verify Firebase config
- Check browser console for errors
- Ensure target div exists

**Authentication fails:**
- Check Firebase Auth is enabled
- Verify API keys in .env
- Check domain is authorized in Firebase Console
- Review browser console for specific errors

**Queries fail:**
- Check Gemini API key
- Verify backend service is deployed
- Check Firestore security rules
- Review network tab for failed requests

**Citations missing:**
- Check AI response format
- Verify citation parser regex
- Ensure knowledge base is loaded
- Review console for parsing errors

## Documentation

### Internal
- This file (ARCHITECTURE.md)
- archive/README.md (archived files)
- Root README.md (quick start)
- WIDGET-MIGRATION.md (migration history)

### External (for clients)
- Embedding guide
- Configuration options
- Customization guide
- Troubleshooting FAQ

---

**Last Updated:** February 2, 2026
**Architecture Version:** 2.0.0 (Decoupled Widget)
