# AI Widget Knowledge Base Configuration Guide

## Overview

The DiMeNotes AI widget can be configured to use different combinations of content from the WordPress sync:
- **Library Content** (242 documents) - Regulatory resources from `/resources/*`
- **Roadmap Content** (71 documents) - Roadmap pages from `/roadmap/*`

This configuration is managed in the **backend admin**, not within the widget itself.

## Quick Start: Toggle Content Types

### Method 1: Prompt Studio Version Admin (Recommended)

The easiest way to configure which content types are available to the widget is directly in the Prompt Studio:

1. Navigate to http://localhost:3000/prompt-studio (requires `super_admin` role)
2. Go to "Version Admin" tab
3. Expand the **"Widget Knowledge Configuration"** panel
4. Toggle checkboxes:
   - ☑ Include Library Content (regulatory resources from /resources/*)
   - ☑ Include Roadmap Pages (roadmap pages from /roadmap/*)
5. View live document count preview
6. Click **"Save Configuration"**
7. Configuration saved to Firestore immediately

**Configuration Options**:
- Both: `includeLibrary: true, includeRoadmap: true` → 313 documents
- Library only: `includeLibrary: true, includeRoadmap: false` → 242 documents
- Roadmap only: `includeLibrary: false, includeRoadmap: true` → 71 documents
- All (no filter): `includeLibrary: false, includeRoadmap: false` → 313 documents

### Method 2: Firebase Console (Manual)

Alternatively, you can configure directly via Firebase Console:

1. Open Firebase Console → Firestore
2. Navigate to `knowledgebase_config` collection
3. Open or create `widget_settings` document
4. Set these fields:
   ```json
   {
     "includeLibrary": true,
     "includeRoadmap": true,
     "updatedAt": "2026-01-16T10:00:00Z"
   }
   ```

## How It Works

The configuration is now built directly into the Prompt Studio Version Admin interface. When you toggle the checkboxes and save:

1. Settings are saved to Firestore at `knowledgebase_config/widget_settings`
2. The widget reads this configuration on initialization
3. Queries are filtered to only include selected content types
4. Changes take effect immediately (no code deployment needed)

## Implementation Details

### Widget Service Query Logic

The widget's knowledge base query should read configuration from Firestore:

```typescript
// src/services/widgetKnowledgeService.ts

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

async function getKnowledgeBaseContent() {
  // Fetch configuration
  const configRef = doc(db, 'knowledgebase_config', 'widget_settings');
  const configDoc = await getDoc(configRef);

  // Default to both if no config exists
  const config = configDoc.exists()
    ? configDoc.data()
    : { includeLibrary: true, includeRoadmap: true };

  // Build query with filters
  let constraints = [];

  if (config.includeLibrary && !config.includeRoadmap) {
    // Library content only
    constraints.push(where('contentType', '==', 'library'));
  } else if (config.includeRoadmap && !config.includeLibrary) {
    // Roadmap content only
    constraints.push(where('contentType', '==', 'roadmap'));
  }
  // If both true or both false, no filter = include all

  const q = query(collection(db, 'knowledgebase_wp'), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data());
}
```

### Version Admin UI Component

The configuration interface is already built into the Prompt Studio Version Admin component at:

**File**: `src/components/admin/KnowledgeVersionAdmin.tsx`

**Features**:
- Collapsible "Widget Knowledge Configuration" panel
- Checkboxes for Library and Roadmap content types
- Live document count preview
- Save button with loading states
- Automatic loading of current configuration from Firestore
- Success/error message handling

**Location in UI**:
- Navigate to http://localhost:3000/prompt-studio
- Switch to "Version Admin" tab
- Configuration panel appears below sync progress and above version lists

## Testing Different Configurations

Before changing production settings, test configurations using Prompt Studio:

1. Navigate to http://localhost:3000/prompt-studio
2. Update `knowledgebase_config/widget_settings` in Firebase Console
3. Refresh Prompt Studio
4. Test queries with different content combinations:
   - **Library only**: Test regulatory/resource questions
   - **Roadmap only**: Test roadmap/strategy questions
   - **Both**: Test comprehensive questions

5. Compare response quality and relevance

## Content Type Breakdown in Version Admin

When viewing versions at http://localhost:3000/prompt-studio, you'll now see:

```
knowledgebase_wp_2026-01-16T09-29-45
STAGING | 313 documents
• 242 library
• 71 roadmap
```

This helps you verify:
- Content was synced correctly
- Both content types are present
- Document counts match expectations

## Common Use Cases

### Use Case 1: Library Content Only
**When**: Widget focused on regulatory compliance questions
**Config**: `includeLibrary: true, includeRoadmap: false`
**Result**: 242 documents, faster responses, focused on regulations

### Use Case 2: Roadmap Content Only
**When**: Widget focused on strategic planning questions
**Config**: `includeLibrary: false, includeRoadmap: true`
**Result**: 71 documents, roadmap-specific guidance

### Use Case 3: Both (Comprehensive)
**When**: General-purpose widget covering all topics
**Config**: `includeLibrary: true, includeRoadmap: true`
**Result**: 313 documents, comprehensive knowledge base

### Use Case 4: A/B Testing
**Process**:
1. Deploy widget with both content types enabled
2. Monitor usage analytics
3. Test library-only configuration
4. Compare user satisfaction and query success rates
5. Choose optimal configuration based on data

## Firestore Security Rules

Ensure your firestore.rules allow reading the configuration:

```javascript
// Already configured in your firestore.rules
match /knowledgebase_config/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;  // Add admin role check in production
}
```

## Troubleshooting

### Widget Not Respecting Configuration

**Symptoms**: Widget returns all content regardless of settings

**Causes**:
1. Configuration document doesn't exist
2. Widget service hasn't implemented filtering
3. Cache not cleared after configuration change

**Solutions**:
1. Verify `knowledgebase_config/widget_settings` exists in Firestore
2. Check widget service implements query filtering (Step 1 above)
3. Clear widget cache or restart widget initialization

### Wrong Document Counts

**Symptoms**: Widget reports different document count than Version Admin

**Causes**:
1. Old content without `contentType` field
2. Configuration mismatch
3. Multiple versions of content

**Solutions**:
1. Run new sync to ensure all documents have `contentType` field
2. Verify configuration matches expected behavior
3. Promote latest staging version with content type breakdown

### Configuration Changes Not Taking Effect

**Symptoms**: Widget behavior doesn't change after updating config

**Causes**:
1. Widget caching configuration
2. Configuration cached in CDN (if using)
3. Multiple widget instances with stale config

**Solutions**:
1. Implement config refresh on widget initialization
2. Add cache-busting timestamp to config fetches
3. Restart widget or clear browser cache

## Best Practices

1. **Always test configurations in Prompt Studio before production**
2. **Document why you chose a specific configuration**
3. **Monitor widget performance with different configurations**
4. **Keep both content types synced even if only using one**
5. **Use Version Admin to verify content type breakdown**
6. **Create separate configurations for development, staging, and production**

## Next Steps

1. Implement widget query filtering (Step 1)
2. Create configuration document in Firebase Console
3. Test with different configurations
4. Add admin UI for easy toggling (Step 2)
5. Monitor usage and optimize configuration based on user needs

## Related Documentation

- [WORDPRESS_SYNC.md](./WORDPRESS_SYNC.md) - Complete WordPress sync documentation
- [Version Admin Guide](../README.md#version-management) - Managing content versions
- [Firestore Security](../firestore.rules) - Security rules configuration
