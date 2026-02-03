# NaVi Widget

A standalone, embeddable AI-powered knowledge assistant widget built with React, TypeScript, and Firebase.

## Overview

This is the **NaVi Widget** project - a decoupled, production-ready widget that can be embedded into any website. It provides AI-powered responses with citations from curated knowledge bases.

**Important:** The DiMe Notes main application has been archived to `/archive/main-app/`. This repository now contains only the widget code.

## Quick Start

### Development (dimenotesv2)
```bash
npm install
npm run dev
# Widget available at http://localhost:3000
```

### Build & Deploy

**Development Build (dimenotesv2):**
```bash
npm run build:widget:dev
npm run deploy:dev
# Deployed to: https://dimenotesv2.web.app/navi-widget/navi-widget.js
```

**Production Build (navi-production-485916):**
```bash
npm run build:widget:prod
npm run deploy:prod
# Deployed to: https://navi-production-485916.web.app/navi-widget/navi-widget.js
```

## Project Structure

```
dimenotes/
├── navi-widget.tsx           # Widget entry point
├── types.ts                  # TypeScript type definitions
├── constants.ts              # Configuration constants
├── index.css                 # Global styles
│
├── components/
│   ├── Modal.tsx             # Modal component
│   ├── ReferencesPanel.tsx   # Citations panel
│   ├── StreamingMarkdown.tsx # Markdown renderer
│   └── templates/navi/       # NaVi widget components (6 files + 4 CSS)
│
├── services/
│   ├── apiClient.ts          # API client utility
│   ├── backendService.ts     # Backend integration
│   ├── firebaseConfig.ts     # Firebase configuration
│   └── promptMetricsService.ts # Analytics
│
├── utils/
│   ├── citationParser.ts     # Citation parsing
│   ├── formatter.ts          # Text formatting
│   └── resourceModal.ts      # Resource modal handling
│
├── src/
│   ├── components/
│   │   └── SignInPrompt.tsx  # Authentication UI
│   ├── config/
│   │   └── errorMessages.ts  # Error message constants
│   └── hooks/
│       └── useAuth.ts        # Authentication hook
│
├── archive/                  # Archived main app files
│   ├── main-app/             # DiMe Notes main application
│   ├── legacy/               # Legacy/backup files
│   └── README.md             # Archive documentation
│
├── vite.config.navi-widget.ts # Widget build config
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config
├── firebase.json              # Firebase hosting config
└── .firebaserc                # Firebase project aliases
```

## Key Files

### Entry Point
- **navi-widget.tsx** - Main widget entry point that exports `window.DimeNaviWidget`

### Configuration
- **.env.local** - Development config (dimenotesv2)
- **.env.client** - Production config (navi-production-485916)
- **constants.ts** - Widget version, templates, defaults
- **types.ts** - TypeScript interfaces

### Core Components (NaVi Template)
- **NaViApp.tsx** - Main widget shell
- **ChatArea.tsx** - Main chat interface
- **LeftSidebar.tsx** - Bookmarks & history
- **RightSidebar.tsx** - Reference citations
- **ResponseDisplay.tsx** - AI response renderer
- **ResourceModal.tsx** - Resource preview modal
- **TermsModal.tsx** - Terms of service modal

## Environment Variables

### Development (.env.local)
```env
VITE_FIREBASE_PROJECT_ID=dimenotesv2
VITE_FIREBASE_API_KEY=<key>
VITE_GEMINI_API_KEY=<key>
```

### Production (.env.client)
```env
VITE_FIREBASE_PROJECT_ID=navi-production-485916
VITE_FIREBASE_API_KEY=<key>
VITE_GEMINI_API_KEY=<key>
```

## Build Output

Widget builds to: `dist/navi-widget/`
- `navi-widget.js` - Bundled JavaScript (IIFE format)
- `navi-widget.css` - Bundled styles
- `response-stream.css` - Streaming animation styles

## Deployment

### Firebase Projects

**Development/Testing:**
- Project: `dimenotesv2`
- URL: https://navi.totally.software
- Use: Testing, development, staging

**Production:**
- Project: `navi-production-485916`
- URL: https://navi.dimesociety.org
- Use: Live widget for client websites

### Deploy Commands

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Deploy only Firestore rules (production)
npm run deploy:firestore:prod
```

## Embedding the Widget

Add this to your HTML:

```html
<!-- Load widget -->
<script src="https://navi-production-485916.web.app/navi-widget/navi-widget.js"></script>
<link rel="stylesheet" href="https://navi-production-485916.web.app/navi-widget/navi-widget.css">

<!-- Mount widget -->
<div id="dime-navi-widget"></div>
<script>
  window.DimeNaviWidget.mount('dime-navi-widget', {
    mode: 'light',
    template: 'navi'
  });
</script>
```

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Tech Stack

- **Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Backend:** Firebase (Firestore, Auth, Hosting)
- **AI:** Google Gemini API
- **Styling:** Tailwind CSS
- **Markdown:** streaming-markdown

## Dependencies

### Core
- React 19.2.0
- Firebase 12.4.0
- @google/genai 1.27.0
- streaming-markdown 0.2.15

### UI
- react-markdown 10.1.0
- react-toastify 11.0.5
- Tailwind CSS 4.1.17

### Dev
- Vite 6.2.0
- TypeScript 5.8.2
- Vitest 4.0.11
- Playwright 1.56.1

## Widget Features

- **AI-Powered Responses:** Gemini-powered answers with streaming
- **Citation System:** Automatic citation extraction and display
- **Authentication:** Anonymous + Google sign-in
- **Bookmarks:** Save important queries
- **Chat History:** Persistent conversation history
- **Resource Modals:** In-widget resource previews
- **Responsive Design:** Mobile and desktop optimized
- **Dark/Light Modes:** Theme switching support

## Development Notes

### File Count
~35 essential files (down from 80+)

### Build Time
~5-10 seconds for production build

### Bundle Size
- JS: ~800KB (minified)
- CSS: ~50KB (minified)

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ required

## Maintenance

### Updating Widget Version
Edit `constants.ts`:
```typescript
export const WIDGET_VERSION = '2026.02.02.1'; // YYYY.MM.DD.BUILD
```

### Adding Features
1. Create components in `components/templates/navi/`
2. Update types in `types.ts`
3. Add services in `services/`
4. Test with `npm run dev`
5. Deploy with `npm run deploy:dev` (test) then `npm run deploy:prod`

### Debugging
- Check browser console for errors
- Review Firebase logs at console.firebase.google.com
- Check Firestore data for prompt metrics

## Related Documentation

- **Archive README:** `/archive/README.md` - What was archived and why
- **Architecture:** `/docs/ARCHITECTURE.md` - Widget architecture details
- **Migration:** `WIDGET-MIGRATION.md` - Migration history

## Support

For issues or questions:
1. Check Firebase console for backend errors
2. Review browser console for client errors
3. Check Firestore for data issues
4. Review recent commits for breaking changes

## License

Private - DiMe Society / Totally Software LLC

---

**Last Updated:** February 2, 2026
**Widget Version:** 2026.01.29.11
**Project Status:** Production-ready, actively maintained
