# Prompt Studio

A simple, isolated interface for managing, testing, and publishing prompts in DimeNotes.

## Overview

Prompt Studio allows you to:
- ✅ **Edit** system prompts and template instructions
- ✅ **Test** prompts with real queries before publishing
- ✅ **Publish** new versions with version history
- ✅ **Revert** to previous versions if needed

## Access

**URL:** `http://localhost:3000/prompt-studio`

**Requirements:**
- Must be authenticated (Firebase login)
- Hidden route (no navigation link in main app)

## Getting Started

### 1. First-Time Setup

Run the migration script to populate Firestore with existing prompts:

```bash
npm run migrate-prompts
```

This will create the `/prompts` collection in Firestore with:
- System Prompt (Start)
- System Prompt (End)
- All 7 template instructions (SUMMARY, FAQ, TIMELINE, etc.)

### 2. Access Prompt Studio

1. Start the dev server: `npm run dev`
2. Login to the main app at `http://localhost:3000`
3. Navigate directly to `http://localhost:3000/prompt-studio`

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Prompt Studio                            │
├────────────────┬─────────────────────────┬─────────────────────┤
│ PROMPT LIST    │   EDITOR & TESTER       │  VERSION HISTORY    │
│                │                         │                     │
│ System Prompts │ Edit prompt content     │ v3 (Current)        │
│ ├─ Start       │ ┌─────────────────────┐ │ ├─ 3 days ago      │
│ └─ End         │ │ You are an expert...│ │ └─ [Revert]        │
│                │ │                     │ │                     │
│ Templates      │ │ [Edit here]         │ │ v2                  │
│ ├─ SUMMARY     │ └─────────────────────┘ │ ├─ 10 days ago     │
│ ├─ FAQ         │                         │ └─ [Revert]        │
│ └─ ...         │ Test Query:             │                     │
│                │ [Enter question...]     │ v1                  │
│ [Select]       │                         │ ├─ 30 days ago     │
│                │ Template: [SUMMARY ▼]   │ └─ [Revert]        │
│                │                         │                     │
│                │ Resources: 2 selected   │                     │
│                │ [🧪 Run Test]           │                     │
│                │                         │                     │
│                │ Results:                │                     │
│                │ ✅ Citations: 4         │                     │
│                │ ⏱️  Time: 1.2s          │                     │
│                │ [Response preview...]   │                     │
│                │                         │                     │
│                │ [Discard] [📤 Publish]  │                     │
└────────────────┴─────────────────────────┴─────────────────────┘
```

## Workflow: Edit → Test → Publish

### Step 1: Select a Prompt

Click any prompt from the list on the left:
- **System Prompts** - Core AI behavior and citation rules
- **Templates** - Format-specific instructions (SUMMARY, FAQ, etc.)

### Step 2: Edit Content

Edit the prompt text in the center panel:
- Changes auto-save to local draft (not in database yet)
- **Unsaved** indicator shows if you have changes
- Current version number displayed

### Step 3: Test Your Changes

Before publishing, test your prompt:

1. **Enter a test query** - Ask a question
2. **Select resources** - Choose knowledge sources (uses existing selector)
3. **Choose template** - Select output format
4. **Click "Run Test"** - See the response

**Test Results Show:**
- ✅ Citation count
- ⏱️ Response time
- Full response preview

### Step 4: Publish

When satisfied with your changes:

1. Click **"Publish"**
2. Add optional release notes
3. Confirm - this creates v{N+1} and makes it active

**What happens:**
- New version saved to Firestore
- All users get the new prompt immediately
- Old version kept in history

### Step 5: Revert (If Needed)

If something goes wrong:

1. Go to **Version History** (right panel)
2. Find the previous good version
3. Click **"Revert"**
4. Confirm - instantly rolls back

## Architecture

### Files Created (Isolated from Main App)

```
src/
├── PromptStudioApp.tsx              # Root component
├── components/prompt-studio/
│   ├── PromptStudioLayout.tsx       # Layout wrapper
│   ├── PromptList.tsx               # Prompt selector
│   ├── PromptEditor.tsx             # Editor + tester
│   └── VersionHistory.tsx           # Version browser
├── services/
│   └── promptStudioService.ts       # Firestore operations
├── types/
│   └── promptStudio.ts              # Type definitions
└── hooks/
    └── usePromptStudio.ts           # State management
```

### Database Schema

**Firestore Collection:** `/prompts`

```typescript
{
  id: "system_prompt_start",
  type: "system_start" | "system_end" | "template",
  name: "System Prompt (Start)",
  description: "Defines AI role and behavior",
  templateName?: "SUMMARY" | "FAQ" | ...,
  currentVersion: 3,
  versions: [
    {
      version: 3,
      content: "You are an expert...",
      publishedAt: "2025-11-03T10:00:00Z",
      publishedBy: "user@example.com",
      notes: "Improved citation rules"
    },
    // ... older versions
  ]
}
```

### Integration with Main App

**Currently:** Main app still uses `constants.ts`

**Future:** Update `backendService.ts` to fetch from Firestore:

```typescript
// Instead of:
import { SYSTEM_PROMPT_START, SYSTEM_PROMPT_END } from '../constants';

// Use:
const prompts = await promptStudioService.getActivePromptsForGeneration();
const systemInstruction = prompts.systemStart + context + prompts.systemEnd;
```

## Features

### ✅ Version Control
- Every publish creates a new version
- Full version history maintained
- One-click revert to any previous version

### ✅ Safe Testing
- Test without affecting live users
- See exactly what the AI will generate
- Validate citations and formatting

### ✅ Isolated & Safe
- Completely separate from main app
- Zero risk to existing functionality
- Can be disabled by removing route

### ✅ Simple Workflow
- No staging environments
- No approval workflows
- Just: Edit → Test → Publish

## Limitations & Future Enhancements

### Current Limitations
- ❌ No A/B testing
- ❌ No analytics/metrics
- ❌ No automated test suites
- ❌ No staging environment
- ❌ No role-based permissions (anyone authenticated can edit)

### Future Enhancements
1. **Role-Based Access** - Admin-only editing
2. **Analytics** - Track prompt performance
3. **A/B Testing** - Compare prompt versions
4. **Automated Tests** - Run test suites before publish
5. **Staging** - Test with internal users first

## Troubleshooting

### Prompt Studio not loading

**Check:**
1. Are you logged in? (Required for access)
2. Did you run `npm run migrate-prompts`?
3. Check browser console for errors

### Changes not appearing in main app

**Reason:** Main app still uses `constants.ts`

**Solution:** Update `backendService.ts` to fetch from Firestore (see Integration section above)

### Test failing with "No system end prompt found"

**Reason:** Migration didn't complete

**Solution:** Re-run `npm run migrate-prompts`

## Security Notes

### Current Setup (Development)
- Hidden route (no UI links)
- Requires authentication
- Anyone authenticated can access

### Production Recommendations
1. **Add admin role check** in `ProtectedRoute`
2. **Firestore Security Rules** - Restrict `/prompts` writes to admins
3. **Audit logging** - Track who publishes what
4. **Separate environment** - Deploy Prompt Studio separately

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Firestore `/prompts` collection exists
3. Confirm authentication is working
4. Check the main app still loads at `/`

---

**Version:** 1.0.0
**Last Updated:** 2025-11-03
**Maintainer:** DimeNotes Team
