#!/usr/bin/env node
/**
 * Compare quality metrics before and after optimizations
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
try {
  const serviceAccount = require(path.join(__dirname, '../service-account-key.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Error: Could not load service-account-key.json');
  console.error('Place your Firebase service account key in the project root');
  process.exit(1);
}

const db = admin.firestore();

async function compareMetrics() {
  console.log('\n📊 Quality Metrics Comparison\n');
  console.log('='.repeat(80));

  try {
    // Get all metrics ordered by timestamp
    const snapshot = await db.collection('prompt_metrics')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    if (snapshot.empty) {
      console.log('No metrics found');
      return;
    }

    const metrics = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      metrics.push({
        timestamp: data.timestamp?.toDate(),
        wordCount: data.response?.wordCount || 0,
        citationCount: data.response?.citationCount || 0,
        responseLength: data.response?.length || 0,
        firstChunkLatency: data.timing?.firstChunkLatency || 0,
        responseTime: data.timing?.responseTime || 0,
        resourcesSelected: data.resourceSelection?.relevantResourcesSelected || 0,
        query: data.query?.substring(0, 50) || 'N/A'
      });
    });

    // Group by recent (last 5) vs older (previous 5)
    const recent = metrics.slice(0, 5);
    const older = metrics.slice(10, 15);

    console.log('\n📅 RECENT QUERIES (Last 5):');
    console.log('-'.repeat(80));
    recent.forEach((m, i) => {
      console.log(`\nQuery ${i + 1}: "${m.query}..."`);
      console.log(`  Time: ${m.timestamp?.toLocaleString()}`);
      console.log(`  Word Count: ${m.wordCount}`);
      console.log(`  Citations: ${m.citationCount}`);
      console.log(`  Response Length: ${m.responseLength} chars`);
      console.log(`  First Chunk: ${m.firstChunkLatency}ms`);
      console.log(`  Total Time: ${m.responseTime}ms`);
      console.log(`  Resources Used: ${m.resourcesSelected}`);
    });

    console.log('\n\n📅 OLDER QUERIES (Previous 5):');
    console.log('-'.repeat(80));
    older.forEach((m, i) => {
      console.log(`\nQuery ${i + 1}: "${m.query}..."`);
      console.log(`  Time: ${m.timestamp?.toLocaleString()}`);
      console.log(`  Word Count: ${m.wordCount}`);
      console.log(`  Citations: ${m.citationCount}`);
      console.log(`  Response Length: ${m.responseLength} chars`);
      console.log(`  First Chunk: ${m.firstChunkLatency}ms`);
      console.log(`  Total Time: ${m.responseTime}ms`);
      console.log(`  Resources Used: ${m.resourcesSelected}`);
    });

    // Calculate averages
    const avgRecent = {
      wordCount: recent.reduce((sum, m) => sum + m.wordCount, 0) / recent.length,
      citations: recent.reduce((sum, m) => sum + m.citationCount, 0) / recent.length,
      length: recent.reduce((sum, m) => sum + m.responseLength, 0) / recent.length,
      speed: recent.reduce((sum, m) => sum + m.firstChunkLatency, 0) / recent.length,
      resources: recent.reduce((sum, m) => sum + m.resourcesSelected, 0) / recent.length
    };

    const avgOlder = {
      wordCount: older.reduce((sum, m) => sum + m.wordCount, 0) / older.length,
      citations: older.reduce((sum, m) => sum + m.citationCount, 0) / older.length,
      length: older.reduce((sum, m) => sum + m.responseLength, 0) / older.length,
      speed: older.reduce((sum, m) => sum + m.firstChunkLatency, 0) / older.length,
      resources: older.reduce((sum, m) => sum + m.resourcesSelected, 0) / older.length
    };

    console.log('\n\n📈 COMPARISON:');
    console.log('='.repeat(80));
    console.log('\nQUALITY METRICS:');
    console.log(`  Avg Word Count:    Recent: ${Math.round(avgRecent.wordCount)} | Older: ${Math.round(avgOlder.wordCount)} | Change: ${((avgRecent.wordCount - avgOlder.wordCount) / avgOlder.wordCount * 100).toFixed(1)}%`);
    console.log(`  Avg Citations:     Recent: ${avgRecent.citations.toFixed(1)} | Older: ${avgOlder.citations.toFixed(1)} | Change: ${((avgRecent.citations - avgOlder.citations) / avgOlder.citations * 100).toFixed(1)}%`);
    console.log(`  Avg Length:        Recent: ${Math.round(avgRecent.length)} | Older: ${Math.round(avgOlder.length)} | Change: ${((avgRecent.length - avgOlder.length) / avgOlder.length * 100).toFixed(1)}%`);

    console.log('\nSPEED METRICS:');
    console.log(`  Avg First Chunk:   Recent: ${Math.round(avgRecent.speed)}ms | Older: ${Math.round(avgOlder.speed)}ms | Change: ${((avgRecent.speed - avgOlder.speed) / avgOlder.speed * 100).toFixed(1)}%`);

    console.log('\nCONTEXT METRICS:');
    console.log(`  Avg Resources:     Recent: ${avgRecent.resources.toFixed(1)} | Older: ${avgOlder.resources.toFixed(1)} | Change: ${((avgRecent.resources - avgOlder.resources) / avgOlder.resources * 100).toFixed(1)}%`);

    console.log('\n✅ Analysis complete!\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

compareMetrics();
