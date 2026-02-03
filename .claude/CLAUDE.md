# DiMe NaVi Widget

## Project Overview
**Type:** React + Vite + Firebase Widget Application
**Location:** Z:\Application Prototypes\dime\dime-navi
**Parent Project:** DiMe ecosystem at `Z:\Application Prototypes\dime\`
**Purpose:** Standalone, embeddable AI-powered knowledge assistant widget

## Tech Stack
- **Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Backend:** Firebase (Firestore, Auth, Hosting)
- **AI:** Google Gemini API
- **Styling:** Tailwind CSS
- **Markdown:** streaming-markdown

## Key Features
- AI-powered responses with streaming
- Citation system with resource modals
- Anonymous + Google authentication
- Bookmarks and chat history
- Responsive design (mobile + desktop)
- Dark/light mode support

## Project Structure
```
dime-navi/
├── navi-widget.tsx         # Widget entry point
├── types.ts, constants.ts  # Configuration
├── index.css               # Styles
├── components/             # UI components (17 files)
│   └── templates/navi/     # NaVi widget components
├── services/               # Backend logic (4 files)
├── utils/                  # Utilities (3 files)
├── src/                    # Minimal shared (3 files)
├── .kittify/               # Spec-Kitty framework
├── package.json            # Dependencies
├── firebase.json           # Firebase config
└── .env.local/.env.client  # Environment configs
```

## Development
**Port:** 3000 (default)
**Dev Server:** `npm run dev`
**Build Widget:** `npm run build`
**Deploy Dev:** `npm run deploy:dev` (dimenotesv2)
**Deploy Prod:** `npm run deploy:prod` (navi-production-485916)

## Firebase Projects
- **dimenotesv2** - Development/testing (uses .env.local)
- **navi-production-485916** - Production (uses .env.client)

## Related Projects
- **Parent Folder:** `Z:\Application Prototypes\dime\` - Organized DiMe ecosystem
- **Archive:** `../archive/` - Old DiMe Notes app and documentation
- **Docs:** `../docs/` - Project-wide documentation
- **WordPress Site:** `../../dime-wordpress-website/` - Marketing site

## Standards
Follows global standards from: `Z:\AI Agents Global\Claude\Claude-Code-Management\standards\`

## Available Global Resources
- 75+ agents via `/use-z-agent`
- 40+ commands via `/use-z-command`
- Templates in `Z:\AI Agents Global\Claude\templates\`

## Key Considerations
- Widget is IIFE bundle (single file embedding)
- Immutable data patterns (never mutate state)
- Firebase configuration in .env files
- Two environments: dev (dimenotesv2) and prod (navi-production-485916)
- Build output: dist/navi-widget/navi-widget.js + .css

## Quick Commands
```bash
# Development
npm run dev

# Build
npm run build                # Uses .env.local
npm run build:widget:prod    # Uses .env.client

# Deploy
npm run deploy:dev           # Deploy to dimenotesv2
npm run deploy:prod          # Deploy to navi-production-485916

# Test
npm run test:unit
npm run test:e2e
```

## Widget Embedding
```html
<script src="https://navi-production-485916.web.app/navi-widget/navi-widget.js"></script>
<link rel="stylesheet" href="https://navi-production-485916.web.app/navi-widget/navi-widget.css">
<div id="dime-navi-widget"></div>
<script>
  window.DimeNaviWidget.mount('dime-navi-widget', {
    mode: 'light',
    template: 'navi'
  });
</script>
```

## Notes
- Keep Firebase keys in .env (never commit)
- Use global credential vault for sensitive data
- Widget version in constants.ts
- Archived main app available in `../archive/main-app/`
- Documentation in `../docs/ARCHITECTURE.md`

## File Count
- Essential widget files: ~35
- Archived files: 180+
- This is a focused, widget-only project

---
**Updated:** February 2, 2026
**Project:** NaVi Widget (decoupled from DiMe Notes main app)
