#!/usr/bin/env node
/**
 * Token History Analyzer
 *
 * Analyzes a JSONL token usage file and creates:
 * - Timeline chart of token usage
 * - Statistics and trends
 * - HTML visualization
 *
 * Usage:
 *   node scripts/analyze-token-history.js <file-path>
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function analyzeTokenHistory(filePath) {
  console.log(`\n📊 Analyzing Token History: ${path.basename(filePath)}\n`);
  console.log('='.repeat(80));

  const records = [];
  let lineNumber = 0;

  try {
    // Read file line by line (JSONL format)
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    console.log('Reading file...');

    for await (const line of rl) {
      lineNumber++;
      if (!line.trim()) continue;

      try {
        const record = JSON.parse(line);
        records.push(record);

        if (lineNumber % 100 === 0) {
          process.stdout.write(`\rProcessed ${lineNumber} lines...`);
        }
      } catch (err) {
        console.warn(`\nWarning: Failed to parse line ${lineNumber}`);
      }
    }

    console.log(`\n✅ Loaded ${records.length} records\n`);

    if (records.length === 0) {
      console.log('❌ No records found in file');
      return;
    }

    // Analyze the data
    analyzeRecords(records, filePath);

  } catch (error) {
    console.error('❌ Error reading file:', error.message);
    process.exit(1);
  }
}

function analyzeRecords(records, originalFilePath) {
  // Sort by timestamp
  records.sort((a, b) => {
    const timeA = new Date(a.timestamp || a.created_at || 0);
    const timeB = new Date(b.timestamp || b.created_at || 0);
    return timeA - timeB;
  });

  // Extract token data (handle both Genkit and our custom format)
  const dataPoints = records.map((r, index) => {
    const timestamp = new Date(r.timestamp || r.created_at || Date.now());

    // Try multiple token field formats
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    // Genkit format (usageMetadata in response[0])
    if (Array.isArray(r.response) && r.response[0]?.usageMetadata) {
      const usage = r.response[0].usageMetadata;
      inputTokens = usage.promptTokenCount || 0;
      outputTokens = usage.candidatesTokenCount || 0;
      const thinkingTokens = usage.thoughtsTokenCount || 0;
      totalTokens = usage.totalTokenCount || (inputTokens + outputTokens + thinkingTokens);
    }
    // Genkit format (tokenCount is in response array) - legacy
    else if (Array.isArray(r.response) && r.response[0]?.tokenCount) {
      totalTokens = r.response[0].tokenCount;
      inputTokens = Math.round(totalTokens * 0.8);
      outputTokens = Math.round(totalTokens * 0.2);
    }
    // Genkit format (tokenCount in response object) - legacy
    else if (r.response?.tokenCount) {
      totalTokens = r.response.tokenCount;
      inputTokens = Math.round(totalTokens * 0.8);
      outputTokens = Math.round(totalTokens * 0.2);
    }
    // Root level tokenCount (older format)
    else if (r.tokenCount) {
      totalTokens = r.tokenCount;
      inputTokens = Math.round(totalTokens * 0.8);
      outputTokens = Math.round(totalTokens * 0.2);
    }
    // Our new format
    else if (r.tokens) {
      inputTokens = r.tokens.input || 0;
      outputTokens = r.tokens.output || 0;
      totalTokens = r.tokens.total || inputTokens + outputTokens;
    }
    // Legacy format
    else {
      inputTokens = r.input_tokens || 0;
      outputTokens = r.output_tokens || 0;
      totalTokens = r.total_tokens || inputTokens + outputTokens;
    }

    // Extract query from various locations
    let query = 'N/A';
    if (r.query) {
      query = r.query;
    } else if (r.request?.contents?.[0]?.parts?.[0]?.text) {
      // Extract query from Genkit format (look for USER QUERY:)
      const text = r.request.contents[0].parts[0].text;
      const match = text.match(/USER QUERY:\s*"([^"]+)"/);
      if (match) {
        query = match[1];
      }
    }

    return {
      index: index + 1,
      timestamp,
      inputTokens,
      outputTokens,
      totalTokens,
      query: query.substring(0, 50)
    };
  });

  // Calculate statistics
  const totalInput = dataPoints.reduce((sum, d) => sum + d.inputTokens, 0);
  const totalOutput = dataPoints.reduce((sum, d) => sum + d.outputTokens, 0);
  const totalAll = dataPoints.reduce((sum, d) => sum + d.totalTokens, 0);

  const avgInput = Math.round(totalInput / dataPoints.length);
  const avgOutput = Math.round(totalOutput / dataPoints.length);
  const avgTotal = Math.round(totalAll / dataPoints.length);

  const maxInput = Math.max(...dataPoints.map(d => d.inputTokens));
  const maxOutput = Math.max(...dataPoints.map(d => d.outputTokens));
  const maxTotal = Math.max(...dataPoints.map(d => d.totalTokens));

  const minInput = Math.min(...dataPoints.map(d => d.inputTokens));
  const minOutput = Math.min(...dataPoints.map(d => d.outputTokens));
  const minTotal = Math.min(...dataPoints.map(d => d.totalTokens));

  // Time range
  const firstTime = dataPoints[0].timestamp;
  const lastTime = dataPoints[dataPoints.length - 1].timestamp;
  const durationDays = (lastTime - firstTime) / (1000 * 60 * 60 * 24);

  // Print statistics
  console.log('📈 STATISTICS');
  console.log('-'.repeat(80));
  console.log(`Total Records:         ${dataPoints.length.toLocaleString()}`);
  console.log(`Time Range:            ${firstTime.toLocaleDateString()} to ${lastTime.toLocaleDateString()}`);
  console.log(`Duration:              ${durationDays.toFixed(1)} days\n`);

  console.log('🎯 TOKEN TOTALS');
  console.log('-'.repeat(80));
  console.log(`Total Input Tokens:    ${totalInput.toLocaleString()}`);
  console.log(`Total Output Tokens:   ${totalOutput.toLocaleString()}`);
  console.log(`Total All Tokens:      ${totalAll.toLocaleString()}\n`);

  console.log('📊 AVERAGES');
  console.log('-'.repeat(80));
  console.log(`Avg Input Tokens:      ${avgInput.toLocaleString()}`);
  console.log(`Avg Output Tokens:     ${avgOutput.toLocaleString()}`);
  console.log(`Avg Total Tokens:      ${avgTotal.toLocaleString()}\n`);

  console.log('📏 RANGE (MIN - MAX)');
  console.log('-'.repeat(80));
  console.log(`Input Tokens:          ${minInput.toLocaleString()} - ${maxInput.toLocaleString()}`);
  console.log(`Output Tokens:         ${minOutput.toLocaleString()} - ${maxOutput.toLocaleString()}`);
  console.log(`Total Tokens:          ${minTotal.toLocaleString()} - ${maxTotal.toLocaleString()}\n`);

  // Find highest token records
  const sortedByTotal = [...dataPoints].sort((a, b) => b.totalTokens - a.totalTokens);

  console.log('🚨 TOP 10 HIGHEST TOKEN REQUESTS');
  console.log('-'.repeat(80));
  sortedByTotal.slice(0, 10).forEach((d, i) => {
    console.log(`${i + 1}. [${d.totalTokens.toLocaleString()} tokens] ${d.query}...`);
    console.log(`   Input: ${d.inputTokens.toLocaleString()} | Output: ${d.outputTokens.toLocaleString()}`);
    console.log(`   Date: ${d.timestamp.toLocaleString()}\n`);
  });

  // High token warnings
  const highTokenRecords = dataPoints.filter(d => d.inputTokens > 50000);
  if (highTokenRecords.length > 0) {
    console.log('⚠️  HIGH TOKEN USAGE WARNINGS');
    console.log('-'.repeat(80));
    console.log(`${highTokenRecords.length} records with >50K input tokens`);
    console.log(`Percentage: ${((highTokenRecords.length / dataPoints.length) * 100).toFixed(1)}%\n`);
  }

  // Generate HTML chart
  console.log('📈 Generating HTML chart...');
  const chartPath = generateHTMLChart(dataPoints, originalFilePath);
  console.log(`✅ Chart saved to: ${chartPath}\n`);
  console.log(`   Open in browser: file://${chartPath.replace(/\\/g, '/')}\n`);

  console.log('='.repeat(80) + '\n');
}

function generateHTMLChart(dataPoints, originalFilePath) {
  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const outputPath = path.join(reportsDir, 'token-usage-chart.html');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Token Usage Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #7f8c8d;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #4dc8bf;
        }
        .stat-label {
            color: #7f8c8d;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .stat-value {
            color: #2c3e50;
            font-size: 24px;
            font-weight: bold;
        }
        .chart-container {
            position: relative;
            height: 500px;
            margin-bottom: 30px;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .warning-title {
            font-weight: bold;
            color: #856404;
            margin-bottom: 5px;
        }
        .warning-text {
            color: #856404;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Token Usage Analysis</h1>
        <p class="subtitle">Source: ${path.basename(originalFilePath)}</p>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-label">Total Records</div>
                <div class="stat-value">${dataPoints.length.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Input Tokens</div>
                <div class="stat-value">${Math.round(dataPoints.reduce((s, d) => s + d.inputTokens, 0) / dataPoints.length).toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Output Tokens</div>
                <div class="stat-value">${Math.round(dataPoints.reduce((s, d) => s + d.outputTokens, 0) / dataPoints.length).toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Max Total Tokens</div>
                <div class="stat-value">${Math.max(...dataPoints.map(d => d.totalTokens)).toLocaleString()}</div>
            </div>
        </div>

        ${dataPoints.filter(d => d.inputTokens > 50000).length > 0 ? `
        <div class="warning">
            <div class="warning-title">⚠️ High Token Usage Detected</div>
            <div class="warning-text">
                ${dataPoints.filter(d => d.inputTokens > 50000).length} requests used >50K input tokens
                (${((dataPoints.filter(d => d.inputTokens > 50000).length / dataPoints.length) * 100).toFixed(1)}% of total)
            </div>
        </div>
        ` : ''}

        <div class="chart-container">
            <canvas id="tokenChart"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="distributionChart"></canvas>
        </div>
    </div>

    <script>
        const data = ${JSON.stringify(dataPoints.map((d, i) => ({
          x: i + 1,
          timestamp: d.timestamp.toISOString(),
          input: d.inputTokens,
          output: d.outputTokens,
          total: d.totalTokens,
          query: d.query
        })))};

        // Timeline Chart
        const ctx = document.getElementById('tokenChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.x),
                datasets: [
                    {
                        label: 'Total Tokens',
                        data: data.map(d => d.total),
                        borderColor: '#4dc8bf',
                        backgroundColor: 'rgba(77, 200, 191, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        fill: true
                    },
                    {
                        label: 'Input Tokens',
                        data: data.map(d => d.input),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        fill: false
                    },
                    {
                        label: 'Output Tokens',
                        data: data.map(d => d.output),
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Token Usage Over Time',
                        font: { size: 18 }
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const d = data[context[0].dataIndex];
                                return new Date(d.timestamp).toLocaleString();
                            },
                            afterBody: (context) => {
                                const d = data[context[0].dataIndex];
                                return ['Query: ' + d.query];
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Request Number'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Tokens'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

        // Distribution Chart
        const distCtx = document.getElementById('distributionChart').getContext('2d');

        // Group into buckets
        const buckets = {
            '0-10K': 0,
            '10-20K': 0,
            '20-30K': 0,
            '30-40K': 0,
            '40-50K': 0,
            '50-75K': 0,
            '75-100K': 0,
            '>100K': 0
        };

        data.forEach(d => {
            const total = d.total;
            if (total < 10000) buckets['0-10K']++;
            else if (total < 20000) buckets['10-20K']++;
            else if (total < 30000) buckets['20-30K']++;
            else if (total < 40000) buckets['30-40K']++;
            else if (total < 50000) buckets['40-50K']++;
            else if (total < 75000) buckets['50-75K']++;
            else if (total < 100000) buckets['75-100K']++;
            else buckets['>100K']++;
        });

        new Chart(distCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(buckets),
                datasets: [{
                    label: 'Number of Requests',
                    data: Object.values(buckets),
                    backgroundColor: '#4dc8bf',
                    borderColor: '#3a9b94',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Token Usage Distribution',
                        font: { size: 18 }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Token Range'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Requests'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  return outputPath;
}

// Run the analysis
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node analyze-token-history.js <file-path>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

analyzeTokenHistory(filePath);
