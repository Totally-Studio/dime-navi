#!/usr/bin/env node
/**
 * Check Record Order in AI Studio Export
 *
 * Examines the first and last records to determine if there's
 * any chronological ordering by:
 * - Record position
 * - Token count trends
 * - Query similarity patterns
 */

const fs = require('fs');
const path = require('path');

const jsonlPath = path.join(__dirname, '../../docs/tokens 2_datasets_iDKBaZfkGv3XxN8P872OuQ8_2026-02-02T23_27_25.339Z.jsonl');

function parseRecord(line, index) {
  try {
    const record = JSON.parse(line);

    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let query = 'N/A';

    // Extract query from request
    if (Array.isArray(record.request) && record.request[0]?.contents?.[0]?.parts?.[0]?.text) {
      query = record.request[0].contents[0].parts[0].text.substring(0, 80);
    }

    // Extract tokens from response
    if (Array.isArray(record.response) && record.response[0]?.usageMetadata) {
      const usage = record.response[0].usageMetadata;
      inputTokens = usage.promptTokenCount || 0;
      outputTokens = usage.candidatesTokenCount || 0;
      const thinkingTokens = usage.thoughtsTokenCount || 0;
      totalTokens = usage.totalTokenCount || (inputTokens + outputTokens + thinkingTokens);
    }

    return {
      index,
      query,
      inputTokens,
      outputTokens,
      totalTokens
    };
  } catch (error) {
    return null;
  }
}

function analyzeRecordOrder() {
  console.log('\n🔍 Analyzing Record Order in AI Studio Export\n');
  console.log('='.repeat(80));

  if (!fs.existsSync(jsonlPath)) {
    console.error('❌ Error: token-usage-ai-studio-export.jsonl not found');
    process.exit(1);
  }

  const content = fs.readFileSync(jsonlPath, 'utf-8');
  const lines = content.trim().split('\n');

  console.log(`Total Records: ${lines.length}\n`);

  // Parse first 15 records
  console.log('📝 FIRST 15 RECORDS');
  console.log('-'.repeat(80));
  const firstRecords = [];
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const record = parseRecord(lines[i], i + 1);
    if (record) {
      firstRecords.push(record);
      console.log(`\n#${record.index}: ${record.query}...`);
      console.log(`   Tokens: Input=${record.inputTokens.toLocaleString()}, Output=${record.outputTokens.toLocaleString()}, Total=${record.totalTokens.toLocaleString()}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Parse last 15 records
  console.log('📝 LAST 15 RECORDS');
  console.log('-'.repeat(80));
  const lastRecords = [];
  const startIdx = Math.max(0, lines.length - 15);
  for (let i = startIdx; i < lines.length; i++) {
    const record = parseRecord(lines[i], i + 1);
    if (record) {
      lastRecords.push(record);
      console.log(`\n#${record.index}: ${record.query}...`);
      console.log(`   Tokens: Input=${record.inputTokens.toLocaleString()}, Output=${record.outputTokens.toLocaleString()}, Total=${record.totalTokens.toLocaleString()}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Analyze patterns
  console.log('📊 PATTERN ANALYSIS');
  console.log('-'.repeat(80));

  // Average token counts
  const firstAvgInput = firstRecords.reduce((sum, r) => sum + r.inputTokens, 0) / firstRecords.length;
  const lastAvgInput = lastRecords.reduce((sum, r) => sum + r.inputTokens, 0) / lastRecords.length;

  const firstAvgTotal = firstRecords.reduce((sum, r) => sum + r.totalTokens, 0) / firstRecords.length;
  const lastAvgTotal = lastRecords.reduce((sum, r) => sum + r.totalTokens, 0) / lastRecords.length;

  console.log(`First 15 records - Avg Input: ${Math.round(firstAvgInput).toLocaleString()}, Avg Total: ${Math.round(firstAvgTotal).toLocaleString()}`);
  console.log(`Last 15 records  - Avg Input: ${Math.round(lastAvgInput).toLocaleString()}, Avg Total: ${Math.round(lastAvgTotal).toLocaleString()}`);

  const inputDiff = lastAvgInput - firstAvgInput;
  const totalDiff = lastAvgTotal - firstAvgTotal;

  console.log(`\nDifference: Input tokens ${inputDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(inputDiff)).toLocaleString()}`);
  console.log(`Difference: Total tokens ${totalDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(totalDiff)).toLocaleString()}`);

  // Check for trends
  if (Math.abs(inputDiff) > 5000 || Math.abs(totalDiff) > 5000) {
    console.log('\n✅ SIGNIFICANT TREND DETECTED');
    console.log('Records may be in chronological order showing token usage evolution.');
  } else {
    console.log('\n⚠️  NO CLEAR TREND DETECTED');
    console.log('Token usage is similar between first and last records.');
  }

  // Check query similarity
  console.log('\n📝 QUERY PATTERNS');
  console.log('-'.repeat(80));

  const firstQueries = firstRecords.map(r => r.query.toLowerCase());
  const lastQueries = lastRecords.map(r => r.query.toLowerCase());

  // Simple keyword extraction
  const extractKeywords = (queries) => {
    const words = queries.join(' ').split(/\s+/);
    const wordCount = {};
    words.forEach(word => {
      if (word.length > 4) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };

  const firstKeywords = extractKeywords(firstQueries);
  const lastKeywords = extractKeywords(lastQueries);

  console.log(`First records keywords: ${firstKeywords.join(', ')}`);
  console.log(`Last records keywords:  ${lastKeywords.join(', ')}`);

  const commonKeywords = firstKeywords.filter(k => lastKeywords.includes(k));
  if (commonKeywords.length < 2) {
    console.log('\n✅ DIFFERENT QUERY TOPICS');
    console.log('First and last records have different query themes, suggesting chronological ordering.');
  } else {
    console.log('\n⚠️  SIMILAR QUERY TOPICS');
    console.log('First and last records have similar themes.');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

analyzeRecordOrder();
