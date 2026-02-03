#!/usr/bin/env node

/**
 * Fetch Prompt Metrics from Firestore
 *
 * Uses Firebase Admin SDK to bypass security rules and access prompt_metrics collection
 *
 * Prerequisites:
 * 1. Download service account JSON from Firebase Console:
 *    - Go to Project Settings > Service Accounts
 *    - Click "Generate New Private Key"
 *    - Save as: service-accounts/dimenotesv2-admin.json (or navi-production-485916-admin.json)
 *
 * 2. Set environment variable (optional):
 *    FIREBASE_SERVICE_ACCOUNT_PATH=./service-accounts/dimenotesv2-admin.json
 *
 * Usage: node scripts/fetchPromptMetrics.cjs [dev|prod] [--limit 1000]
 */

const fs = require('fs');
const path = require('path');

// Parse CLI arguments
const args = process.argv.slice(2);
let project = 'dev'; // default
let limit = null; // no limit by default
let serviceAccountPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit') {
    limit = parseInt(args[++i]);
  } else if (args[i] === '--service-account') {
    serviceAccountPath = args[++i];
  } else if (['dev', 'prod'].includes(args[i])) {
    project = args[i];
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('📊 Prompt Metrics Fetcher (Admin SDK)');
  console.log('═'.repeat(80));

  // Determine service account path
  if (!serviceAccountPath) {
    const projectFile = project === 'dev' ? 'dimenotesv2-admin.json' : 'navi-production-485916-admin.json';
    serviceAccountPath = path.join(__dirname, '..', 'service-accounts', projectFile);
  }

  console.log(`\n🔧 Configuration:`);
  console.log(`   Project: ${project === 'dev' ? 'dimenotesv2 (DEV)' : 'navi-production-485916 (PROD)'}`);
  console.log(`   Service Account: ${serviceAccountPath}`);
  console.log(`   Limit: ${limit || 'None (fetch all)'}`);

  // Check if service account exists
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('\n❌ Error: Service account file not found!');
    console.error(`   Expected: ${serviceAccountPath}`);
    console.error('\n📝 How to get service account:');
    console.error('   1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('   2. Click "Generate New Private Key"');
    console.error(`   3. Save as: ${serviceAccountPath}`);
    console.error('\n   Or specify custom path with: --service-account /path/to/file.json\n');
    process.exit(1);
  }

  try {
    // Import Firebase Admin SDK
    const admin = require('firebase-admin');

    // Load service account
    console.log('\n🔐 Loading service account...');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log(`   ✓ Project ID: ${serviceAccount.project_id}`);

    // Initialize Firebase Admin
    console.log('\n🔥 Initializing Firebase Admin SDK...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    const db = admin.firestore();
    console.log('   ✓ Connected to Firestore');

    // Fetch prompt_metrics
    console.log('\n📥 Fetching prompt_metrics collection...');
    console.log('   (This may take a moment for large collections)');

    let query = db.collection('prompt_metrics').orderBy('timestamp', 'desc');
    if (limit) {
      query = query.limit(limit);
      console.log(`   Limiting to ${limit} most recent metrics`);
    }

    const snapshot = await query.get();
    console.log(`   ✓ Fetched ${snapshot.size} documents`);

    // Convert to array
    const metrics = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      metrics.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
        timing: data.timing ? {
          ...data.timing,
          streamingStartTime: data.timing.streamingStartTime?.toDate?.()?.toISOString() || data.timing.streamingStartTime
        } : undefined
      });
    });

    // Analyze
    console.log('\n📊 Analyzing metrics...');
    const analysis = analyzeMetrics(metrics);

    console.log(`\n   Total Metrics:       ${analysis.total}`);
    console.log(`   Date Range:          ${analysis.dateRange.earliest} to ${analysis.dateRange.latest}`);
    console.log(`   Unique Users:        ${analysis.uniqueUsers}`);
    console.log(`   Average Tokens:      ${analysis.averageTokens.toFixed(0)}`);
    console.log(`   Total Queries:       ${analysis.total}`);
    console.log(`   Success Rate:        ${analysis.successRate.toFixed(1)}%`);
    console.log(`\n   Templates Used:`);
    Object.entries(analysis.templates).forEach(([template, count]) => {
      console.log(`      ${template}: ${count}`);
    });
    console.log(`\n   Models Used:`);
    Object.entries(analysis.models).forEach(([model, count]) => {
      console.log(`      ${model}: ${count}`);
    });

    // Save to files
    const OUTPUT_DIR = path.join(__dirname, 'metrics-data');
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const projectSuffix = project === 'dev' ? 'dev' : 'prod';

    // Save all metrics
    const metricsFile = path.join(OUTPUT_DIR, `prompt-metrics_${projectSuffix}_${timestamp}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    console.log(`\n💾 Saved metrics: ${path.basename(metricsFile)} (${(fs.statSync(metricsFile).size / 1024).toFixed(2)} KB)`);

    // Save summary
    const summaryFile = path.join(OUTPUT_DIR, `metrics-summary_${projectSuffix}_${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(analysis, null, 2));
    console.log(`💾 Saved summary: ${path.basename(summaryFile)}`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Fetch Complete!');
    console.log('═'.repeat(80));
    console.log(`\n📁 Output Directory: ${OUTPUT_DIR}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Review metrics in scripts/metrics-data/');
    console.log('   2. Analyze token usage, response times, error rates');
    console.log('   3. Use data for optimization and monitoring');
    console.log('\n' + '═'.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Analyze metrics data
 */
function analyzeMetrics(metrics) {
  const analysis = {
    total: metrics.length,
    dateRange: {
      earliest: null,
      latest: null
    },
    uniqueUsers: new Set(),
    totalTokens: 0,
    averageTokens: 0,
    successCount: 0,
    errorCount: 0,
    successRate: 0,
    templates: {},
    models: {},
    averageResponseTime: 0,
    totalResponseTime: 0
  };

  if (metrics.length === 0) return analysis;

  let totalResponseTime = 0;
  let responseTimeCount = 0;

  metrics.forEach(metric => {
    // Date range
    const timestamp = metric.timestamp;
    if (!analysis.dateRange.earliest || timestamp < analysis.dateRange.earliest) {
      analysis.dateRange.earliest = timestamp;
    }
    if (!analysis.dateRange.latest || timestamp > analysis.dateRange.latest) {
      analysis.dateRange.latest = timestamp;
    }

    // Unique users
    if (metric.userId) {
      analysis.uniqueUsers.add(metric.userId);
    }

    // Tokens
    if (metric.tokens?.total) {
      analysis.totalTokens += metric.tokens.total;
    }

    // Success/Error
    if (metric.response?.success !== false) {
      analysis.successCount++;
    } else {
      analysis.errorCount++;
    }

    // Templates
    const template = metric.template || 'unknown';
    analysis.templates[template] = (analysis.templates[template] || 0) + 1;

    // Models
    const model = metric.model || 'unknown';
    analysis.models[model] = (analysis.models[model] || 0) + 1;

    // Response time
    if (metric.timing?.responseTime) {
      totalResponseTime += metric.timing.responseTime;
      responseTimeCount++;
    }
  });

  analysis.uniqueUsers = analysis.uniqueUsers.size;
  analysis.averageTokens = analysis.totalTokens / metrics.length;
  analysis.successRate = (analysis.successCount / metrics.length) * 100;
  analysis.averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

  return analysis;
}

// Run
main();
