#!/usr/bin/env node
/**
 * Fetch and compare metrics using Firebase client SDK
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchMetrics() {
  console.log('\n📊 Fetching metrics from Firestore...\n');
  console.log('='.repeat(80));

  try {
    // Query last 20 metrics
    const q = query(
      collection(db, 'prompt_metrics'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);

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
        query: data.query?.substring(0, 60) || 'N/A'
      });
    });

    // Group by recent (last 5) vs older (11-15)
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

    console.log('\n\n📅 OLDER QUERIES (11-15):');
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

    console.log('\n\n💡 ANALYSIS:');
    console.log('-'.repeat(80));

    const qualityChange = ((avgRecent.wordCount - avgOlder.wordCount) / avgOlder.wordCount * 100);
    const speedChange = ((avgRecent.speed - avgOlder.speed) / avgOlder.speed * 100);

    if (qualityChange > -10 && qualityChange < 10) {
      console.log('✅ Quality PRESERVED - Response length similar (within 10%)');
    } else if (qualityChange < -10) {
      console.log(`⚠️  Quality REDUCED - Responses ${Math.abs(qualityChange).toFixed(1)}% shorter`);
    } else {
      console.log(`✅ Quality IMPROVED - Responses ${qualityChange.toFixed(1)}% longer`);
    }

    if (speedChange < -10) {
      console.log(`✅ Speed IMPROVED - ${Math.abs(speedChange).toFixed(1)}% faster`);
    } else if (speedChange > 10) {
      console.log(`⚠️  Speed DEGRADED - ${speedChange.toFixed(1)}% slower`);
    } else {
      console.log('➡️  Speed similar');
    }

    console.log('\n✅ Analysis complete!\n');

  } catch (error) {
    console.error('Error:', error);
  }
}

fetchMetrics();
