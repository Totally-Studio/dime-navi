# Prompt Metrics Tracking

Comprehensive tracking system for monitoring AI prompt performance, cost, and quality.

## What's Tracked

### Response Times
- **Streaming Start Time**: Time from request to first chunk
- **First Chunk Latency**: Time to first token
- **Response Time**: Total completion time
- **Average Chunk Interval**: Time between chunks

### Token Usage (Actual counts from Gemini API)
- **Input Tokens**: Query + context + system instructions
- **Output Tokens**: Generated response
- **Total Tokens**: Input + Output
- **🚨 High Token Warning**: Alerts when input >50K tokens

### Response Quality
- **Word Count**: Total words in response
- **Citation Count**: Number of source citations
- **Character Length**: Total response length
- **Success Rate**: Percentage of successful completions

### Resource Selection
- **Total Resources Available**: All resources in knowledge base
- **Relevant Resources Selected**: Resources used for context
- **Query Keywords**: Extracted keywords from user query
- **Top Library Scores**: Best matching library resources
- **Top Roadmap Scores**: Best matching roadmap resources

### Context Information
- **Conversation History Length**: Number of previous exchanges
- **Roadmap Enabled**: Whether roadmap content was included
- **Selected Resource IDs**: Specific resources used

### Performance Flags
- **Was Aborted**: User stopped generation
- **Had Errors**: Request failed
- **Error Message**: Error details if failed

---

## Viewing Metrics

### 1. Firestore Console
View raw data:
```
https://console.firebase.google.com/project/dimenotesv2/firestore/data/~2Fprompt_metrics
```

### 2. Browser Console (Live)
Open DevTools (F12) while using the app to see real-time logging:

```
📊 BACKEND: Counting tokens...
📊 BACKEND: Input tokens: 12,543
📊 BACKEND: Output tokens: 1,234
📊 BACKEND: Total tokens: 13,777
✅ METRICS: Successfully logged! Document ID: abc123
```

### 3. Token Usage Report (CLI)
Run the analysis script:

```bash
# Last 7 days (default)
node scripts/check-token-usage.js

# Last 30 days
node scripts/check-token-usage.js 30

# Last 24 hours
node scripts/check-token-usage.js 1
```

**Sample Output:**
```
📊 Token Usage Report - Last 7 days
================================================================================
Period: 1/26/2026 to 2/2/2026

📈 OVERALL STATISTICS
--------------------------------------------------------------------------------
Total Requests:        1,234
Success Rate:          98.5%
Avg Response Time:     3,245ms

🎯 TOKEN USAGE
--------------------------------------------------------------------------------
Total Input Tokens:    45,123,456
Total Output Tokens:   5,234,567
Total Tokens:          50,358,023

Avg Input Tokens:      36,543
Avg Output Tokens:     4,234
Avg Total Tokens:      40,777

💰 ESTIMATED COST (Gemini 2.5 Flash)
--------------------------------------------------------------------------------
Input Cost:            $3.3843
Output Cost:           $1.5704
Total Cost:            $4.9547

🚨 TOP 5 HIGHEST TOKEN REQUESTS
--------------------------------------------------------------------------------
1. [125,456 tokens] What evidence do pharmaceutical sponsors need to...
   Input: 121,234 | Output: 4,222
   Resources: 24

⚠️  WARNING: HIGH TOKEN USAGE DETECTED
--------------------------------------------------------------------------------
12 requests used >50K input tokens
Consider optimizing context selection or limiting resource count.
```

---

## Cost Tracking

### Gemini 2.5 Flash Pricing
- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens

### Monthly Cost Estimation

If averaging **40K tokens per request**:
- 1,000 requests/month = ~$4.95
- 10,000 requests/month = ~$49.50
- 100,000 requests/month = ~$495.00

### Optimization Tips

1. **Reduce Context Size**
   - Currently selecting 24 resources per query
   - Consider reducing to 15-18 for most queries
   - Use more aggressive keyword filtering

2. **Monitor High Token Queries**
   - Check "TOP 5 HIGHEST TOKEN REQUESTS" regularly
   - Investigate queries using >50K input tokens
   - Consider query-specific resource limits

3. **Optimize Resource Content**
   - Shorten resource descriptions
   - Remove redundant information
   - Use summaries instead of full content

4. **Template-Based Limits**
   - Different templates can use different resource counts
   - Quick answers: 10-12 resources
   - Detailed responses: 18-24 resources

---

## Alerts & Warnings

### Console Warnings

**High Input Token Count (>50K)**
```
⚠️ BACKEND: HIGH INPUT TOKEN COUNT: 75,234 tokens!
⚠️ BACKEND: This may impact performance and cost.
```

**Action**: Check resource selection strategy and query complexity

---

## Firestore Security Rules

Metrics are write-only for authenticated users:

```javascript
match /prompt_metrics/{metricId} {
  allow read: if false; // Admin only - use Firebase Console
  allow write: if isAuthenticated(); // Any authenticated user
}
```

---

## Querying Metrics

### Get User's Recent Metrics
```typescript
import { promptMetricsService } from './services/promptMetricsService';

const metrics = await promptMetricsService.getUserMetrics(userId, 100);
```

### Get Aggregate Stats
```typescript
const stats = await promptMetricsService.getAggregateMetrics({
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31')
});

console.log('Total prompts:', stats.totalPrompts);
console.log('Average tokens:', stats.averageTokens);
console.log('Average response time:', stats.averageResponseTime);
console.log('Success rate:', stats.successRate);
console.log('Model usage:', stats.modelUsage);
```

---

## Next Steps

### Step 2: Firebase Performance Monitoring

Add real-time dashboards with:
- Automatic trace visualization
- Performance percentiles (p50, p90, p95)
- Alerting capabilities
- Network request monitoring

Would you like to proceed with Firebase Performance Monitoring?
