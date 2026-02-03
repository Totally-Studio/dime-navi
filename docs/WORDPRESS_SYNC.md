# WordPress to Firestore Sync - Configuration Guide

## Overview
The DiMeNotes sync system pulls content from WordPress into Firestore, maintaining version history for testing and rollback. All WordPress URLs are normalized to be environment-agnostic, enabling seamless deployment across local, staging, UAT, and production environments.

## Environment Variables (Required)

Each environment needs these variables configured in its respective `.env` file:

### Local Development (`.env.local`)
```env
VITE_WORDPRESS_API_URL=https://dime-wordpress-website.local/wp-json
VITE_WORDPRESS_BASE_URL=https://dime-wordpress-website.local
```

### Staging (`.env.staging`)
```env
VITE_WORDPRESS_API_URL=https://staging.yourdomain.com/wp-json
VITE_WORDPRESS_BASE_URL=https://staging.yourdomain.com
```

### UAT (`.env.uat`)
```env
VITE_WORDPRESS_API_URL=https://uat.yourdomain.com/wp-json
VITE_WORDPRESS_BASE_URL=https://uat.yourdomain.com
```

### Production (`.env.production`)
```env
VITE_WORDPRESS_API_URL=https://yourdomain.com/wp-json
VITE_WORDPRESS_BASE_URL=https://yourdomain.com
```

**Note**: Replace `yourdomain.com` with your actual WordPress domain.

## Content Types

The sync distinguishes between two types of WordPress content:

### Library Content (`contentType: 'library'`)
- **Source**: Custom post type `/resources/*`
- **Examples**: "Artificial Intelligence-Enabled Device Software Functions", regulatory guidance documents
- **Field**: `contentType: 'library'`
- **Count**: ~242 documents

### Roadmap Content (`contentType: 'roadmap'`)
- **Source**: WordPress pages `/roadmap/*`
- **Examples**: `/why-digital/1-1-patient-focused-development/`, roadmap hierarchy pages
- **Field**: `contentType: 'roadmap'`
- **Count**: Varies based on roadmap structure

**Configuring Content Sets**:
You can configure which content types are included in the knowledge base via the backend admin (not in the widget). This allows you to:
- Use only library content
- Use only roadmap pages
- Use both library and roadmap
- Switch between different archived versions

## Version Management Architecture

The sync system maintains multiple collection versions in Firestore:

### 1. Primary Collection (`knowledgebase_wp`)
- **Purpose**: Active knowledge base used by all users in production
- **Source**: Promoted from staging after testing
- **Update Method**: Manual promotion via Prompt Studio
- **Content**: Contains both resource and roadmap content with `contentType` field

### 2. Staging Collections (`knowledgebase_wp_{timestamp}`)
- **Purpose**: Test new WordPress content before going live
- **Creation**: Click "Sync Now" in Prompt Studio Version Admin
- **Testing**: Use "Test in Prompt Studio" to compare against current primary
- **Retention**: Auto-purged after 7 days if not promoted
- **Format**: `knowledgebase_wp_2026-01-16T14-30-00`

### 3. Archived Collections (`knowledgebase_archive_{timestamp}`)
- **Purpose**: Historical versions for rollback
- **Creation**: Automatically created when promoting new primary
- **Rollback**: Use "Rollback to This" button in Version Admin
- **Retention**: Auto-purged after 30 days (configurable)
- **Format**: `knowledgebase_archive_2026-01-16T14-30-00`

## Sync Workflow

### 1. Sync from WordPress
- Navigate to http://localhost:3000/prompt-studio (requires `super_admin` role)
- Click "Sync Now" → "From WordPress API"
- New staging version created with timestamp
- Progress bar shows: fetching → processing → importing → registering

### 2. Test Staging Version
- Click "Test in Prompt Studio" on staging version
- Editor shows side-by-side comparison: Original vs WordPress
- Verify content quality, check for broken links
- Test queries to ensure new content is accurate

### 3. Promote to Production
- Click "Promote to Primary" on tested staging version
- System automatically:
  - Archives current primary (creates backup)
  - Copies staging to primary collection
  - Removes staging version from staging list
- Production users now see new content

### 4. Rollback if Needed
- Click "Rollback to This" on any archived version
- Current primary is archived first (safety backup)
- Selected archive becomes new primary
- Instant content reversion without re-syncing

### 5. Cleanup Old Versions
- Click "Purge Old" to manually trigger cleanup
- Or wait for automatic purge based on retention policy
- Staging versions: 7 days
- Archives: 30 days (configurable)

## URL Normalization (Domain-Agnostic Content)

All WordPress content URLs are normalized during sync to work across environments:

### Before Sync (from WordPress)
```
https://dime-wordpress-website.local/wp-content/uploads/2024/01/image.jpg
```

### Stored in Firestore (relative)
```
/wp-content/uploads/2024/01/image.jpg
```

### At Runtime (reconstructed)
```
[VITE_WORDPRESS_BASE_URL]/wp-content/uploads/2024/01/image.jpg
```

### Benefits
- ✅ Same Firestore content works in local, staging, UAT, and production
- ✅ No need to re-sync when changing WordPress domains
- ✅ No hardcoded local URLs in production builds
- ✅ Image and internal links automatically resolve correctly

### Implementation Details

The normalization happens in `wpSyncService.ts` during the `fetchFromWordPress()` function:

```typescript
function normalizeWordPressUrls(content: string, sourceBaseUrl: string): string {
  if (!content) return '';
  if (!sourceBaseUrl) return content;

  const escapedUrl = sourceBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const urlPattern = new RegExp(escapedUrl, 'g');
  return content.replace(urlPattern, '');
}
```

This function is applied to:
- `description` - Resource excerpt text
- `summary` - Content summary (first 500 chars)
- `content.raw` - Plain text content
- `content.html` - HTML content
- `content.excerpt` - Excerpt HTML
- `url` - Resource URL
- `metadata.featuredImage` - Featured image URL

## Access Control

### Super Admin Only
Only users with `super_admin` role can access:
- http://localhost:3000/prompt-studio
- Version Admin tab
- Sync operations (Sync Now button)
- Promotion/rollback controls
- Purge operations

### Regular Users
- See only the primary collection content via main app
- Cannot access version management features
- Automatically use production content

## Filtering by Content Type

Each document in Firestore has a `contentType` field that allows filtering:

### Query Examples

**Get only library content:**
```typescript
const libraryQuery = query(
  collection(db, 'knowledgebase_wp'),
  where('contentType', '==', 'library')
);
```

**Get only roadmap pages:**
```typescript
const roadmapQuery = query(
  collection(db, 'knowledgebase_wp'),
  where('contentType', '==', 'roadmap')
);
```

**Get both (no filter needed):**
```typescript
const allQuery = collection(db, 'knowledgebase_wp');
```

### Implementation in AI Widget

The AI widget can be configured to use different combinations of content types. Here's how to implement this:

#### Step 1: Create Configuration Document

Create a configuration document in Firestore at `knowledgebase_config/widget_settings`:

```json
{
  "includeLibrary": true,
  "includeRoadmap": true,
  "updatedAt": "2026-01-16T10:00:00Z"
}
```

**Configuration Options**:
- `includeLibrary: true, includeRoadmap: true` - Use both (default, 313 documents)
- `includeLibrary: true, includeRoadmap: false` - Library only (242 documents)
- `includeLibrary: false, includeRoadmap: true` - Roadmap only (71 documents)
- `includeLibrary: false, includeRoadmap: false` - Use all documents (no filtering)

#### Step 2: Update Widget Query Logic

Modify the widget's query builder to filter based on configuration:

```typescript
// In your widget service file
async function getKnowledgeBaseContent() {
  // Fetch configuration
  const configRef = doc(db, 'knowledgebase_config', 'widget_settings');
  const configDoc = await getDoc(configRef);
  const config = configDoc.exists() ? configDoc.data() : { includeLibrary: true, includeRoadmap: true };

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

#### Step 3: Add Admin UI Controls (Optional)

Create a settings page in the backend admin (not in the widget itself):

**UI Component Example**:
```typescript
function KnowledgeBaseSettings() {
  const [config, setConfig] = useState({ includeLibrary: true, includeRoadmap: true });

  const handleSave = async () => {
    const configRef = doc(db, 'knowledgebase_config', 'widget_settings');
    await setDoc(configRef, {
      ...config,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div>
      <h3>AI Widget Knowledge Base Sources</h3>
      <label>
        <input
          type="checkbox"
          checked={config.includeLibrary}
          onChange={(e) => setConfig({ ...config, includeLibrary: e.target.checked })}
        />
        Include Library Content (242 documents)
      </label>
      <label>
        <input
          type="checkbox"
          checked={config.includeRoadmap}
          onChange={(e) => setConfig({ ...config, includeRoadmap: e.target.checked })}
        />
        Include Roadmap Pages (71 documents)
      </label>
      <button onClick={handleSave}>Save Configuration</button>
    </div>
  );
}
```

#### Step 4: Widget Behavior

Once configured, the widget will:
- **Read** the configuration from Firestore on initialization
- **Filter** queries to only include selected content types
- **Update** automatically when configuration changes (no code deployment needed)
- **Cache** configuration to avoid repeated Firestore reads

#### Quick Toggle Process

To switch between different knowledge sets:

1. **Via Firebase Console** (Quick method):
   - Navigate to Firestore → `knowledgebase_config` → `widget_settings`
   - Update `includeLibrary` and/or `includeRoadmap` fields
   - Changes take effect on next widget initialization

2. **Via Admin UI** (Recommended):
   - Create admin settings page with checkboxes
   - Users can toggle without accessing Firebase Console
   - Can add preview showing document counts for each combination

3. **For Testing**:
   - Use Prompt Studio to test with different configurations
   - Compare responses between library-only vs roadmap-only vs both
   - Verify quality before changing production settings

## Troubleshooting

### Sync fails with "WordPress API error: 404"

**Cause**: Incorrect WordPress API URL or WordPress site unreachable

**Solution**:
1. Check `VITE_WORDPRESS_API_URL` in your `.env` file
2. Verify WordPress REST API is enabled
3. Test URL manually: `[WORDPRESS_URL]/wp-json/wp/v2/resource`
4. Ensure CORS is configured if accessing from different domain
5. Check WordPress site is running (local dev)

### Content shows local URLs in production

**Cause**: Content synced before URL normalization was implemented

**Solution**:
- Run a new sync to get normalized URLs
- Old syncs retain hardcoded URLs (not migrated automatically)
- Promote new staging version to replace primary

### Cannot access Prompt Studio

**Cause**: User doesn't have `super_admin` role

**Solution**:
1. Check Firebase user role in Firestore `users` collection
2. Contact system admin to update role
3. Role field should be: `role: "super_admin"`

### Staging version disappeared

**Cause**: Auto-purged after 7 days without promotion

**Solution**:
- Check "Archives" section - may have been promoted
- Create new sync if needed
- Staging versions are temporary for testing

### Images don't load in production

**Cause**: Relative URLs need runtime reconstruction

**Solution**:
- Ensure `VITE_WORDPRESS_BASE_URL` is set correctly
- In display components, prepend base URL to relative paths:
  ```typescript
  const imageUrl = image.startsWith('/')
    ? `${import.meta.env.VITE_WORDPRESS_BASE_URL}${image}`
    : image;
  ```

### Sync creates empty staging version

**Cause**: WordPress returns no resources or API endpoint incorrect

**Solution**:
1. Verify WordPress has published resources
2. Check custom post type 'resource' exists
3. Test API endpoint: `/wp-json/wp/v2/resource?per_page=100&_embed`
4. Check WordPress REST API is not disabled

## Configuration Files Reference

### Modified Files
- **src/services/wpSyncService.ts**: WordPress sync service with URL normalization
  - Line 21: Uses `VITE_WORDPRESS_API_URL` environment variable
  - Lines 90-101: `normalizeWordPressUrls()` function
  - Lines 165-197: URL normalization applied to all content fields

- **constants.ts**: Roadmap URL configuration
  - Line 55: Uses `VITE_WORDPRESS_BASE_URL` environment variable
  - Affects 35+ roadmap page URLs

### Environment Files
- **.env.local**: Local development WordPress URLs
- **.env.staging**: Staging environment WordPress URLs
- **.env.uat**: UAT environment WordPress URLs
- **.env.production**: Production environment WordPress URLs

## Development Workflow

### Local Development
```bash
# Use local WordPress instance
npm run dev
# Uses .env.local with https://dime-wordpress-website.local
```

### Staging Deployment
```bash
# Build for staging
npm run build -- --mode staging
# Uses .env.staging with staging URLs
```

### UAT Deployment
```bash
# Build for UAT
npm run build -- --mode uat
# Uses .env.uat with UAT URLs
```

### Production Deployment
```bash
# Build for production
npm run build
# Uses .env.production with production URLs
```

## Version Management Best Practices

### 1. Always Test Before Promoting
- Never promote staging directly to production without testing
- Use "Test in Prompt Studio" to verify content quality
- Check for broken links, missing images, incorrect formatting

### 2. Keep Archives Clean
- Regularly purge old archives (use "Purge Old" button)
- Don't accumulate too many staging versions
- Archives older than 30 days are auto-purged

### 3. Document Major Changes
- Note what changed in each sync (WordPress post IDs, content updates)
- Keep track of promotion dates
- Document any rollbacks and reasons

### 4. Monitor Sync Health
- Check document counts match expected WordPress resource count
- Verify no errors in sync progress bar
- Review Firestore collection sizes

### 5. Plan for Rollback
- Always have at least one archive version
- Test rollback process in staging first
- Keep retention policy reasonable (30 days default)

## Advanced: Custom Retention Policy

To change the retention policy for archives:

1. Open `src/services/knowledgeConfigService.ts`
2. Find the `DEFAULT_CONFIG` constant (around line 51)
3. Update `retentionDays` value:
   ```typescript
   retentionDays: 60, // Change from 30 to 60 days
   ```
4. Or use the `setRetentionDays()` method programmatically

## Support

For issues or questions:
1. Check this documentation first
2. Review the troubleshooting section
3. Check Firebase Console for Firestore data
4. Contact the development team

## Related Documentation

- **README.md**: Project overview and setup
- **IMPLEMENTATION-PLAN.md**: Original sync system design
- **src/services/knowledgeConfigService.ts**: Version management API
- **src/components/admin/KnowledgeVersionAdmin.tsx**: UI component for version management
