#!/usr/bin/env node
/**
 * Create Timeline Chart from AI Studio Export
 *
 * Generates a time-based visualization showing token usage evolution.
 * Assumes records are in chronological order based on token trend analysis.
 */

const fs = require('fs');
const path = require('path');

const jsonlPath = path.join(__dirname, '../../docs/tokens 2_datasets_iDKBaZfkGv3XxN8P872OuQ8_2026-02-02T23_27_25.339Z.jsonl');
const outputPath = path.join(__dirname, '../reports/token-usage-timeline.html');

function parseRecords() {
  console.log('\n📊 Parsing AI Studio Export...\n');

  const content = fs.readFileSync(jsonlPath, 'utf-8');
  const lines = content.trim().split('\n');

  const records = [];

  lines.forEach((line, index) => {
    try {
      const record = JSON.parse(line);

      let inputTokens = 0;
      let outputTokens = 0;
      let totalTokens = 0;
      let query = 'Query ' + (index + 1);

      // Extract query from request
      if (Array.isArray(record.request) && record.request[0]?.contents?.[0]?.parts?.[0]?.text) {
        query = record.request[0].contents[0].parts[0].text.substring(0, 60);
      }

      // Extract tokens from response
      if (Array.isArray(record.response) && record.response[0]?.usageMetadata) {
        const usage = record.response[0].usageMetadata;
        inputTokens = usage.promptTokenCount || 0;
        outputTokens = usage.candidatesTokenCount || 0;
        const thinkingTokens = usage.thoughtsTokenCount || 0;
        totalTokens = usage.totalTokenCount || (inputTokens + outputTokens + thinkingTokens);
      }

      records.push({
        index: index + 1,
        query,
        inputTokens,
        outputTokens,
        totalTokens
      });
    } catch (error) {
      console.warn(`⚠️  Failed to parse record ${index + 1}`);
    }
  });

  console.log(`✅ Parsed ${records.length} records\n`);
  return records;
}

function generateTimeline(records) {
  // Estimate time distribution
  // Based on analysis: records go from early (high tokens) to recent (low tokens)
  // Let's assume this spans several weeks/months

  const estimatedDaysSpan = 60; // Assume 60 days of data
  const endDate = new Date('2026-02-02'); // Export date
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - estimatedDaysSpan);

  // Distribute records evenly over time period
  const msPerRecord = (endDate - startDate) / records.length;

  const timeline = records.map((record, i) => {
    const timestamp = new Date(startDate.getTime() + (msPerRecord * i));
    return {
      ...record,
      timestamp: timestamp.toISOString(),
      dateLabel: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  return { timeline, estimatedDaysSpan };
}

function generateHTML(timeline, estimatedDaysSpan) {
  const labels = timeline.map(r => r.dateLabel);
  const inputData = timeline.map(r => r.inputTokens);
  const outputData = timeline.map(r => r.outputTokens);
  const totalData = timeline.map(r => r.totalTokens);

  // Calculate prompts per day
  const promptsPerDay = {};
  timeline.forEach(r => {
    const date = r.dateLabel;
    promptsPerDay[date] = (promptsPerDay[date] || 0) + 1;
  });

  // Create volume data array matching the timeline
  const volumeData = labels.map(label => promptsPerDay[label] || 0);

  // Calculate statistics
  const totalInput = inputData.reduce((sum, val) => sum + val, 0);
  const totalOutput = outputData.reduce((sum, val) => sum + val, 0);
  const totalTokens = totalInput + totalOutput;

  const avgInput = Math.round(totalInput / timeline.length);
  const avgOutput = Math.round(totalOutput / timeline.length);
  const avgTotal = Math.round(totalTokens / timeline.length);

  const maxTotal = Math.max(...totalData);
  const minTotal = Math.min(...totalData.filter(t => t > 0));

  const maxVolume = Math.max(...volumeData);
  const avgVolume = (Object.values(promptsPerDay).reduce((a, b) => a + b, 0) / Object.keys(promptsPerDay).length).toFixed(1);

  // Find optimization milestones (periods of significant reduction)
  const movingAvgWindow = 10;
  const milestones = [];

  for (let i = movingAvgWindow; i < timeline.length; i += movingAvgWindow) {
    const prevAvg = totalData.slice(i - movingAvgWindow, i).reduce((a, b) => a + b, 0) / movingAvgWindow;
    const currentAvg = totalData.slice(i, i + movingAvgWindow).reduce((a, b) => a + b, 0) / movingAvgWindow;
    const reduction = prevAvg - currentAvg;

    if (reduction > 5000) {
      milestones.push({
        date: timeline[i].dateLabel,
        reduction: Math.round(reduction),
        prevAvg: Math.round(prevAvg),
        currentAvg: Math.round(currentAvg)
      });
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Token Usage Timeline - DiMeNotes NaVi</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      color: white;
    }

    .header h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .header p {
      font-size: 1rem;
      opacity: 0.9;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      padding: 2rem;
      background: #f8f9fa;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stat-label {
      font-size: 0.875rem;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #212529;
    }

    .stat-subtitle {
      font-size: 0.875rem;
      color: #6c757d;
      margin-top: 0.25rem;
    }

    .chart-section {
      padding: 2rem;
    }

    .chart-container {
      position: relative;
      height: 500px;
      margin-bottom: 3rem;
    }

    .milestones {
      padding: 0 2rem 2rem 2rem;
    }

    .milestones h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #212529;
    }

    .milestone-card {
      background: #e7f3ff;
      border-left: 4px solid #0066cc;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 4px;
    }

    .milestone-date {
      font-weight: 700;
      color: #0066cc;
      margin-bottom: 0.25rem;
    }

    .milestone-text {
      color: #495057;
    }

    .note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 1rem;
      margin: 2rem;
      border-radius: 4px;
      color: #856404;
    }

    .footer {
      padding: 1.5rem 2rem;
      background: #f8f9fa;
      text-align: center;
      color: #6c757d;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Token Usage Timeline</h1>
      <p>DiMeNotes NaVi - Historical Analysis (${timeline.length} requests)</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Tokens</div>
        <div class="stat-value">${totalTokens.toLocaleString()}</div>
        <div class="stat-subtitle">Across all requests</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Average Input</div>
        <div class="stat-value">${avgInput.toLocaleString()}</div>
        <div class="stat-subtitle">Tokens per request</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Peak Usage</div>
        <div class="stat-value">${maxTotal.toLocaleString()}</div>
        <div class="stat-subtitle">Highest single request</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Optimized Low</div>
        <div class="stat-value">${minTotal.toLocaleString()}</div>
        <div class="stat-subtitle">After optimization</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Peak Volume</div>
        <div class="stat-value">${maxVolume}</div>
        <div class="stat-subtitle">Prompts per day (max)</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Avg Daily Volume</div>
        <div class="stat-value">${avgVolume}</div>
        <div class="stat-subtitle">Prompts per day</div>
      </div>
    </div>

    <div class="note">
      <strong>📅 Timeline Note:</strong> Actual request timestamps are not available in the AI Studio export.
      This timeline assumes the ${timeline.length} records are in chronological order (earliest to most recent)
      and distributes them evenly over an estimated ${estimatedDaysSpan}-day period ending on the export date.
    </div>

    <div class="chart-section">
      <h2 style="margin-bottom: 1.5rem; color: #212529;">Token Usage Over Time</h2>
      <div class="chart-container">
        <canvas id="timelineChart"></canvas>
      </div>
    </div>

    ${milestones.length > 0 ? `
    <div class="milestones">
      <h2>🎯 Optimization Milestones</h2>
      ${milestones.map(m => `
        <div class="milestone-card">
          <div class="milestone-date">${m.date}</div>
          <div class="milestone-text">
            Reduced average token usage by <strong>${m.reduction.toLocaleString()}</strong> tokens
            (from ${m.prevAvg.toLocaleString()} to ${m.currentAvg.toLocaleString()})
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      Generated ${new Date().toLocaleString()} | DiMeNotes NaVi Token Analysis
    </div>
  </div>

  <script>
    const ctx = document.getElementById('timelineChart').getContext('2d');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [
          {
            label: 'Volume (Prompts/Day)',
            type: 'bar',
            data: ${JSON.stringify(volumeData)},
            backgroundColor: 'rgba(52, 211, 153, 0.3)',
            borderColor: 'rgba(52, 211, 153, 0.8)',
            borderWidth: 1,
            yAxisID: 'y1',
            order: 2
          },
          {
            label: 'Total Tokens',
            data: ${JSON.stringify(totalData)},
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            yAxisID: 'y',
            order: 1
          },
          {
            label: 'Input Tokens',
            data: ${JSON.stringify(inputData)},
            borderColor: '#f093fb',
            backgroundColor: 'rgba(240, 147, 251, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            yAxisID: 'y',
            order: 1
          },
          {
            label: 'Output Tokens',
            data: ${JSON.stringify(outputData)},
            borderColor: '#4facfe',
            backgroundColor: 'rgba(79, 172, 254, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            yAxisID: 'y',
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 13,
                weight: '600'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' tokens';
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date (Estimated)',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 20
            },
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Tokens',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y1: {
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Prompts per Day',
              font: {
                size: 14,
                weight: 'bold'
              },
              color: 'rgba(52, 211, 153, 1)'
            },
            ticks: {
              callback: function(value) {
                return value;
              },
              color: 'rgba(52, 211, 153, 1)'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  </script>
</body>
</html>`;

  return html;
}

function main() {
  console.log('🚀 Creating Token Usage Timeline...\n');

  // Parse records
  const records = parseRecords();

  // Generate timeline
  console.log('📅 Generating timeline distribution...\n');
  const { timeline, estimatedDaysSpan } = generateTimeline(records);

  // Generate HTML
  console.log('🎨 Creating visualization...\n');
  const html = generateHTML(timeline, estimatedDaysSpan);

  // Save output
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log('✅ Timeline chart created successfully!');
  console.log(`📁 Location: ${outputPath}\n`);
  console.log('💡 Open in browser to view the interactive timeline.\n');
}

main();
