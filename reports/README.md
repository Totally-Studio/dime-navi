# Token Usage Reports

This folder contains generated reports from token usage analysis.

## Files

- `token-usage-chart.html` - Interactive visualization of token usage over time

## Viewing Reports

### Option 1: Open in Browser
Double-click `token-usage-chart.html` or right-click → Open with → Browser

### Option 2: VSCode Live Server
1. Install "Live Server" extension in VSCode
2. Right-click `token-usage-chart.html`
3. Select "Open with Live Server"

### Option 3: Direct File URL
```
file:///Z:/Application%20Prototypes/dimenotes/reports/token-usage-chart.html
```

## Regenerating Reports

Run the analysis script:
```bash
node scripts/analyze-token-history.cjs <path-to-jsonl-file>
```

Reports are automatically saved to this folder.
