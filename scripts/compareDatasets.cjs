#!/usr/bin/env node

/**
 * Compare WordPress and Firestore Datasets
 *
 * Identifies new, updated, and missing items between WordPress and Firestore
 *
 * Usage: node scripts/compareDatasets.cjs
 */

const fs = require('fs');
const path = require('path');

// File paths
const WP_DATA_DIR = path.join(__dirname, 'wordpress-data');
const FS_DATA_DIR = path.join(__dirname, 'firestore-data');

function findLatestFile(dir, pattern) {
  const files = fs.readdirSync(dir).filter(f => f.includes(pattern));
  if (files.length === 0) return null;
  files.sort().reverse(); // Latest first
  return path.join(dir, files[0]);
}

function main() {
  console.log('═'.repeat(80));
  console.log('📊 Dataset Comparison Tool');
  console.log('═'.repeat(80));

  // Load WordPress data
  console.log('\n📥 Loading WordPress data...');
  const wpFile = findLatestFile(WP_DATA_DIR, 'combined');
  if (!wpFile) {
    console.error('   ✗ No WordPress data found. Run npm run fetch:wp first.');
    process.exit(1);
  }
  const wpData = JSON.parse(fs.readFileSync(wpFile, 'utf8'));
  const wpResources = wpData.resources || [];
  const wpPages = wpData.pages || [];
  console.log(`   ✓ Loaded ${wpResources.length} resources + ${wpPages.length} pages (${wpResources.length + wpPages.length} total)`);
  console.log(`   ✓ File: ${path.basename(wpFile)}`);

  // Load Firestore data
  console.log('\n📥 Loading Firestore data...');
  const fsFile = findLatestFile(FS_DATA_DIR, 'all-documents');
  if (!fsFile) {
    console.error('   ✗ No Firestore data found. Run npm run fetch:firestore first.');
    process.exit(1);
  }
  const fsData = JSON.parse(fs.readFileSync(fsFile, 'utf8'));
  console.log(`   ✓ Loaded ${fsData.length} documents`);
  console.log(`   ✓ File: ${path.basename(fsFile)}`);

  // Create lookup maps
  const wpById = new Map();
  [...wpResources, ...wpPages].forEach(item => {
    wpById.set(item.id, {
      ...item,
      source: 'wordpress',
      type: wpResources.includes(item) ? 'resource' : 'page'
    });
  });

  const fsById = new Map();
  fsData.forEach(item => {
    fsById.set(item.wpPostId, {
      ...item,
      source: 'firestore'
    });
  });

  // Analysis
  console.log('\n' + '═'.repeat(80));
  console.log('📊 Comparison Results');
  console.log('═'.repeat(80));

  // Find items only in WordPress (new items)
  const newInWordPress = [];
  wpById.forEach((wpItem, id) => {
    if (!fsById.has(id)) {
      newInWordPress.push(wpItem);
    }
  });

  // Find items only in Firestore (deleted from WordPress)
  const deletedFromWordPress = [];
  fsById.forEach((fsItem, id) => {
    if (!wpById.has(id)) {
      deletedFromWordPress.push(fsItem);
    }
  });

  // Find items with different modification dates (potentially updated)
  const potentiallyUpdated = [];
  wpById.forEach((wpItem, id) => {
    if (fsById.has(id)) {
      const fsItem = fsById.get(id);
      const wpModified = new Date(wpItem.modified || wpItem.modified_gmt);
      const fsModified = new Date(fsItem.metadata?.dates?.modified || 0);

      if (wpModified > fsModified) {
        potentiallyUpdated.push({
          id,
          title: wpItem.title?.rendered || wpItem.title || 'Untitled',
          wpModified: wpModified.toISOString(),
          fsModified: fsModified.toISOString(),
          type: wpItem.type
        });
      }
    }
  });

  // Summary
  console.log('\n📈 Summary:');
  console.log(`   WordPress Total:     ${wpById.size}`);
  console.log(`   Firestore Total:     ${fsById.size}`);
  console.log(`   New in WordPress:    ${newInWordPress.length}`);
  console.log(`   Deleted/Missing:     ${deletedFromWordPress.length}`);
  console.log(`   Potentially Updated: ${potentiallyUpdated.length}`);

  // New items detail
  if (newInWordPress.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log(`🆕 NEW Items in WordPress (${newInWordPress.length}):`);
    console.log('─'.repeat(80));
    newInWordPress.forEach(item => {
      console.log(`   [${item.id}] ${item.title?.rendered || 'Untitled'}`);
      console.log(`        Type: ${item.type}`);
      console.log(`        Published: ${item.date}`);
      console.log(`        URL: ${item.link}`);
      console.log('');
    });
  }

  // Deleted items detail
  if (deletedFromWordPress.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log(`🗑️  DELETED from WordPress (${deletedFromWordPress.length}):`);
    console.log('─'.repeat(80));
    deletedFromWordPress.forEach(item => {
      console.log(`   [${item.wpPostId}] ${item.title || 'Untitled'}`);
      console.log(`        Type: ${item.contentType}`);
      console.log(`        Last synced: ${item.sync?.syncedAt || 'Unknown'}`);
      console.log('');
    });
  }

  // Updated items detail (show first 10)
  if (potentiallyUpdated.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📝 POTENTIALLY UPDATED (${potentiallyUpdated.length}):`);
    console.log('─'.repeat(80));
    const displayCount = Math.min(10, potentiallyUpdated.length);
    potentiallyUpdated.slice(0, displayCount).forEach(item => {
      console.log(`   [${item.id}] ${item.title}`);
      console.log(`        WordPress: ${item.wpModified}`);
      console.log(`        Firestore: ${item.fsModified}`);
      console.log('');
    });
    if (potentiallyUpdated.length > 10) {
      console.log(`   ... and ${potentiallyUpdated.length - 10} more`);
    }
  }

  // Content type breakdown
  const wpByType = { resource: 0, page: 0 };
  const fsByType = { library: 0, roadmap: 0 };
  wpById.forEach(item => wpByType[item.type]++);
  fsData.forEach(item => fsByType[item.contentType]++);

  console.log('\n' + '─'.repeat(80));
  console.log('📦 Content Type Breakdown:');
  console.log('─'.repeat(80));
  console.log('   WordPress:');
  console.log(`      Resources: ${wpByType.resource}`);
  console.log(`      Pages:     ${wpByType.page}`);
  console.log('   Firestore:');
  console.log(`      Library:   ${fsByType.library}`);
  console.log(`      Roadmap:   ${fsByType.roadmap}`);

  // Save comparison report
  const report = {
    comparedAt: new Date().toISOString(),
    wordPressFile: path.basename(wpFile),
    firestoreFile: path.basename(fsFile),
    summary: {
      wordpressTotal: wpById.size,
      firestoreTotal: fsById.size,
      newInWordPress: newInWordPress.length,
      deletedFromWordPress: deletedFromWordPress.length,
      potentiallyUpdated: potentiallyUpdated.length
    },
    newItems: newInWordPress.map(item => ({
      id: item.id,
      title: item.title?.rendered || 'Untitled',
      type: item.type,
      published: item.date,
      url: item.link
    })),
    deletedItems: deletedFromWordPress.map(item => ({
      id: item.wpPostId,
      title: item.title,
      contentType: item.contentType,
      lastSynced: item.sync?.syncedAt
    })),
    updatedItems: potentiallyUpdated
  };

  const reportFile = path.join(__dirname, 'comparison-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved: ${path.basename(reportFile)}`);

  // Recommendations
  console.log('\n' + '═'.repeat(80));
  console.log('💡 Recommendations:');
  console.log('═'.repeat(80));

  if (newInWordPress.length > 0 || potentiallyUpdated.length > 0) {
    console.log('   ✅ Sync recommended - WordPress has newer/additional content');
    console.log('   📝 Next step: Create Phase 2 import script to update Firestore');
  } else {
    console.log('   ✅ Firestore is up to date with WordPress');
    console.log('   💡 No sync needed at this time');
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

// Run
main();
