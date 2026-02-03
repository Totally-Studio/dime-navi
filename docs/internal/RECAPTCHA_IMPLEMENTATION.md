# reCAPTCHA v3 Implementation Guide for DiMe Notebook

Based on: https://developers.google.com/recaptcha/docs/v3

---

## Why Add reCAPTCHA v3?

### Current Risks Without reCAPTCHA:

1. **API Abuse** ⚠️
   - Bots could spam your Gemini API
   - Could rack up significant API costs
   - Rate limiting alone may not be enough

2. **Authentication Attacks** ⚠️
   - Automated login attempts
   - Account creation spam
   - Credential stuffing

3. **Resource Exhaustion** ⚠️
   - Firebase quota abuse
   - Firestore write spam
   - Storage consumption

### What reCAPTCHA v3 Provides:

✅ **Invisible Protection** - No user interaction required
✅ **Score-Based Detection** - 0.0 (bot) to 1.0 (human)
✅ **Action Monitoring** - Track specific user actions
✅ **Analytics Dashboard** - View bot traffic patterns
✅ **Easy Integration** - Works with Firebase

---

## Implementation Overview

### Where to Add reCAPTCHA:

1. **AI Generation Requests** (High Priority)
   - Before calling Gemini API
   - Prevent bot spam of expensive API calls
   - **Location**: `services/backendService.ts`

2. **User Authentication** (Medium Priority)
   - On Google login
   - Prevent fake account creation
   - **Location**: `App.tsx` - `handleLogin()`

3. **Save Operations** (Medium Priority)
   - Before saving outputs
   - Prevent Firestore spam
   - **Location**: `App.tsx` - `handleSaveOutput()`

4. **Chat History** (Low Priority)
   - When saving chat history
   - **Location**: `services/backendService.ts`

---

## Step-by-Step Implementation

### Step 1: Register Your Site with reCAPTCHA

1. Go to: https://www.google.com/recaptcha/admin
2. Click **"Create"** or **"+"**
3. Fill in the form:
   - **Label**: `DiMe Notebook v2`
   - **reCAPTCHA type**: Select **reCAPTCHA v3**
   - **Domains**: Add:
     - `localhost` (for development)
     - `dimenotesv2.web.app` (your production domain)
     - `dimenotesv2.firebaseapp.com` (alternate domain)
4. Click **Submit**
5. Copy both keys:
   - **Site Key** (public - goes in frontend)
   - **Secret Key** (private - goes in backend/environment)

---

### Step 2: Add Environment Variables

**File**: `.env.local`

```env
# Existing variables...
VITE_GEMINI_API_KEY=AIzaSyBBx6b1eEfeSg6lNxcOmYnAUCrEEd-UsNc
VITE_FIREBASE_API_KEY=AIzaSyBDcvYs02csueAJB2qiZYQmHMDrmqTSTWk
VITE_FIREBASE_PROJECT_ID=dimenotesv2

# Add reCAPTCHA keys
VITE_RECAPTCHA_SITE_KEY=your-site-key-here
VITE_RECAPTCHA_SECRET_KEY=your-secret-key-here
```

**Security Note**: In production, the secret key should be in Firebase Functions environment, not client-side.

---

### Step 3: Install reCAPTCHA Package

```bash
npm install react-google-recaptcha-v3
```

---

### Step 4: Add reCAPTCHA Provider to App

**File**: `main.tsx` or `App.tsx`

```typescript
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

// Wrap your app with the provider
<GoogleReCaptchaProvider
  reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
  language="en"
  useRecaptchaNet={false}
  useEnterprise={false}
  scriptProps={{
    async: true,
    defer: true,
    appendTo: 'head',
  }}
>
  <App />
</GoogleReCaptchaProvider>
```

---

### Step 5: Create reCAPTCHA Hook

**File**: `hooks/useRecaptcha.ts` (new file)

```typescript
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useCallback } from 'react';

export const useRecaptcha = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const verifyRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!executeRecaptcha) {
        console.warn('reCAPTCHA not yet available');
        return null;
      }

      try {
        const token = await executeRecaptcha(action);
        return token;
      } catch (error) {
        console.error('reCAPTCHA error:', error);
        return null;
      }
    },
    [executeRecaptcha]
  );

  return { verifyRecaptcha };
};
```

---

### Step 6: Update Backend Service to Verify Token

**File**: `services/backendService.ts`

```typescript
class BackendService {
  // Add new method to verify reCAPTCHA token
  private async _verifyRecaptcha(token: string, action: string): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${import.meta.env.VITE_RECAPTCHA_SECRET_KEY}&response=${token}`,
      });

      const data = await response.json();

      // Check if verification was successful and score is acceptable
      if (data.success && data.score >= 0.5 && data.action === action) {
        console.log(`reCAPTCHA verified: score ${data.score} for action ${action}`);
        return true;
      }

      console.warn(`reCAPTCHA failed: score ${data.score}, expected action ${action}, got ${data.action}`);
      return false;
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return false; // Fail closed for security
    }
  }

  // Update generate method to accept and verify reCAPTCHA token
  async generate(
    query: string,
    template: Template,
    context: string,
    user: User | null,
    recaptchaToken: string | null,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    console.log("BACKEND: Received generate stream request.");
    this._authenticate(user);

    // Verify reCAPTCHA token
    if (!recaptchaToken) {
      throw new Error("reCAPTCHA token is required");
    }

    const isHuman = await this._verifyRecaptcha(recaptchaToken, 'generate');
    if (!isHuman) {
      throw new Error("reCAPTCHA verification failed. Please try again.");
    }

    // Continue with existing generation logic...
    try {
      const fullPrompt = `USER QUERY: "${query}"\n\nGENERATE RESPONSE USING TEMPLATE: "${template}"`;
      const systemInstruction = `${SYSTEM_PROMPT_START}\n\n${context}\n\n${SYSTEM_PROMPT_END}`;

      // ... rest of existing code
    } catch (error) {
      // ... existing error handling
    }
  }
}
```

---

### Step 7: Update App.tsx to Use reCAPTCHA

**File**: `App.tsx`

```typescript
import { useRecaptcha } from './hooks/useRecaptcha';

const App: React.FC = () => {
  // Existing state...
  const { verifyRecaptcha } = useRecaptcha();

  const performGeneration = useCallback(async (
    currentQuery: string,
    currentTemplate: Template,
    isELI5: boolean = false
  ) => {
    if (isLoading) return;
    if (!user) {
      setError("Please login to generate a response.");
      return;
    }

    // Get reCAPTCHA token before generation
    const recaptchaToken = await verifyRecaptcha('generate');
    if (!recaptchaToken) {
      setError("Security verification failed. Please try again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    // ... rest of existing code

    try {
      console.log('APP: Starting generateContent with reCAPTCHA...');
      await generateContent(
        queryWithInstructions,
        currentTemplate,
        fullContext,
        recaptchaToken, // Pass token to backend
        (chunk) => {
          // ... existing chunk handling
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, resources, selectedResources, user, conversationHistory, verifyRecaptcha]);

  // Update handleLogin to use reCAPTCHA
  const handleLogin = async () => {
    const recaptchaToken = await verifyRecaptcha('login');
    if (!recaptchaToken) {
      setError("Security verification failed. Please try again.");
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
      setError("Failed to sign in. Please try again.");
    }
  };

  // ... rest of component
};
```

---

### Step 8: Update API Client

**File**: `services/apiClient.ts`

```typescript
export const generateContent = async (
  query: string,
  template: Template,
  context: string,
  recaptchaToken: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  console.log("API CLIENT: Sending generate stream request with reCAPTCHA...");
  const user = getCurrentUser();

  return backendService.generate(query, template, context, user, recaptchaToken, onChunk);
};
```

---

## Score Thresholds

reCAPTCHA v3 returns a score from 0.0 to 1.0:

| Score Range | Interpretation | Recommended Action |
|-------------|----------------|-------------------|
| **0.9 - 1.0** | Very likely human | ✅ Allow |
| **0.7 - 0.9** | Likely human | ✅ Allow |
| **0.5 - 0.7** | Uncertain | ⚠️ Allow with monitoring |
| **0.3 - 0.5** | Likely bot | ⚠️ Challenge or block |
| **0.0 - 0.3** | Very likely bot | ❌ Block |

### Recommended Thresholds for DiMe Notebook:

- **AI Generation**: `>= 0.5` (balance security and UX)
- **Login**: `>= 0.3` (more lenient for legitimate users)
- **Save Operations**: `>= 0.5`

---

## Testing reCAPTCHA

### Development Testing:

1. **Use localhost**: reCAPTCHA works on localhost
2. **Check Console**: See scores in browser console
3. **Test Actions**: Try different actions (login, generate, save)
4. **View Dashboard**: https://www.google.com/recaptcha/admin

### Production Testing:

1. **Deploy to Firebase**
2. **Monitor Dashboard** for bot traffic
3. **Adjust Thresholds** based on false positives
4. **Review Analytics** weekly

---

## Security Best Practices

### ✅ Do:

1. **Keep Secret Key Private**
   - Never commit to Git
   - Use Firebase Functions environment variables in production
   - Rotate keys if exposed

2. **Verify on Backend**
   - Always validate tokens server-side
   - Don't trust client-side validation alone

3. **Monitor Scores**
   - Check dashboard regularly
   - Adjust thresholds based on data
   - Look for patterns in bot behavior

4. **Use Different Actions**
   - `login`, `generate`, `save`, etc.
   - Helps identify which features are targeted
   - Better analytics

### ❌ Don't:

1. **Don't Block Too Aggressively**
   - Start with lenient thresholds (0.5)
   - Adjust based on actual bot traffic
   - False positives hurt UX

2. **Don't Expose Secret Key**
   - Never in client-side code
   - Never in Git repository
   - Use environment variables

3. **Don't Skip Backend Verification**
   - Client-side alone is not secure
   - Bots can bypass client checks
   - Always verify server-side

---

## Cost Implications

### reCAPTCHA v3 Pricing:

- **First 1 million assessments/month**: Free
- **Above 1 million**: $1 per 1,000 assessments

### Your Expected Usage:

Assuming 1,000 users/month with 10 AI generations each:
- **Assessments**: 10,000/month
- **Cost**: $0 (well within free tier)

**Verdict**: Free for your current scale ✅

---

## Implementation Timeline

### Quick Implementation (2-3 hours):

1. ✅ Register site (15 min)
2. ✅ Add environment variables (5 min)
3. ✅ Install package (5 min)
4. ✅ Add provider to app (10 min)
5. ✅ Create hook (15 min)
6. ✅ Update backend service (45 min)
7. ✅ Update App.tsx (45 min)
8. ✅ Test thoroughly (45 min)
9. ✅ Deploy and monitor (15 min)

### Staged Implementation:

**Phase 1** (Priority: High - AI Generation):
- Add reCAPTCHA to `performGeneration()`
- Protect expensive Gemini API calls
- **Time**: 1 hour

**Phase 2** (Priority: Medium - Authentication):
- Add to login flow
- Prevent fake accounts
- **Time**: 30 minutes

**Phase 3** (Priority: Low - Save Operations):
- Add to save functions
- Prevent Firestore spam
- **Time**: 30 minutes

---

## Monitoring and Analytics

### reCAPTCHA Dashboard:

View at: https://www.google.com/recaptcha/admin

**Metrics to Watch**:
- ✅ Request volume over time
- ✅ Score distribution
- ✅ Action breakdown
- ✅ Bot traffic patterns
- ✅ Geographic distribution

### Firebase Analytics:

Track reCAPTCHA events:
```typescript
import { logEvent } from 'firebase/analytics';

// Log when reCAPTCHA passes
logEvent(analytics, 'recaptcha_verified', {
  action: 'generate',
  score: data.score,
});

// Log when reCAPTCHA fails
logEvent(analytics, 'recaptcha_failed', {
  action: 'generate',
  score: data.score,
});
```

---

## Alternative: Firebase App Check

### Consider Firebase App Check Instead?

Firebase App Check is an alternative that integrates directly with Firebase services.

**Comparison**:

| Feature | reCAPTCHA v3 | Firebase App Check |
|---------|--------------|-------------------|
| **Setup** | Manual | Automatic with Firebase |
| **Integration** | Custom code | Built-in |
| **Verification** | Score-based | Token-based |
| **Cost** | Free tier generous | Free |
| **Flexibility** | High (custom thresholds) | Medium |
| **Best For** | General web apps | Firebase-centric apps |

**Recommendation**: reCAPTCHA v3 for more control, Firebase App Check for easier setup.

---

## Rollback Plan

If reCAPTCHA causes issues:

1. **Make reCAPTCHA optional initially**:
   ```typescript
   const recaptchaToken = await verifyRecaptcha('generate');
   // Continue even if null during testing phase
   ```

2. **Add feature flag**:
   ```typescript
   const RECAPTCHA_ENABLED = import.meta.env.VITE_RECAPTCHA_ENABLED === 'true';
   ```

3. **Remove provider wrapper** to disable completely

4. **Monitor false positive rate** and adjust thresholds

---

## Next Steps

Would you like me to:

**Option A**: Implement reCAPTCHA v3 now (full implementation)
**Option B**: Create a basic setup first (just for AI generation)
**Option C**: Document for future implementation (keep current setup)
**Option D**: Explore Firebase App Check instead

---

**Documentation**: https://developers.google.com/recaptcha/docs/v3
**Dashboard**: https://www.google.com/recaptcha/admin
**Status**: Ready to implement
