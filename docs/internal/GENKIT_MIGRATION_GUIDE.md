# Genkit Migration Guide for DiMe Notebook

Based on official Genkit documentation: https://genkit.dev/docs/deployment/firebase/

---

## Current Status

✅ **Environment Variables**: Configured in `.env.local`
✅ **Genkit Packages**: Installed (`genkit@1.22.0`, `@genkit-ai/firebase@1.22.0`, `@genkit-ai/googleai@1.22.0`)
✅ **Firebase Project**: `dimenotesv2` configured
✅ **Genkit Config**: Created with `enableFirebaseTelemetry()`
⚠️ **Application Code**: Still using `@google/genai` directly

---

## Why Migrate to Genkit?

### Benefits You'll Get:

1. **Automatic Firebase Telemetry** ✅
   - Usage tracking
   - Performance monitoring
   - Error logging
   - User analytics

2. **Better Development Tools** 🛠️
   - Genkit Developer UI
   - Flow debugging
   - Trace visualization
   - Local testing tools

3. **Deployment Integration** 🚀
   - Easy Firebase Functions deployment
   - Automatic environment configuration
   - Built-in authentication handling

4. **Production-Ready Features** 📊
   - Request/response logging
   - Automatic retries
   - Rate limiting support
   - Caching capabilities

---

## Migration Steps

### Step 1: Update `backendService.ts`

**Current Code** (using `@google/genai`):
```typescript
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

async generate(query: string, template: Template, context: string, user: User | null, onChunk: (chunk: string) => void): Promise<void> {
  const fullPrompt = `USER QUERY: "${query}"\n\nGENERATE RESPONSE USING TEMPLATE: "${template}"`;
  const systemInstruction = `${SYSTEM_PROMPT_START}\n\n${context}\n\n${SYSTEM_PROMPT_END}`;

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: {
      systemInstruction: systemInstruction,
    },
  });

  for await (const chunk of response) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
}
```

**New Code** (using Genkit):
```typescript
import { genkit } from 'genkit';
import { googleAI, gemini25Flash } from '@genkit-ai/googleai';
import '../genkit.config'; // Import config to enable telemetry

const ai = genkit({
  plugins: [googleAI()],
});

async generate(query: string, template: Template, context: string, user: User | null, onChunk: (chunk: string) => void): Promise<void> {
  const fullPrompt = `USER QUERY: "${query}"\n\nGENERATE RESPONSE USING TEMPLATE: "${template}"`;
  const systemInstruction = `${SYSTEM_PROMPT_START}\n\n${context}\n\n${SYSTEM_PROMPT_END}`;

  const { stream } = await ai.generate({
    model: gemini25Flash,
    prompt: fullPrompt,
    system: systemInstruction,
    config: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  // Stream the response
  for await (const chunk of stream) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
}
```

---

### Step 2: Import Genkit Config in Application Entry Point

**File**: `main.tsx` or `App.tsx`

Add at the top:
```typescript
import './genkit.config'; // Initialize Genkit with Firebase telemetry
```

This ensures:
- `enableFirebaseTelemetry()` is called
- Genkit is configured before any generation happens
- Firebase project ID is set
- Telemetry is active

---

### Step 3: Update Environment Variables (Already Done ✅)

Your `.env.local` already has everything needed:
```env
VITE_GEMINI_API_KEY=AIzaSyBBx6b1eEfeSg6lNxcOmYnAUCrEEd-UsNc
VITE_FIREBASE_PROJECT_ID=dimenotesv2
```

---

### Step 4: Test Locally

Before deploying, test that everything works:

```bash
# Run development server
npm run dev

# Test features:
# - Summary generation
# - Timeline creation
# - FAQ generation
# - Streaming responses
# - Error handling
```

**Expected Behavior**:
- ✅ Streaming works exactly as before
- ✅ All quick actions function normally
- ✅ Console shows Genkit telemetry logs
- ✅ No breaking changes to UI

---

### Step 5: Build and Deploy

```bash
# Build for production
npm run build

# Deploy to Firebase
firebase deploy
```

**After Deployment**:
1. Open Firebase Console: https://console.firebase.google.com/project/dimenotesv2/overview
2. Navigate to **Analytics** or **Cloud Logging**
3. Verify telemetry data is being received

---

## Code Changes Summary

### Files to Modify:

#### 1. `services/backendService.ts`
**Changes**:
- Replace `GoogleGenAI` import with Genkit imports
- Update initialization code
- Adjust streaming API calls
- Add config import

**Lines affected**: ~10-60

#### 2. `main.tsx` (or `App.tsx`)
**Changes**:
- Add single import line: `import './genkit.config';`

**Lines affected**: 1

#### 3. `genkit.config.ts`
**Status**: ✅ Already updated with proper configuration

---

## Testing Checklist

Before considering migration complete:

- [ ] Summary generation works
- [ ] Timeline generation works
- [ ] FAQ generation works
- [ ] Comparison generation works
- [ ] Study Guide generation works
- [ ] Document generation works
- [ ] Data Extract generation works
- [ ] Streaming displays correctly
- [ ] Thinking animation shows
- [ ] Simplify button works
- [ ] Save to outputs works
- [ ] Chat history saves
- [ ] Authentication works
- [ ] No console errors

---

## Rollback Plan

If something goes wrong:

### Quick Rollback:
1. Remove `import './genkit.config';` from entry point
2. Revert `backendService.ts` to use `@google/genai`
3. Redeploy

### Keep These Files:
- `genkit.config.ts` - Safe to keep for future migration
- `.env.local` - No changes needed
- All other files remain unchanged

---

## Firebase Telemetry Features

Once Genkit with Firebase telemetry is active:

### 1. **Cloud Logging**
View at: `https://console.cloud.google.com/logs/query?project=dimenotesv2`

**What you'll see**:
- Every AI generation request
- Prompt text (sanitized)
- Response metadata
- Latency metrics
- Error traces

### 2. **Analytics Dashboard**
View at: `https://console.firebase.google.com/project/dimenotesv2/analytics`

**What you'll see**:
- User engagement patterns
- Feature usage (which templates are popular)
- Session durations
- User retention

### 3. **Performance Monitoring**
View at: `https://console.firebase.google.com/project/dimenotesv2/performance`

**What you'll see**:
- Average response times
- Percentile breakdowns (p50, p95, p99)
- Error rates
- Success rates

### 4. **Trace Explorer**
**What you'll see**:
- Individual request traces
- Breakdown of time spent in each step
- Identify bottlenecks
- Debug slow requests

---

## Advanced Configuration Options

### Enable Request/Response Logging

In `genkit.config.ts`, add:
```typescript
export default configureGenkit({
  plugins: [
    firebase({
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      telemetryConfig: {
        sampler: {
          type: 'always', // Log every request
        },
      },
    }),
    googleAI({
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug', // More detailed logs
  enableTracingAndMetrics: true,
});
```

### Add Custom Metadata to Traces

In `backendService.ts`:
```typescript
const { stream } = await ai.generate({
  model: gemini25Flash,
  prompt: fullPrompt,
  system: systemInstruction,
  metadata: {
    userId: user?.uid,
    template: template,
    sourceCount: context.split('---').length,
  },
});
```

This metadata will appear in Firebase telemetry!

---

## Cost Implications

### Current Setup (Direct API):
- Only pay for Gemini API usage
- No additional Firebase costs

### After Migration (Genkit + Telemetry):
- Still pay same Gemini API usage
- Firebase Cloud Logging: Free tier (50 GB/month)
- Firebase Analytics: Free
- Minimal additional cost unless high volume

**Expected Impact**: $0-5/month for typical usage

---

## Recommended Timeline

### Option 1: Immediate Migration (1-2 hours)
**Best if**: You want telemetry now

**Steps**:
1. Update `backendService.ts` (30 min)
2. Add config import (5 min)
3. Test locally (30 min)
4. Deploy and verify (30 min)

### Option 2: Staged Migration (Next Sprint)
**Best if**: You want to ship current version first

**Steps**:
1. Deploy current version to production
2. Monitor for stability
3. Plan Genkit migration for next release
4. Update and test in development
5. Deploy with telemetry

---

## Support Resources

- **Genkit Docs**: https://genkit.dev/docs
- **Firebase Console**: https://console.firebase.google.com/project/dimenotesv2
- **Genkit Samples**: https://github.com/firebase/genkit
- **Community**: https://github.com/firebase/genkit/discussions

---

## Questions & Answers

**Q: Will this break my current application?**
A: No, if done correctly. The API is similar and streaming works the same way.

**Q: Can I test Genkit locally without deploying?**
A: Yes! Run `npm run dev` and test all features locally first.

**Q: What if I don't want telemetry?**
A: Simply don't import `genkit.config` and continue using current implementation.

**Q: Can I migrate gradually?**
A: Yes, you could create a feature flag and test Genkit on specific routes first.

**Q: Will telemetry slow down my app?**
A: No, telemetry is asynchronous and doesn't block generation responses.

---

## Decision Matrix

|  | Current (`@google/genai`) | Migrated (Genkit) |
|---|---|---|
| **Works Now** | ✅ Yes | ⚠️ Needs migration |
| **Code Changes** | ✅ None | ⚠️ ~50 lines |
| **Telemetry** | ❌ None | ✅ Full Firebase |
| **Monitoring** | ❌ Manual | ✅ Automatic |
| **Debugging** | ⚠️ Console logs | ✅ Trace explorer |
| **Production Ready** | ✅ Yes | ✅ Yes |
| **Risk Level** | ✅ Low (stable) | ⚠️ Medium (testing needed) |

---

## My Recommendation

**For Your Situation**:

Given that:
1. ✅ Your app is working perfectly
2. ✅ You've already deployed to production
3. ✅ Genkit packages are installed
4. ✅ Config file is ready with `enableFirebaseTelemetry()`

**I recommend: Option 2 (Staged Migration)**

**Reasoning**:
- Ship what works now
- Plan thorough testing for Genkit
- Migrate during next development cycle
- Less risk, same eventual outcome

**When you're ready to migrate**, use this guide and the updated `genkit.config.ts` is already waiting for you! 🚀

---

**Last Updated**: 2025-01-XX
**Genkit Version**: 1.22.0
**Firebase Project**: dimenotesv2
**Status**: Configuration ready, migration pending
