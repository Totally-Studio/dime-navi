#!/usr/bin/env node

/**
 * Fetch WordPress Content
 *
 * Fetches content from WordPress REST API and saves to JSON files
 *
 * Usage: node scripts/fetchWordPressContent.cjs
 */

const fs = require('fs');
const path = require('path');

// Configuration
const WP_BASE_URL = 'https://navigator.dimesociety.org';
const WP_API_URL = `${WP_BASE_URL}/wp-json`;
const OUTPUT_DIR = path.join(__dirname, 'wordpress-data');
const PER_PAGE = 100;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetch all items from an endpoint with pagination
 */
async function fetchEndpoint(endpoint, contentType) {
  console.log(`\n📥 Fetching ${contentType}...`);

  let allItems = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${WP_API_URL}${endpoint}?per_page=${PER_PAGE}&page=${page}&_embed`;
    console.log(`   Page ${page}: ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 400 && page > 1) {
          // Reached end of pages
          console.log(`   ✓ Completed (${allItems.length} items)`);
          break;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const items = await response.json();
      allItems = [...allItems, ...items];

      console.log(`   ✓ Page ${page}: ${items.length} items (total: ${allItems.length})`);

      // Check if there are more pages
      const totalPages = response.headers.get('X-WP-TotalPages');
      if (totalPages && page >= parseInt(totalPages)) {
        hasMore = false;
      } else if (items.length < PER_PAGE) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(`   ✗ Error on page ${page}:`, error.message);
      throw error;
    }
  }

  return allItems;
}

/**
 * Save data to JSON file
 */
function saveToFile(data, filename) {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fullFilename = filename.replace('.json', `_${timestamp}.json`);
  const filepath = path.join(OUTPUT_DIR, fullFilename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved: ${fullFilename} (${(fs.statSync(filepath).size / 1024).toFixed(2)} KB)`);

  return filepath;
}

/**
 * Main execution
 */
async function main() {
  console.log('═'.repeat(80));
  console.log('📦 WordPress Content Fetcher');
  console.log('═'.repeat(80));
  console.log(`\n🌐 Source: ${WP_BASE_URL}`);
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);
  console.log('═'.repeat(80));

  try {
    // Fetch resources
    const resources = await fetchEndpoint('/wp/v2/resource', 'Resources (Library)');

    // Fetch pages
    const pages = await fetchEndpoint('/wp/v2/pages', 'Pages (Roadmap)');

    // Save individual files
    console.log('\n📝 Saving files...');
    const resourcesFile = saveToFile(resources, 'resources.json');
    const pagesFile = saveToFile(pages, 'pages.json');

    // Combine and save
    const combined = {
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: WP_BASE_URL,
        counts: {
          resources: resources.length,
          pages: pages.length,
          total: resources.length + pages.length
        }
      },
      resources,
      pages
    };
    const combinedFile = saveToFile(combined, 'combined.json');

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('✅ Fetch Complete!');
    console.log('═'.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Resources:    ${resources.length}`);
    console.log(`   Pages:        ${pages.length}`);
    console.log(`   Total:        ${resources.length + pages.length}`);
    console.log('\n📁 Files saved:');
    console.log(`   ${path.basename(resourcesFile)}`);
    console.log(`   ${path.basename(pagesFile)}`);
    console.log(`   ${path.basename(combinedFile)}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Review JSON files in scripts/wordpress-data/');
    console.log('   2. Verify data structure and content');
    console.log('   3. Ready for Firestore import once approved');
    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
