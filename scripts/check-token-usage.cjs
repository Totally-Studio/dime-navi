#!/usr/bin/env node
/**
 * Token Usage Monitoring Script
 *
 * Analyzes prompt_metrics collection to show:
 * - Total tokens used
 * - Average tokens per request
 * - Highest token requests (potential issues)
 * - Token usage trends
 *
 * Usage:
 *   node scripts/check-token-usage.js [days]
 *
 * Examples:
 *   node scripts/check-token-usage.js        # Last 7 days
 *   node scripts/check-token-usage.js 30     # Last 30 days
 *   node scripts/check-token-usage.js 1      # Last 24 hours
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

async function analyzeTokenUsage(days = 7) {
  console.log(`\n📊 Token Usage Report - Last ${days} days\n`);
  console.log('='.repeat(80));

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  console.log(`Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`);

  try {
    // Query metrics
    const snapshot = await db.collection('prompt_metrics')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    if (snapshot.empty) {
      console.log('⚠️  No metrics found for this period.');
      console.log('Make sure you have submitted prompts and metrics are being logged.\n');
      return;
    }

    const metrics = snapshot.docs.map(doc => doc.data());

    // Calculate statistics
    const totalRequests = metrics.length;
    const totalInputTokens = metrics.reduce((sum, m) => sum + (m.tokens?.input || 0), 0);
    const totalOutputTokens = metrics.reduce((sum, m) => sum + (m.tokens?.output || 0), 0);
    const totalTokens = metrics.reduce((sum, m) => sum + (m.tokens?.total || 0), 0);

    const avgInputTokens = Math.round(totalInputTokens / totalRequests);
    const avgOutputTokens = Math.round(totalOutputTokens / totalRequests);
    const avgTotalTokens = Math.round(totalTokens / totalRequests);

    const avgResponseTime = Math.round(
      metrics.reduce((sum, m) => sum + (m.timing?.responseTime || 0), 0) / totalRequests
    );

    // Success rate
    const successCount = metrics.filter(m => m.response?.success).length;
    const successRate = ((successCount / totalRequests) * 100).toFixed(1);

    // Print summary
    console.log('📈 OVERALL STATISTICS');
    console.log('-'.repeat(80));
    console.log(`Total Requests:        ${totalRequests.toLocaleString()}`);
    console.log(`Success Rate:          ${successRate}%`);
    console.log(`Avg Response Time:     ${avgResponseTime.toLocaleString()}ms\n`);

    console.log('🎯 TOKEN USAGE');
    console.log('-'.repeat(80));
    console.log(`Total Input Tokens:    ${totalInputTokens.toLocaleString()}`);
    console.log(`Total Output Tokens:   ${totalOutputTokens.toLocaleString()}`);
    console.log(`Total Tokens:          ${totalTokens.toLocaleString()}\n`);

    console.log(`Avg Input Tokens:      ${avgInputTokens.toLocaleString()}`);
    console.log(`Avg Output Tokens:     ${avgOutputTokens.toLocaleString()}`);
    console.log(`Avg Total Tokens:      ${avgTotalTokens.toLocaleString()}\n`);

    // Cost estimation (Gemini 2.5 Flash pricing)
    // Input: $0.075 per 1M tokens
    // Output: $0.30 per 1M tokens
    const inputCost = (totalInputTokens / 1_000_000) * 0.075;
    const outputCost = (totalOutputTokens / 1_000_000) * 0.30;
    const totalCost = inputCost + outputCost;

    console.log('💰 ESTIMATED COST (Gemini 2.5 Flash)');
    console.log('-'.repeat(80));
    console.log(`Input Cost:            $${inputCost.toFixed(4)}`);
    console.log(`Output Cost:           $${outputCost.toFixed(4)}`);
    console.log(`Total Cost:            $${totalCost.toFixed(4)}\n`);

    // Find highest token requests
    const sortedByTokens = [...metrics].sort((a, b) =>
      (b.tokens?.total || 0) - (a.tokens?.total || 0)
    );

    console.log('🚨 TOP 5 HIGHEST TOKEN REQUESTS');
    console.log('-'.repeat(80));
    sortedByTokens.slice(0, 5).forEach((m, i) => {
      const query = m.query?.substring(0, 50) || 'N/A';
      const total = (m.tokens?.total || 0).toLocaleString();
      const input = (m.tokens?.input || 0).toLocaleString();
      const output = (m.tokens?.output || 0).toLocaleString();

      console.log(`${i + 1}. [${total} tokens] ${query}...`);
      console.log(`   Input: ${input} | Output: ${output}`);
      console.log(`   Resources: ${m.resourceSelection?.relevantResourcesSelected || 0}`);
      console.log();
    });

    // Warning for high token usage
    const highTokenRequests = metrics.filter(m => (m.tokens?.input || 0) > 50000);
    if (highTokenRequests.length > 0) {
      console.log('⚠️  WARNING: HIGH TOKEN USAGE DETECTED');
      console.log('-'.repeat(80));
      console.log(`${highTokenRequests.length} requests used >50K input tokens`);
      console.log('Consider optimizing context selection or limiting resource count.\n');
    }

    // Token usage by template
    const byTemplate = {};
    metrics.forEach(m => {
      const template = m.template || 'unknown';
      if (!byTemplate[template]) {
        byTemplate[template] = { count: 0, totalTokens: 0 };
      }
      byTemplate[template].count++;
      byTemplate[template].totalTokens += (m.tokens?.total || 0);
    });

    console.log('📝 TOKEN USAGE BY TEMPLATE');
    console.log('-'.repeat(80));
    Object.entries(byTemplate).forEach(([template, data]) => {
      const avg = Math.round(data.totalTokens / data.count);
      console.log(`${template}: ${data.count} requests, avg ${avg.toLocaleString()} tokens`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error analyzing token usage:', error);
    process.exit(1);
  }
}

// Run the analysis
const days = parseInt(process.argv[2]) || 7;
analyzeTokenUsage(days).then(() => {
  process.exit(0);
});
