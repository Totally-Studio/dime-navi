#!/usr/bin/env node
/**
 * Token CSV Timeline Analyzer
 *
 * Parses CSV export from AI Studio and creates timeline visualization
 * Shows token usage by date from earliest to present
 */

const fs = require('fs');
const path = require('path');

async function analyzeTokenCSV(filePath) {
  console.log(`\n📊 Analyzing Token CSV: ${path.basename(filePath)}\n`);
  console.log('='.repeat(80));

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    console.log(`Found ${lines.length - 1} records (excluding header)\n`);

    const records = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      try {
        // Parse CSV line (handle quoted fields with commas)
        const match = lines[i].match(/^([^,]+),([^,]+),"(.+)","(.+)"(?:,(.*))?$/);
        if (!match) continue;

        const [, id, model, requestJson, responseJson, feedback] = match;

        const response = JSON.parse(responseJson);
        const request = JSON.parse(requestJson);

        // Extract token data from response
        if (Array.isArray(response) && response[0]?.usageMetadata) {
          const usage = response[0].usageMetadata;
          const inputTokens = usage.promptTokenCount || 0;
          const outputTokens = usage.candidatesTokenCount || 0;
          const totalTokens = usage.totalTokenCount || (inputTokens + outputTokens);

          // Extract query from request
          let query = 'N/A';
          if (request.contents?.[0]?.parts?.[0]?.text) {
            const text = request.contents[0].parts[0].text;
            const queryMatch = text.match(/USER QUERY:\s*"([^"]+)"/);
            if (queryMatch) {
              query = queryMatch[1];
            }
          }

          // Extract timestamp from response (if available) or use current time
          const timestamp = response[0].createTime
            ? new Date(response[0].createTime)
            : new Date();

          records.push({
            id,
            timestamp,
            date: timestamp.toISOString().split('T')[0], // YYYY-MM-DD
            inputTokens,
            outputTokens,
            totalTokens,
            query: query.substring(0, 60)
          });
        }
      } catch (err) {
        console.warn(`Warning: Failed to parse line ${i}`);
      }
    }

    console.log(`✅ Successfully parsed ${records.length} records\n`);

    if (records.length === 0) {
      console.log('❌ No valid token data found');
      return;
    }

    analyzeByDate(records, filePath);

  } catch (error) {
    console.error('❌ Error reading CSV:', error.message);
    process.exit(1);
  }
}

function analyzeByDate(records, originalFilePath) {
  // Sort by timestamp (earliest to latest)
  records.sort((a, b) => a.timestamp - b.timestamp);

  // Group by date
  const byDate = {};
  records.forEach(r => {
    if (!byDate[r.date]) {
      byDate[r.date] = {
        date: r.date,
        count: 0,
        totalInput: 0,
        totalOutput: 0,
        totalAll: 0,
        records: []
      };
    }
    byDate[r.date].count++;
    byDate[r.date].totalInput += r.inputTokens;
    byDate[r.date].totalOutput += r.outputTokens;
    byDate[r.date].totalAll += r.totalTokens;
    byDate[r.date].records.push(r);
  });

  const dates = Object.keys(byDate).sort();
  const dailyData = dates.map(date => byDate[date]);

  // Calculate overall statistics
  const totalRecords = records.length;
  const totalInput = records.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutput = records.reduce((sum, r) => sum + r.outputTokens, 0);
  const totalAll = records.reduce((sum, r) => sum + r.totalTokens, 0);

  const avgInput = Math.round(totalInput / totalRecords);
  const avgOutput = Math.round(totalOutput / totalRecords);
  const avgTotal = Math.round(totalAll / totalRecords);

  const maxTotal = Math.max(...records.map(r => r.totalTokens));
  const minTotal = Math.min(...records.map(r => r.totalTokens));

  // Print statistics
  console.log('📅 DATE RANGE');
  console.log('-'.repeat(80));
  console.log(`First Request:  ${dates[0]}`);
  console.log(`Last Request:   ${dates[dates.length - 1]}`);
  console.log(`Total Days:     ${dates.length}\n`);

  console.log('📈 OVERALL STATISTICS');
  console.log('-'.repeat(80));
  console.log(`Total Requests:        ${totalRecords.toLocaleString()}`);
  console.log(`Total Input Tokens:    ${totalInput.toLocaleString()}`);
  console.log(`Total Output Tokens:   ${totalOutput.toLocaleString()}`);
  console.log(`Total All Tokens:      ${totalAll.toLocaleString()}\n`);

  console.log('📊 AVERAGES');
  console.log('-'.repeat(80));
  console.log(`Avg Input Tokens:      ${avgInput.toLocaleString()}`);
  console.log(`Avg Output Tokens:     ${avgOutput.toLocaleString()}`);
  console.log(`Avg Total Tokens:      ${avgTotal.toLocaleString()}\n`);

  console.log('📏 RANGE');
  console.log('-'.repeat(80));
  console.log(`Min Total:             ${minTotal.toLocaleString()}`);
  console.log(`Max Total:             ${maxTotal.toLocaleString()}\n`);

  console.log('📅 DAILY BREAKDOWN');
  console.log('-'.repeat(80));
  dailyData.forEach(day => {
    const avgDay = Math.round(day.totalAll / day.count);
    console.log(`${day.date}: ${day.count.toString().padStart(3)} requests | Avg: ${avgDay.toLocaleString().padStart(7)} tokens | Total: ${day.totalAll.toLocaleString().padStart(9)} tokens`);
  });
  console.log();

  // High token warnings
  const highTokenRecords = records.filter(r => r.inputTokens > 50000);
  if (highTokenRecords.length > 0) {
    console.log('⚠️  HIGH TOKEN USAGE WARNINGS');
    console.log('-'.repeat(80));
    console.log(`${highTokenRecords.length} records with >50K input tokens`);
    console.log(`Percentage: ${((highTokenRecords.length / totalRecords) * 100).toFixed(1)}%\n`);
  }

  // Top 5 highest
  const sortedByTotal = [...records].sort((a, b) => b.totalTokens - a.totalTokens);
  console.log('🚨 TOP 5 HIGHEST TOKEN REQUESTS');
  console.log('-'.repeat(80));
  sortedByTotal.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. [${r.totalTokens.toLocaleString()} tokens] ${r.query}...`);
    console.log(`   Date: ${r.date} | Input: ${r.inputTokens.toLocaleString()} | Output: ${r.outputTokens.toLocaleString()}\n`);
  });

  // Generate HTML chart
  console.log('📈 Generating timeline chart...');
  const chartPath = generateTimelineChart(dailyData, records, originalFilePath);
  console.log(`✅ Chart saved to: ${chartPath}`);
  console.log(`   Open: file://${chartPath.replace(/\\/g, '/')}\n`);

  console.log('='.repeat(80) + '\n');
}

function generateTimelineChart(dailyData, records, originalFilePath) {
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const outputPath = path.join(reportsDir, 'token-timeline-chart.html');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Token Usage Timeline</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1600px;
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
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #4dc8bf;
        }
        .stat-label {
            color: #7f8c8d;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 6px;
            font-weight: 600;
        }
        .stat-value {
            color: #2c3e50;
            font-size: 22px;
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
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Token Usage Timeline</h1>
        <p class="subtitle">Source: ${path.basename(originalFilePath)} | ${dailyData.length} days | ${records.length} requests</p>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-label">Date Range</div>
                <div class="stat-value" style="font-size: 14px">${dailyData[0].date} to ${dailyData[dailyData.length - 1].date}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Requests</div>
                <div class="stat-value">${records.length.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Tokens/Request</div>
                <div class="stat-value">${Math.round(records.reduce((s, r) => s + r.totalTokens, 0) / records.length).toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Tokens</div>
                <div class="stat-value">${records.reduce((s, r) => s + r.totalTokens, 0).toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Peak Day</div>
                <div class="stat-value" style="font-size: 14px">${[...dailyData].sort((a,b) => b.totalAll - a.totalAll)[0].date}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Peak Day Tokens</div>
                <div class="stat-value">${Math.max(...dailyData.map(d => d.totalAll)).toLocaleString()}</div>
            </div>
        </div>

        ${records.filter(r => r.inputTokens > 50000).length > 0 ? `
        <div class="warning">
            <div class="warning-title">⚠️ High Token Usage Detected</div>
            <div class="warning-text">
                ${records.filter(r => r.inputTokens > 50000).length} requests used >50K input tokens
            </div>
        </div>
        ` : ''}

        <div class="chart-container">
            <canvas id="timelineChart"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="dailyBreakdownChart"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="requestCountChart"></canvas>
        </div>
    </div>

    <script>
        const dailyData = ${JSON.stringify(dailyData)};
        const records = ${JSON.stringify(records.map(r => ({
          ...r,
          timestamp: r.timestamp
        })))};

        // Timeline Chart - All Requests
        const ctx1 = document.getElementById('timelineChart').getContext('2d');
        new Chart(ctx1, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Total Tokens',
                    data: records.map(r => ({
                        x: new Date(r.timestamp),
                        y: r.totalTokens
                    })),
                    borderColor: '#4dc8bf',
                    backgroundColor: 'rgba(77, 200, 191, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Token Usage Over Time (All Requests)',
                        font: { size: 18 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const r = records[context.dataIndex];
                                return [
                                    \`Total: \${r.totalTokens.toLocaleString()}\`,
                                    \`Input: \${r.inputTokens.toLocaleString()}\`,
                                    \`Output: \${r.outputTokens.toLocaleString()}\`,
                                    \`Query: \${r.query}\`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
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

        // Daily Breakdown Chart
        const ctx2 = document.getElementById('dailyBreakdownChart').getContext('2d');
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: dailyData.map(d => d.date),
                datasets: [
                    {
                        label: 'Input Tokens',
                        data: dailyData.map(d => d.totalInput),
                        backgroundColor: '#3498db',
                        stack: 'tokens'
                    },
                    {
                        label: 'Output Tokens',
                        data: dailyData.map(d => d.totalOutput),
                        backgroundColor: '#e74c3c',
                        stack: 'tokens'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Token Usage Breakdown',
                        font: { size: 18 }
                    },
                    tooltip: {
                        callbacks: {
                            footer: (items) => {
                                const day = dailyData[items[0].dataIndex];
                                return \`\${day.count} requests | Avg: \${Math.round(day.totalAll / day.count).toLocaleString()} tokens/request\`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Tokens'
                        },
                        beginAtZero: true,
                        stacked: true
                    }
                }
            }
        });

        // Request Count Chart
        const ctx3 = document.getElementById('requestCountChart').getContext('2d');
        new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: dailyData.map(d => d.date),
                datasets: [{
                    label: 'Number of Requests',
                    data: dailyData.map(d => d.count),
                    backgroundColor: '#9b59b6',
                    borderColor: '#8e44ad',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Request Volume',
                        font: { size: 18 }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Requests'
                        },
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
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

// Run analysis
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node analyze-token-csv.cjs <csv-file-path>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

analyzeTokenCSV(filePath);
