#!/usr/bin/env node

/**
 * Analyze Content Changes
 *
 * Deep comparison of actual content between WordPress and Firestore
 *
 * Usage: node scripts/analyzeContentChanges.cjs
 */

const fs = require('fs');
const path = require('path');

// File paths
const WP_DATA_DIR = path.join(__dirname, 'wordpress-data');
const FS_DATA_DIR = path.join(__dirname, 'firestore-data');

function findLatestFile(dir, pattern) {
  const files = fs.readdirSync(dir).filter(f => f.includes(pattern));
  if (files.length === 0) return null;
  files.sort().reverse();
  return path.join(dir, files[0]);
}

/**
 * Strip HTML tags and normalize whitespace for comparison
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1.0;

  // Simple character-level comparison
  let matches = 0;
  const minLen = Math.min(len1, len2);
  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) matches++;
  }

  return matches / maxLen;
}

/**
 * Calculate percentage change in content length
 */
function calculateLengthChange(oldLen, newLen) {
  if (oldLen === 0) return newLen > 0 ? 100 : 0;
  return ((newLen - oldLen) / oldLen) * 100;
}

/**
 * Extract first N words for preview
 */
function getPreview(text, words = 50) {
  if (!text) return '';
  const wordArray = text.split(/\s+/);
  return wordArray.slice(0, words).join(' ') + (wordArray.length > words ? '...' : '');
}

function main() {
  console.log('═'.repeat(80));
  console.log('🔍 Content Change Analysis');
  console.log('═'.repeat(80));

  // Load data
  console.log('\n📥 Loading data...');
  const wpFile = findLatestFile(WP_DATA_DIR, 'combined');
  const fsFile = findLatestFile(FS_DATA_DIR, 'all-documents');

  if (!wpFile || !fsFile) {
    console.error('   ✗ Missing data files. Run fetch:wp and fetch:firestore first.');
    process.exit(1);
  }

  const wpData = JSON.parse(fs.readFileSync(wpFile, 'utf8'));
  const fsData = JSON.parse(fs.readFileSync(fsFile, 'utf8'));

  const wpResources = wpData.resources || [];
  const wpPages = wpData.pages || [];
  const wpAll = [...wpResources, ...wpPages];

  console.log(`   ✓ WordPress: ${wpAll.length} items`);
  console.log(`   ✓ Firestore: ${fsData.length} items`);

  // Create lookups
  const wpById = new Map();
  wpAll.forEach(item => {
    wpById.set(item.id, item);
  });

  const fsById = new Map();
  fsData.forEach(item => {
    fsById.set(item.wpPostId, item);
  });

  console.log('\n🔍 Analyzing content changes...');

  // Analyze items that exist in both
  const contentChanges = {
    majorChanges: [],      // >30% content change or completely different
    moderateChanges: [],   // 10-30% content change
    minorChanges: [],      // <10% content change
    titleChanges: [],      // Title changed
    noChange: []           // Same content
  };

  let analyzed = 0;
  wpById.forEach((wpItem, id) => {
    if (fsById.has(id)) {
      const fsItem = fsById.get(id);

      // Check modification dates
      const wpModified = new Date(wpItem.modified || wpItem.modified_gmt);
      const fsModified = new Date(fsItem.metadata?.dates?.modified || 0);

      if (wpModified <= fsModified) {
        // Not modified, skip
        return;
      }

      analyzed++;

      // Extract content
      const wpTitle = wpItem.title?.rendered || wpItem.title || '';
      const fsTitle = fsItem.title || '';

      const wpContent = stripHtml(wpItem.content?.rendered || '');
      const fsContent = stripHtml(fsItem.contentHtml || fsItem.content || '');

      const wpExcerpt = stripHtml(wpItem.excerpt?.rendered || '');
      const fsExcerpt = stripHtml(fsItem.excerpt || fsItem.description || '');

      // Calculate changes
      const titleSimilarity = calculateSimilarity(wpTitle.toLowerCase(), fsTitle.toLowerCase());
      const contentSimilarity = calculateSimilarity(wpContent, fsContent);
      const lengthChange = calculateLengthChange(fsContent.length, wpContent.length);

      const change = {
        id,
        title: wpTitle,
        type: wpItem.type,
        url: wpItem.link,
        wpModified: wpModified.toISOString(),
        fsModified: fsModified.toISOString(),
        titleChanged: titleSimilarity < 0.95,
        oldTitle: titleSimilarity < 0.95 ? fsTitle : null,
        contentSimilarity: (contentSimilarity * 100).toFixed(1) + '%',
        lengthChange: lengthChange.toFixed(1) + '%',
        oldLength: fsContent.length,
        newLength: wpContent.length,
        oldPreview: getPreview(fsContent, 30),
        newPreview: getPreview(wpContent, 30)
      };

      // Categorize
      if (titleSimilarity < 0.95) {
        contentChanges.titleChanges.push(change);
      }

      const similarity = contentSimilarity;
      if (similarity < 0.7 || Math.abs(lengthChange) > 30) {
        contentChanges.majorChanges.push(change);
      } else if (similarity < 0.9 || Math.abs(lengthChange) > 10) {
        contentChanges.moderateChanges.push(change);
      } else if (similarity < 0.99) {
        contentChanges.minorChanges.push(change);
      } else {
        contentChanges.noChange.push(change);
      }
    }
  });

  // Report
  console.log(`   ✓ Analyzed ${analyzed} modified items\n`);

  console.log('═'.repeat(80));
  console.log('📊 Content Change Summary');
  console.log('═'.repeat(80));
  console.log(`\n   Major Changes (>30% diff):      ${contentChanges.majorChanges.length}`);
  console.log(`   Moderate Changes (10-30% diff): ${contentChanges.moderateChanges.length}`);
  console.log(`   Minor Changes (<10% diff):      ${contentChanges.minorChanges.length}`);
  console.log(`   Title Changes:                  ${contentChanges.titleChanges.length}`);
  console.log(`   No Content Change (date only):  ${contentChanges.noChange.length}`);

  // Detail: Title Changes
  if (contentChanges.titleChanges.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📝 TITLE CHANGES (${contentChanges.titleChanges.length}):`);
    console.log('─'.repeat(80));
    contentChanges.titleChanges.forEach(change => {
      console.log(`\n   [${change.id}] ${change.type.toUpperCase()}`);
      console.log(`   OLD: "${change.oldTitle}"`);
      console.log(`   NEW: "${change.title}"`);
      console.log(`   Modified: ${change.wpModified}`);
    });
  }

  // Detail: Major Changes
  if (contentChanges.majorChanges.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log(`🔴 MAJOR CONTENT CHANGES (${contentChanges.majorChanges.length}):`);
    console.log('─'.repeat(80));
    const displayCount = Math.min(10, contentChanges.majorChanges.length);
    contentChanges.majorChanges.slice(0, displayCount).forEach(change => {
      console.log(`\n   [${change.id}] ${change.title}`);
      console.log(`   Type: ${change.type}`);
      console.log(`   URL: ${change.url}`);
      console.log(`   Similarity: ${change.contentSimilarity}`);
      console.log(`   Length Change: ${change.lengthChange} (${change.oldLength} → ${change.newLength} chars)`);
      console.log(`   Modified: ${change.wpModified}`);
      console.log(`\n   OLD PREVIEW:`);
      console.log(`   ${change.oldPreview}`);
      console.log(`\n   NEW PREVIEW:`);
      console.log(`   ${change.newPreview}`);
    });
    if (contentChanges.majorChanges.length > 10) {
      console.log(`\n   ... and ${contentChanges.majorChanges.length - 10} more major changes`);
    }
  }

  // Detail: Moderate Changes
  if (contentChanges.moderateChanges.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log(`🟡 MODERATE CONTENT CHANGES (${contentChanges.moderateChanges.length}):`);
    console.log('─'.repeat(80));
    const displayCount = Math.min(5, contentChanges.moderateChanges.length);
    contentChanges.moderateChanges.slice(0, displayCount).forEach(change => {
      console.log(`\n   [${change.id}] ${change.title}`);
      console.log(`   Similarity: ${change.contentSimilarity} | Length Change: ${change.lengthChange}`);
      console.log(`   Modified: ${change.wpModified}`);
    });
    if (contentChanges.moderateChanges.length > 5) {
      console.log(`   ... and ${contentChanges.moderateChanges.length - 5} more moderate changes`);
    }
  }

  // Save detailed report
  const report = {
    analyzedAt: new Date().toISOString(),
    summary: {
      totalAnalyzed: analyzed,
      majorChanges: contentChanges.majorChanges.length,
      moderateChanges: contentChanges.moderateChanges.length,
      minorChanges: contentChanges.minorChanges.length,
      titleChanges: contentChanges.titleChanges.length,
      noContentChange: contentChanges.noChange.length
    },
    titleChanges: contentChanges.titleChanges,
    majorChanges: contentChanges.majorChanges,
    moderateChanges: contentChanges.moderateChanges,
    minorChanges: contentChanges.minorChanges.map(c => ({
      id: c.id,
      title: c.title,
      similarity: c.contentSimilarity,
      lengthChange: c.lengthChange
    }))
  };

  const reportFile = path.join(__dirname, 'content-analysis-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved: ${path.basename(reportFile)}`);

  // Recommendations
  console.log('\n' + '═'.repeat(80));
  console.log('💡 Key Findings:');
  console.log('═'.repeat(80));

  if (contentChanges.majorChanges.length > 0) {
    console.log(`   🔴 ${contentChanges.majorChanges.length} items have MAJOR content changes`);
    console.log('      These require careful review before importing');
  }

  if (contentChanges.moderateChanges.length > 0) {
    console.log(`   🟡 ${contentChanges.moderateChanges.length} items have moderate updates`);
    console.log('      Likely important content improvements');
  }

  if (contentChanges.minorChanges.length > 0) {
    console.log(`   🟢 ${contentChanges.minorChanges.length} items have minor edits`);
    console.log('      Typo fixes, formatting changes, etc.');
  }

  if (contentChanges.titleChanges.length > 0) {
    console.log(`   📝 ${contentChanges.titleChanges.length} items have title changes`);
    console.log('      May affect search and navigation');
  }

  if (contentChanges.noChange.length > 0) {
    console.log(`   ⏱️  ${contentChanges.noChange.length} items have date changes only`);
    console.log('      Content unchanged, metadata updated');
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

// Run
main();
