# NaVi Widget Development Notes

**Last Updated:** 2026-01-17
**Current Version:** v2026.01.17.44
**Production URL:** https://dimenotesv2.web.app/widget.js

---

## Overview

NaVi is an AI-powered assistant widget embedded on WordPress sites via the `[navi]` shortcode. It provides contextual help, resource citations, and content recommendations.

---

## Architecture

### Components
- **DiMeNotes (React App):** `Z:\Application Prototypes\dimenotes`
- **WordPress Plugin:** `Z:\Application Prototypes\dime-wordpress-website\app\public\wp-content\plugins\navi-widget`
- **Hosting:** Firebase Hosting (`dimenotesv2.web.app`)

### Key Files
| File | Purpose |
|------|---------|
| `widget.tsx` | Widget entry point, initialization, auto-init |
| `components/templates/navi/` | NaVi template components |
| `ChatArea.tsx` | Main chat interface, references panel, actions |
| `RightSidebar.tsx` | Bookmarks panel |
| `LeftSidebar.tsx` | Chat history |
| `NaViStyles.css` | Main widget styles |
| `ResponseContent.css` | Streaming markdown styles |
| `constants.ts` | Version number, configuration |

### Build & Deploy
```bash
# Build widget only
npm run build:widget

# Build all and deploy to production
npm run build:all && firebase deploy --only hosting

# Deploy to staging (preview)
npm run deploy:staging
```

---

## Tasks Achieved (Session 2026-01-17)

### UI/UX Improvements
1. ✅ Removed send button from input field, reduced spacing
2. ✅ Stripped `/roadmap/` prefix from roadmap URLs
3. ✅ Made type badges subtle (R/L ghost badges in references only)
4. ✅ Improved bookmark card styling (link icon, close button, padding)
5. ✅ Created download dropdown (merged MD, PDF, Copy options)
6. ✅ Added references count badge on button
7. ✅ Made chat history scrollbar discreet (hover-only)
8. ✅ Added "References" full text to button (was "Refs")
9. ✅ Added "Back to Top" button
10. ✅ Added border styling to button container and download menu
11. ✅ Made references badge darker for legibility
12. ✅ Increased button spacing and border visibility
13. ✅ Made bookmark title font weight normal until hover
14. ✅ Thinking ticker displays on same line as NaVi badge
15. ✅ Stop button right-aligned
16. ✅ Removed right padding from response scrollbar
17. ✅ Added open link icon to roadmap suggestion panel with hover effects
18. ✅ Fixed link URLs to use full origin (prevents blank tab issue)

### WordPress Integration
19. ✅ Open library resources via URL parameter (`/library/?navi_resource={id}`)
20. ✅ Open roadmap content in new tabs with clean URLs

### Performance (Attempted)
21. ❌ React externalization to CDN (reverted - React 19 lacks UMD builds on unpkg)
22. ✅ Bundle analysis completed (~1MB, 262KB gzipped)

---

## Current Bundle Analysis

| Component | Size (approx) | Notes |
|-----------|---------------|-------|
| Firebase SDK | 400-600KB | Largest dependency |
| jspdf | ~300KB | PDF generation |
| Genkit AI | ~150KB | AI functionality |
| React/ReactDOM | ~130KB | Core framework |
| react-markdown | ~50KB | Markdown parsing |
| streaming-markdown | ~15KB | Streaming content |

**Total:** 1,059KB raw / 262KB gzipped

---

## Future Improvements

### High Priority

#### 1. Responsive Design
- [ ] Mobile-friendly layout (stack sidebars below chat)
- [ ] Touch-friendly buttons and interactions
- [ ] Responsive font sizes
- [ ] Swipe gestures for sidebar toggle
- [ ] Viewport-aware positioning

#### 2. Collapse/Compact Widget Mode
- [ ] Minimized state (floating button or thin bar)
- [ ] Expand/collapse animation
- [ ] Remember user preference (localStorage)
- [ ] Compact mode for smaller screens
- [ ] Docked vs floating options

#### 3. WordPress Content Integration
- [ ] Open WordPress resources in modal overlay (not new tab)
- [ ] Fetch and display WordPress page content inline
- [ ] Deep link to specific sections
- [ ] Preview cards for WordPress content
- [ ] Seamless navigation within widget

### Medium Priority

#### 4. Performance Optimization
- [ ] Lazy load jspdf (~100KB savings, load on download click)
- [ ] Tree-shake Firebase (import only needed modules)
- [ ] Consider esm.sh for React CDN (has React 19)
- [ ] Code splitting for non-critical features
- [ ] Preload critical assets

#### 5. User Experience
- [ ] Keyboard shortcuts (Escape to close, Enter to send)
- [ ] Voice input support
- [ ] Copy code blocks button
- [ ] Syntax highlighting for code
- [ ] Image/media support in responses
- [ ] Loading skeleton states

#### 6. Persistence & State
- [ ] Save chat history to localStorage
- [ ] Sync with Firebase for logged-in users
- [ ] Export/import conversation history
- [ ] Bookmark persistence

### Low Priority

#### 7. Theming & Customization
- [ ] Light/dark/accessible theme toggle
- [ ] Custom accent colors via config
- [ ] Font size preferences
- [ ] Density options (comfortable/compact)

#### 8. Analytics & Monitoring
- [ ] Track widget usage
- [ ] Popular questions/topics
- [ ] Error tracking
- [ ] Performance metrics

---

## Known Issues

1. **Bundle Size Warning:** Widget exceeds 500KB limit - consider lazy loading
2. **React 19 CDN:** UMD builds not available on unpkg, use esm.sh if externalizing
3. **PDF Generation:** Opens blank window briefly while generating

---

## CSS Architecture

### Variables (defined in NaViStyles.css)
```css
--navi-accent: #4DC8BF;
--navi-accent-light: #A8E6E1;
--navi-text-primary: #E8F5F4;
--navi-text-secondary: #77D5CD;
--navi-card-bg: rgba(22, 60, 56, 0.8);
--navi-border-light: rgba(41, 113, 112, 0.5);
```

### Key Classes
- `.navi-container` - Main widget container
- `.navi-chat-area` - Center chat panel
- `.navi-left-sidebar` - History sidebar
- `.navi-right-sidebar` - Bookmarks sidebar
- `.navi-chat-actions` - Bottom action buttons
- `.smd-content` - Streaming markdown content

---

## Testing Checklist

Before deploying:
- [ ] Widget loads on WordPress site
- [ ] Chat sends and receives messages
- [ ] Citations display and are clickable
- [ ] References panel opens/closes
- [ ] Bookmarks can be added/removed
- [ ] Download options work (MD, PDF, Copy)
- [ ] Links open correctly (full URLs)
- [ ] Stop button works during generation
- [ ] Back to top scrolls correctly
- [ ] No console errors

---

## Contacts & Resources

- **Firebase Console:** https://console.firebase.google.com/project/dimenotesv2
- **Production Widget:** https://dimenotesv2.web.app/widget.js
- **WordPress Plugin:** `navi-widget` in wp-content/plugins
