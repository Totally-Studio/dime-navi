# Data Fetching & Analysis Scripts

## Overview

Scripts for fetching and comparing data from WordPress and Firestore for the DiMe NaVi knowledge base.

## Quick Reference

| Script | Purpose | Output |
|--------|---------|--------|
| `fetchWordPressContent.cjs` | Fetch from WordPress REST API | `wordpress-data/` |
| `fetchFirestoreData.cjs` | Fetch from Firestore (client SDK) | `firestore-data/` |
| `fetchPromptMetrics.cjs` | Fetch prompt_metrics (admin SDK) | `metrics-data/` |
| `compareDatasets.cjs` | Compare WP vs Firestore | `comparison-report.json` |
| `analyzeContentChanges.cjs` | Deep content analysis | `content-analysis-report.json` |

## File Paths for Handoff

### Scripts Directory
```
Z:\Application Prototypes\dime\dime-navi\scripts\
```

### All Script Files
```
Z:\Application Prototypes\dime\dime-navi\scripts\fetchWordPressContent.cjs
Z:\Application Prototypes\dime\dime-navi\scripts\fetchFirestoreData.cjs
Z:\Application Prototypes\dime\dime-navi\scripts\fetchPromptMetrics.cjs
Z:\Application Prototypes\dime\dime-navi\scripts\compareDatasets.cjs
Z:\Application Prototypes\dime\dime-navi\scripts\analyzeContentChanges.cjs
Z:\Application Prototypes\dime\dime-navi\scripts\README-DATA-SCRIPTS.md
```

### Output Directories
```
Z:\Application Prototypes\dime\dime-navi\scripts\wordpress-data\
Z:\Application Prototypes\dime\dime-navi\scripts\firestore-data\
Z:\Application Prototypes\dime\dime-navi\scripts\metrics-data\
```

### Latest Data Files (as of 2026-02-03)
```
Z:\Application Prototypes\dime\dime-navi\scripts\wordpress-data\combined_2026-02-03.json
Z:\Application Prototypes\dime\dime-navi\scripts\wordpress-data\resources_2026-02-03.json
Z:\Application Prototypes\dime\dime-navi\scripts\wordpress-data\pages_2026-02-03.json

Z:\Application Prototypes\dime\dime-navi\scripts\firestore-data\all-documents_2026-02-03.json
Z:\Application Prototypes\dime\dime-navi\scripts\firestore-data\summary_2026-02-03.json

Z:\Application Prototypes\dime\dime-navi\scripts\comparison-report.json
Z:\Application Prototypes\dime\dime-navi\scripts\content-analysis-report.json
```

### Configuration Files
```
Z:\Application Prototypes\dime\dime-navi\.env.local          (Firebase dev config)
Z:\Application Prototypes\dime\dime-navi\.env.client         (Firebase prod config)
Z:\Application Prototypes\dime\dime-navi\firestore.rules     (Security rules)
Z:\Application Prototypes\dime\dime-navi\.gitignore          (Excludes data directories)
```

## Usage

### 1. Fetch WordPress Content

**No authentication required** - WordPress REST API is public.

```bash
npm run fetch:wp
```

**Output**:
- `scripts/wordpress-data/resources_YYYY-MM-DD.json` (245 items)
- `scripts/wordpress-data/pages_YYYY-MM-DD.json` (72 items)
- `scripts/wordpress-data/combined_YYYY-MM-DD.json` (317 total)

### 2. Fetch Firestore Knowledge Base

**Uses anonymous authentication** - works because knowledge base collections allow authenticated reads.

```bash
npm run fetch:firestore
```

**Output**:
- `scripts/firestore-data/all-documents_YYYY-MM-DD.json` (313 items)
- `scripts/firestore-data/summary_YYYY-MM-DD.json`

### 3. Fetch Prompt Metrics (NEW)

**Requires Firebase Admin SDK** - bypasses security rules.

#### Setup (First Time Only)

1. **Download Service Account:**
   - Go to [Firebase Console](https://console.firebase.google.com/project/dimenotesv2/settings/serviceaccounts/adminsdk)
   - Click "Generate New Private Key"
   - Save as: `service-accounts/dimenotesv2-admin.json` (for dev)
   - Or: `service-accounts/navi-production-485916-admin.json` (for prod)

2. **Create Directory:**
   ```bash
   mkdir service-accounts
   ```

3. **Move Service Account File:**
   ```
   Z:\Application Prototypes\dime\dime-navi\service-accounts\dimenotesv2-admin.json
   ```

#### Run

```bash
# Fetch from dev (dimenotesv2)
npm run fetch:metrics:dev

# Fetch from prod (navi-production-485916)
npm run fetch:metrics:prod

# Fetch with limit
node scripts/fetchPromptMetrics.cjs dev --limit 1000

# Custom service account path
node scripts/fetchPromptMetrics.cjs dev --service-account /path/to/file.json
```

**Output**:
- `scripts/metrics-data/prompt-metrics_dev_YYYY-MM-DD.json`
- `scripts/metrics-data/metrics-summary_dev_YYYY-MM-DD.json`

### 4. Compare Datasets

Compares WordPress vs Firestore to find new/updated/deleted items.

```bash
npm run compare:datasets
```

**Output**: `scripts/comparison-report.json`

**Summary**:
- 10 new items in WordPress
- 6 deleted from WordPress
- 62 potentially updated items

### 5. Analyze Content Changes

Deep content analysis - compares actual text, not just dates.

```bash
npm run analyze:content
```

**Output**: `scripts/content-analysis-report.json`

**Summary**:
- 55 major content changes (>30% difference)
- 1 moderate change (10-30%)
- 3 title changes
- 5 date-only changes

## Key Findings (2026-02-03)

### WordPress vs Firestore

| Metric | WordPress (Live) | Firestore (Jan 16) | Difference |
|--------|-----------------|-------------------|------------|
| Resources | 245 | 242 | +3 new |
| Pages | 72 | 71 | +1 new |
| **Total** | **317** | **313** | **+4** |

### Content Changes

**Major Finding**: WordPress underwent a significant content quality improvement initiative:

1. **Standardized Introductions**: All "Regulatory spotlight" pages now have professional intro paragraphs
2. **Better Attribution**: Changed "INDUSTRY RESOURCE" → "TOOLKIT BY DIME", "CHECKLIST BY DIME"
3. **Content Restructuring**: Many pages +10-30% longer with better organization
4. **55 items** have >30% content changes (substantial rewrites)

**Recommendation**: Sync is highly recommended to get these quality improvements into Firestore.

## Authentication Methods

### WordPress REST API
- **Method**: None (public API)
- **Access**: Full read access to all published content

### Firestore Knowledge Base
- **Method**: Anonymous authentication (Firebase client SDK)
- **Access**: Read-only via `allow read: if isAuthenticated()`
- **Collections**: `knowledgebase_wp`, `knowledgebase_config`, etc.

### Firestore Metrics
- **Method**: Firebase Admin SDK with service account
- **Access**: Full read/write (bypasses security rules)
- **Collection**: `prompt_metrics`
- **Rules**: `allow read: if false` (client SDK blocked)

## Security Notes

1. **Service accounts** are in `.gitignore` - never commit!
2. **Anonymous auth** is temporary - users are cleaned up automatically
3. **Admin SDK** requires service account JSON file
4. **Firestore rules** prevent client reads of `prompt_metrics` (intentional)

## Troubleshooting

### "Permission denied" errors

**For knowledge base**: Use anonymous authentication (already implemented in `fetchFirestoreData.cjs`)

**For prompt_metrics**: Use Admin SDK with service account (see `fetchPromptMetrics.cjs`)

### Service account not found

```
Error: Service account file not found!
Expected: Z:\Application Prototypes\dime\dime-navi\service-accounts\dimenotesv2-admin.json
```

**Solution**: Download from Firebase Console > Project Settings > Service Accounts > Generate New Private Key

### "Module not found: firebase-admin"

**Solution**: Already installed via `@genkit-ai/firebase` dependency. If missing:
```bash
npm install firebase-admin
```

## Next Steps

1. **Review comparison reports** to understand what changed
2. **Create Phase 2 import script** to update Firestore with WordPress changes
3. **Analyze metrics data** for token usage, response times, error rates
4. **Set up automated sync** (optional) - webhook or scheduled Cloud Function

## Related Files

- **Firestore Rules**: `Z:\Application Prototypes\dime\dime-navi\firestore.rules`
- **Package.json**: `Z:\Application Prototypes\dime\dime-navi\package.json`
- **Environment Config**: `.env.local`, `.env.client`
- **Plan Document**: `C:\Users\Totally Team\.claude\plans\stateless-coalescing-quilt.md`

## Support

For issues or questions, refer to:
- Main README: `Z:\Application Prototypes\dime\dime-navi\README.md`
- CLAUDE.md: `Z:\Application Prototypes\dime\dime-navi\.claude\CLAUDE.md`
- WordPress Sync Guide: `Z:\Application Prototypes\dime\dime-navi\docs\WORDPRESS_SYNC.md`

---

**Last Updated**: 2026-02-03
**Scripts Version**: 1.0
**Status**: Production Ready
